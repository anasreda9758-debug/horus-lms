import 'dotenv/config';
import { db } from '../src/shared/db';
import { curriculumModule, subject } from '../src/features/curriculum/schema';
import { ilike } from 'drizzle-orm';

async function findArabicMaterials() {
  console.log('🔍 Searching for Arabic/garbled materials...\n');

  // Search for modules with Arabic text or problematic patterns
  const modules = await db
    .select({
      id: curriculumModule.id,
      name: curriculumModule.name,
      slug: curriculumModule.slug,
      description: curriculumModule.description,
      term: curriculumModule.term,
    })
    .from(curriculumModule);

  console.log(`📊 Found ${modules.length} modules total\n`);

  // Look for modules with:
  // 1. "المواد" (Arabic for "materials")
  // 2. Non-ASCII characters indicating encoding issues
  // 3. "(3)" pattern
  const problematic = modules.filter((m) => {
    const nameBytes = Buffer.from(m.name, 'utf8');
    const hasArabic = /[\u0600-\u06FF]/.test(m.name);
    const hasNumeral3 = m.name.includes('(3)') || m.name.includes('3)');
    const hasGarbled =
      /[^\x00-\x7F]/.test(m.name) &&
      !hasArabic; // Non-ASCII but not proper Arabic
    return hasArabic || hasNumeral3 || hasGarbled;
  });

  if (problematic.length > 0) {
    console.log('⚠️  Problematic modules found:\n');
    problematic.forEach((m) => {
      console.log(`ID: ${m.id}`);
      console.log(`Name: ${m.name}`);
      console.log(`Slug: ${m.slug}`);
      console.log(`Term: ${m.term}`);
      console.log('---');
    });
  } else {
    console.log('✅ No problematic modules found\n');
  }

  // Also check subject table for similar issues
  const subjects = await db.select().from(subject);
  const problematicSubjects = subjects.filter((s) => {
    const hasArabic = /[\u0600-\u06FF]/.test(s.name);
    const hasNumeral3 = s.name.includes('(3)') || s.name.includes('3)');
    return hasArabic || hasNumeral3;
  });

  if (problematicSubjects.length > 0) {
    console.log('⚠️  Problematic subjects found:\n');
    problematicSubjects.forEach((s) => {
      console.log(`ID: ${s.id}`);
      console.log(`Name: ${s.name}`);
      console.log('---');
    });
  }
}

findArabicMaterials().catch(console.error);
