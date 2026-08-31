import 'dotenv/config';
import { db } from '../src/shared/db';
import { lecture } from '../src/features/curriculum/schema';
import { eq } from 'drizzle-orm';

async function populateContent() {
  const content = `
# التشريح العام
## المصطلحات الأساسية

الاتجاهات التشريحية هي كلمات موحدة تستخدم لوصف موقع الهياكل المختلفة في الجسم.

### الاتجاهات الأساسية
- **أمامي (Anterior)**: نحو الأمام
- **خلفي (Posterior)**: نحو الخلف  
- **أنسي (Medial)**: نحو الخط المركزي للجسم
- **وحشي (Lateral)**: بعيداً عن الخط المركزي
- **علوي/رأسي (Superior)**: نحو الرأس
- **سفلي/ذيلي (Inferior)**: نحو الأسفل

### المستويات
- **المستوى السهمي**: يقسم الجسم إلى يمين ويسار
- **المستوى الإكليلي**: يقسم الجسم إلى أمام وخلف
- **المستوى الأفقي**: يقسم الجسم إلى فوق وتحت

## الهيكل العظمي
الهيكل العظمي يتكون من حوالي 206 عظمة في البالغين ويقسم إلى جزءين رئيسيين.

### المحور العظمي
يتضمن العمود الفقري والقفص الصدري وعظام الحوض.

### الهيكل الطرفي  
يتضمن عظام الأطراف العلوية والسفلية.
  `;

  // Update first 6 lectures with test content
  const lectureIds = [
    '1', // placeholder - will be actual IDs
    '2',
    '3',
    '4',
    '5',
    '6',
  ];

  const lectures = await db.select().from(lecture).limit(6);

  for (const lec of lectures) {
    await db
      .update(lecture)
      .set({ content })
      .where(eq(lecture.id, lec.id));
    console.log(`✅ Populated: ${lec.title}`);
  }

  console.log(`\n✅ Done - ${lectures.length} lectures updated`);
  process.exit(0);
}

populateContent().catch(err => {
  console.error(err);
  process.exit(1);
});
