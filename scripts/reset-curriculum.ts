import 'dotenv/config';
import { db } from '../src/shared/db';
import { curriculumModule } from '../src/features/curriculum/schema';

async function reset() {
  console.log('🗑️  Deleting existing modules...');
  
  await db.delete(curriculumModule);
  
  console.log('✅ Done\n');
  process.exit(0);
}

reset().catch(err => {
  console.error(err);
  process.exit(1);
});
