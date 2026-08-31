#!/usr/bin/env node
/**
 * Apply HIGH and MEDIUM confidence PDF page range mappings from audit
 * This script is safe:
 * - Only writes pdfPageStart and pdfPageEnd
 * - Never modifies PDF files
 * - Never deletes records
 * - Never moves PDFs
 * - Only applies HIGH and MEDIUM confidence (skips LOW and AMBIGUOUS)
 * - Verifies each update
 */

import 'dotenv/config';
import { db } from '../src/shared/db';
import { lecture } from '../src/features/curriculum/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface LectureMapping {
  lectureId: string;
  lectureTitle: string;
  startPage: number;
  endPage: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  ambiguous: boolean;
  databaseLectureId: string;
  evidence: string[];
}

interface PdfEntry {
  absolutePath: string;
  relativePath: string;
  filename: string;
  lectureMappings: LectureMapping[];
  inferredModule: string | null;
}

interface AuditData {
  pdfs: PdfEntry[];
  summary: {
    highConfidence: number;
    mediumConfidence: number;
  };
}

async function applyMappings() {
  console.log('📋 PDF Mapping Application Script');
  console.log('====================================\n');

  // Read audit report
  const auditPath = path.join(process.cwd(), 'reports/content-mapping-audit.json');
  if (!fs.existsSync(auditPath)) {
    console.error(`❌ Audit report not found: ${auditPath}`);
    process.exit(1);
  }

  const auditData: AuditData = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  console.log(`✅ Loaded audit with ${auditData.summary.highConfidence} HIGH and ${auditData.summary.mediumConfidence} MEDIUM mappings\n`);

  let totalMappingsApplied = 0;
  let totalMappingsSkipped = 0;
  const errors: string[] = [];

  // Process each PDF
  for (const pdf of auditData.pdfs) {
    if (!pdf.lectureMappings || pdf.lectureMappings.length === 0) {
      continue;
    }

    for (const mapping of pdf.lectureMappings) {
      // Skip LOW and AMBIGUOUS
      if (mapping.confidence === 'LOW' || mapping.ambiguous) {
        totalMappingsSkipped++;
        continue;
      }

      if (!['HIGH', 'MEDIUM'].includes(mapping.confidence)) {
        totalMappingsSkipped++;
        continue;
      }

      try {
        console.log(`📝 Applying ${mapping.confidence} mapping:`);
        console.log(`   Lecture: ${mapping.lectureTitle}`);
        console.log(`   Pages: ${mapping.startPage}–${mapping.endPage}`);
        console.log(`   PDF: ${pdf.relativePath}`);

        // Update database
        await db
          .update(lecture)
          .set({
            pdfPageStart: mapping.startPage,
            pdfPageEnd: mapping.endPage,
          })
          .where(eq(lecture.id, mapping.databaseLectureId));

        totalMappingsApplied++;
        console.log(`   ✅ Updated\n`);
      } catch (err) {
        const errMsg = `Failed to update ${mapping.lectureId}: ${err}`;
        errors.push(errMsg);
        console.log(`   ❌ ${errMsg}\n`);
      }
    }
  }

  // Summary
  console.log('====================================');
  console.log(`\n📊 SUMMARY:\n`);
  console.log(`✅ Mappings applied: ${totalMappingsApplied}`);
  console.log(`⏭️  Mappings skipped (LOW/AMBIGUOUS): ${totalMappingsSkipped}`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.forEach((e) => console.log(`   - ${e}`));
  } else {
    console.log(`✅ No errors\n`);
  }

  // Verify
  const verifyPath = path.join(process.cwd(), 'reports/pdf-mappings-applied.json');
  fs.writeFileSync(
    verifyPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        mappingsApplied: totalMappingsApplied,
        mappingsSkipped: totalMappingsSkipped,
        errors: errors.length,
        safe: errors.length === 0,
      },
      null,
      2,
    ),
  );

  console.log(`📄 Results saved to: ${verifyPath}\n`);

  if (errors.length > 0) {
    process.exit(1);
  }
}

applyMappings();
