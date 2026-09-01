#!/usr/bin/env node
/**
 * Extract PDF content and populate lecture.content field
 * This enables both RAG and flashcard generation
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { db } from '../src/shared/db';
import { lecture } from '../src/features/curriculum/schema';
import { eq } from 'drizzle-orm';
import pdfParse from 'pdf-parse';

const CONTENT_ROOT = process.env.CONTENT_ROOT || 'C:/work/projects';
const MAX_CONTENT_LENGTH = 8000; // Match RAG chunker expectation

async function extractAndPopulate() {
  console.log('📄 PDF Content Extraction and Population\n');
  console.log(`CONTENT_ROOT: ${CONTENT_ROOT}\n`);

  // Get all lectures that have a PDF but no content
  const lecturesNeedingContent = await db
    .select({
      id: lecture.id,
      title: lecture.title,
      pdfFile: lecture.pdfFile,
      pdfPageStart: lecture.pdfPageStart,
      pdfPageEnd: lecture.pdfPageEnd,
      contentLength: lecture.content,
    })
    .from(lecture)
    .where(lecture.pdfFile !== null);

  console.log(`Found ${lecturesNeedingContent.length} lectures with PDFs\n`);

  let processed = 0;
  let populated = 0;
  let errors = 0;

  for (const lec of lecturesNeedingContent) {
    try {
      // Skip if already has content
      if (lec.contentLength && lec.contentLength.trim().length > 100) {
        console.log(`⏭️  ${lec.title}: already has content`);
        continue;
      }

      if (!lec.pdfFile) {
        console.log(`⏭️  ${lec.title}: no PDF file`);
        continue;
      }

      const pdfPath = path.join(CONTENT_ROOT, lec.pdfFile);

      if (!fs.existsSync(pdfPath)) {
        console.log(`❌ ${lec.title}: PDF not found at ${pdfPath}`);
        errors++;
        continue;
      }

      console.log(`📖 ${lec.title}...`);

      // Read PDF
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(pdfBuffer);

      // Extract text only from specified page range
      let extractedText = '';
      if (lec.pdfPageStart && lec.pdfPageEnd) {
        // Page range specified: extract only those pages
        const startPage = Math.max(1, lec.pdfPageStart) - 1; // Convert to 0-based
        const endPage = Math.min(pdfData.numpages, lec.pdfPageEnd);

        console.log(`   Pages ${lec.pdfPageStart}–${lec.pdfPageEnd}`);

        for (let pageNum = startPage; pageNum < endPage; pageNum++) {
          if (pdfData.version >= '2.0.550' && pdfData.getPage) {
            const page = await pdfData.getPage(pageNum + 1);
            extractedText += (await page.getTextContent()).items
              .map((item: any) => item.str || '')
              .join(' ');
          }
        }
      } else {
        // No page range: use all text
        extractedText = pdfData.text || '';
      }

      // Truncate and clean
      extractedText = extractedText
        .replace(/\x00/g, '') // Remove null bytes
        .trim()
        .slice(0, MAX_CONTENT_LENGTH);

      if (extractedText.length > 100) {
        // Update database
        await db
          .update(lecture)
          .set({ content: extractedText })
          .where(eq(lecture.id, lec.id));

        populated++;
        console.log(`   ✅ Populated (${extractedText.length} chars)\n`);
      } else {
        console.log(`   ⚠️  Extracted text too short (${extractedText.length} chars)\n`);
      }
      processed++;
    } catch (err) {
      errors++;
      console.log(`   ❌ Error: ${err}\n`);
    }
  }

  console.log('====================================');
  console.log(`\n📊 SUMMARY:\n`);
  console.log(`✅ Processed: ${processed}`);
  console.log(`✅ Populated: ${populated}`);
  console.log(`❌ Errors: ${errors}\n`);
}

extractAndPopulate().catch((err) => {
  console.error(err);
  process.exit(1);
});
