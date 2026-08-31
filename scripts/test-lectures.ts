import 'dotenv/config';
import { db } from '../src/shared/db';
import { curriculumModule, lecture } from '../src/features/curriculum/schema';

async function checkData() {
  const modules = await db.select({ id: curriculumModule.id, name: curriculumModule.name }).from(curriculumModule);
  const lecs = await db.select({ id: lecture.id, title: lecture.title }).from(lecture);
  
  console.log(`Modules: ${modules.length}`);
  modules.forEach(m => console.log(`  - ${m.name}`));
  
  console.log(`\nLectures: ${lecs.length}`);
  lecs.slice(0, 5).forEach(l => console.log(`  - ${l.title}`));
  
  process.exit(0);
}

checkData().catch(err => {
  console.error(err);
  process.exit(1);
});
