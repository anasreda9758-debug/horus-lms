#!/usr/bin/env node
/**
 * READ-ONLY DATABASE AUDIT
 * Verify current curriculum state without any modifications
 */

import 'dotenv/config';
import { db } from '../src/shared/db';
import { 
  university, faculty, academicYear, semester
} from '../src/features/hierarchy/schema';
import { 
  curriculumModule, lecture 
} from '../src/features/curriculum/schema';

async function auditDatabase() {
  console.log('📊 READ-ONLY DATABASE AUDIT');
  console.log('=' .repeat(60) + '\n');

  try {
    // Count entities
    const univCount = await db.select().from(university);
    const facCount = await db.select().from(faculty);
    const yearCount = await db.select().from(academicYear);
    const semCount = await db.select().from(semester);
    const modCount = await db.select().from(curriculumModule);
    const lecCount = await db.select().from(lecture);

    console.log('📈 ENTITY COUNTS:\n');
    console.log(`  Universities: ${univCount.length}`);
    console.log(`  Faculties: ${facCount.length}`);
    console.log(`  Academic Years: ${yearCount.length}`);
    console.log(`  Semesters: ${semCount.length}`);
    console.log(`  Modules: ${modCount.length}`);
    console.log(`  Lectures: ${lecCount.length}`);

    // Analyze modules
    console.log('\n📚 MODULES:\n');
    modCount.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} (slug: ${m.slug})`);
    });

    // Lectures per module
    console.log('\n📖 LECTURES PER MODULE:\n');
    for (const m of modCount) {
      const modLecs = lecCount.filter(l => l.moduleId === m.id);
      console.log(`  ${m.name}: ${modLecs.length} lectures`);
      modLecs.slice(0, 3).forEach(l => {
        console.log(`    - ${l.title}`);
      });
      if (modLecs.length > 3) {
        console.log(`    ... and ${modLecs.length - 3} more`);
      }
    }

    // Check for PDF mappings
    console.log('\n🔗 PDF MAPPINGS:\n');
    const withPdf = lecCount.filter(l => l.pdfFile);
    const withPageRanges = lecCount.filter(l => l.pdfPageStart && l.pdfPageEnd);
    const withContent = lecCount.filter(l => l.content && l.content.trim().length > 100);

    console.log(`  Lectures with pdfFile: ${withPdf.length}`);
    console.log(`  Lectures with page ranges: ${withPageRanges.length}`);
    console.log(`  Lectures with content (>100 chars): ${withContent.length}`);

    // Identify test vs real content
    console.log('\n🧪 CONTENT TYPE ANALYSIS:\n');
    let testContentCount = 0;
    let realPdfCount = 0;

    for (const l of lecCount) {
      if (l.content && l.content.includes('التشريح العام')) {
        testContentCount++;
      }
      if (l.pdfFile && l.pdfPageStart) {
        realPdfCount++;
      }
    }

    console.log(`  Test/Sample content lectures: ${testContentCount}`);
    console.log(`  Real PDF-mapped lectures: ${realPdfCount}`);

    // Check for the original 248 lectures
    const likelyOriginal = lecCount.filter(l => 
      !l.content?.includes('التشريح العام') || l.content === null || l.content.trim().length === 0
    );

    console.log(`  Lectures without sample content: ${likelyOriginal.length}`);

    // Detailed status
    console.log('\n✅ VERIFICATION RESULTS:\n');
    
    if (modCount.length === 2 && lecCount.length === 6) {
      console.log('  ⚠️  DATABASE CONTAINS ONLY TEST DATA');
      console.log('     - 2 test modules');
      console.log('     - 6 test lectures');
      console.log('     - Original 7 modules / 248 lectures NOT found');
    } else if (modCount.length === 7 && lecCount.length === 248) {
      console.log('  ✅ ORIGINAL CURRICULUM INTACT');
      console.log('     - 7 original modules present');
      console.log('     - 248 original lectures present');
      console.log('     - Test data NOT found');
    } else if (modCount.length === 7 + 2) {
      console.log('  ⚠️  MIXED STATE DETECTED');
      console.log('     - Original 7 modules exist');
      console.log('     - Test modules also added');
      console.log('     - Both sets present in database');
    } else {
      console.log(`  ❓ UNEXPECTED STATE`);
      console.log(`     - ${modCount.length} modules (expected 7 or 2)`);
      console.log(`     - ${lecCount.length} lectures (expected 248 or 6)`);
    }

    // Git history check
    console.log('\n📝 CHECKING GIT HISTORY...\n');
    console.log('  Commands to verify commit 8d2e84c:');
    console.log('    git log --oneline | head -5');
    console.log('    git show 8d2e84c --name-status');
    console.log('    git diff 8d2e84c~1..8d2e84c -- scripts/reset-curriculum.ts');

  } catch (error) {
    console.error('❌ ERROR:', error);
  }

  process.exit(0);
}

auditDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
