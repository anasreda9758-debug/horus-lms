import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/shared/db";
import { question, questionBank, questionOption } from "../src/features/practice/schema";

const BANK_SLUG = "ahe-anatomy";
const BANK_TITLE = "تشريح — اختبار وحدة AEH";
const FREE_MODULE_SLUG = "ahe-101";

const PREMIUM_BANK_SLUG = "resp-anatomy";
const PREMIUM_BANK_TITLE = "الجهاز التنفسي — اختبار وحدة RS";
const PREMIUM_MODULE_SLUG = "rs-201";

type SeedQuestion = {
  prompt: string;
  explanation: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
};

const questions: SeedQuestion[] = [
  {
    prompt: "المستوى الذي يقسم الجسم إلى نصفين أمامي وخلفي يُسمى:",
    explanation: "المستوى الإكليلي (الأمامي) يفصل الجزء الأمامي عن الخلفي للجسم.",
    options: ["المستوى السهمي الناصف", "المستوى الإكليلي (الأمامي)", "المستوى المستعرض", "المستوى المائل"],
    answer: 1,
  },
  {
    prompt: "المستوى الذي يقسم الجسم إلى نصفين أيمن وأيسر متساويين يُسمى:",
    explanation: "المستوى السهمي الناصف (Median) يقسم الجسم إلى نصفين أيمن وأيسر متساويين.",
    options: ["المستوى السهمي الناصف", "المستوى المستعرض", "المستوى الإكليلي", "المستوى الأفقي"],
    answer: 0,
  },
  {
    prompt: "المستوى المستعرض (Transverse) يقسم الجسم إلى:",
    explanation: "المستوى المستعرض يقسم الجسم إلى جزء علوي (سفلي) وجزء سفلي (علوي) أي رأسًا مع القدمين.",
    options: ["علوي وسفلي", "أمامي وخلفي", "أيمن وأيسر", "قريب وبعيد"],
    answer: 0,
  },
  {
    prompt: "في الوضع التشريحي القياسي، راحتا اليدين تتجهان:",
    explanation: "في الوضع التشريحي القياسي يقف الشخص منتصبًا ووجهه للأمام وراحتاه للأمام.",
    options: ["للأمام", "للخلف", "للجانبين", "للأسفل"],
    answer: 0,
  },
  {
    prompt: "مصطلح «علوي (Superior)» يشير إلى اتجاه:",
    explanation: "العلوي (Superior/Cranial) يعني نحو الرأس، بينما السفلي (Inferior/Caudal) نحو القدمين.",
    options: ["نحو الرأس", "نحو القدمين", "نحو خط الوسط", "بعيدًا عن خط الوسط"],
    answer: 0,
  },
  {
    prompt: "مرادف «أمامي (Anterior)» هو:",
    explanation: "الأمامي (Ventral) يعني سطحًا أو اتجاهًا نحو الجزء الأمامي من الجسم.",
    options: ["بطني (Ventral)", "ظهري (Dorsal)", "إنسي (Medial)", "وحشي (Lateral)"],
    answer: 0,
  },
  {
    prompt: "مرادف «خلفي (Posterior)» هو:",
    explanation: "الخلفي (Dorsal) يعني سطحًا أو اتجاهًا نحو ظهر الجسم.",
    options: ["ظهري (Dorsal)", "بطني (Ventral)", "قحفي (Cranial)", "ذنبي (Caudal)"],
    answer: 0,
  },
  {
    prompt: "عظم أقرب إلى خط الوسط يُوصف بأنه:",
    explanation: "الإنسي (Medial) يعني أقرب إلى خط الوسط، والوحشي (Lateral) أبعد عنه.",
    options: ["إنسي (Medial)", "وحشي (Lateral)", "قريب (Proximal)", "بعيد (Distal)"],
    answer: 0,
  },
  {
    prompt: "في الطرف العلوي، «القريب (Proximal)» يعني:",
    explanation: "القريب يعني الأقرب إلى جذر الطرف (جذع الجسم)، والبعيد أبعد عنه.",
    options: ["الأقرب إلى جذر الطرف", "الأبعد عن جذر الطرف", "نحو الرأس دائمًا", "نحو القدمين دائمًا"],
    answer: 0,
  },
  {
    prompt: "الوجه السفلي (الأرضي) للقدم يُسمى:",
    explanation: "السطح الأخمصي (Plantar) هو قاع القدم، والراحي (Palmar) لراحة اليد.",
    options: ["أخمصي (Plantar)", "راحي (Palmar)", "ظهري (Dorsal)", "بطني (Ventral)"],
    answer: 0,
  },
  {
    prompt: "عظمة الفخذ تنتمي إلى:",
    explanation: "الفخذ عظمة طويلة من عظام الطرف السفلي، والعضد من الطرف العلوي.",
    options: ["الطرف السفلي", "الطرف العلوي", "الجمجمة", "العمود الفقري"],
    answer: 0,
  },
  {
    prompt: "عدد عظام الجمجمة عند البالغ:",
    explanation: "الجمجمة تتكون من 22 عظمة: 8 عظام قحفية و14 عظمة وجهية (بدون عظيمات السمع).",
    options: ["22 عظمة", "8 عظام", "26 عظمة", "33 عظمة"],
    answer: 0,
  },
  {
    prompt: "عدد الفقرات العنقية:",
    explanation: "العمود الفقري: 7 عنقية، 12 صدرية، 5 قطنية، ثم العجز والعصعص.",
    options: ["7 فقرات", "12 فقرة", "5 فقرات", "26 فقرة"],
    answer: 0,
  },
  {
    prompt: "الأضلاع التي تتصل بعظم القص عبر غضروف أضلاع أخرى تُسمى:",
    explanation: "الأضلاع الكاذبة (7–10) ترتبط بالقص عبر الغضروف الضلعي المشترك مع أضلاع أعلى منها.",
    options: ["أضلاع كاذبة", "أضلاع حقيقية", "أضلاع عائمة", "أضلاع عنقية"],
    answer: 0,
  },
  {
    prompt: "العضلة التي تزيد الزاوية عند المفصل (تمد الطرف) هي:",
    explanation: "الباسطة (Extensor) تمدّ الطرف وتزيد الزاوية، بينما المثنية (Flexor) تقلّلها.",
    options: ["الباسطة (Extensor)", "المثنية (Flexor)", "المديرة الداخلية", "المبعدة (Abductor)"],
    answer: 0,
  },
  {
    prompt: "العضلات الهيكلية تُوصف بأنها:",
    explanation: "العضلات الهيكلية إرادية ومخططة، بينما العضلات الملساء لا إرادية وغير مخططة.",
    options: ["إرادية ومخططة", "لا إرادية ومخططة", "إرادية وملساء", "لا إرادية وملساء"],
    answer: 0,
  },
  {
    prompt: "القلب يقع داخل:",
    explanation: "القلب داخل المنصف (Mediastinum) في منتصف التجويف الصدري بين الرئتين.",
    options: ["المنصف (Mediastinum)", "التجويف الجنبي", "التجويف البطني", "الحوض"],
    answer: 0,
  },
  {
    prompt: "الأوعية الدموية التي تنقل الدم بعيدًا عن القلب:",
    explanation: "الشرايين تنقل الدم من القلب إلى الأنسجة، والأوردة تعيده إلى القلب.",
    options: ["الشرايين", "الأوردة", "الشعيرات الدموية", "الأوعية اللمفاوية"],
    answer: 0,
  },
  {
    prompt: "الدورة الدموية الصغرى (الرئوية) تنقل الدم:",
    explanation: "الدورة الصغرى تنتقل من البطين الأيمن عبر الشريان الرئوي إلى الرئتين لتبادل الغازات.",
    options: ["من القلب إلى الرئتين", "من القلب إلى باقي الجسم", "من الرئتين إلى القلب فقط", "من الكبد إلى القلب"],
    answer: 0,
  },
  {
    prompt: "الصمام بين الأذين الأيسر والبطين الأيسر:",
    explanation: "الصمام التاجي (الرتئي/ثنائي الشرفات) يسمح بمرور الدم من الأذين الأيسر إلى البطين الأيسر.",
    options: ["الصمام التاجي", "الصمام الأبهري", "الصمام ثلاثي الشرفات", "الصمام الرئوي"],
    answer: 0,
  },
];

const premiumQuestions: SeedQuestion[] = [
  {
    prompt: "التبادل الغازي في الرئتين يحدث في:",
    explanation: "التبادل الغازي يحدث عبر الحويصلات الهوائية (Alveoli) التي تحيطها شبكة شعرية كثيفة.",
    options: ["الحويصلات الهوائية", "القصبة الهوائية", "البلعوم", "الأنف"],
    answer: 0,
  },
  {
    prompt: "الجزء المشترك بين الجهاز التنفسي والجهاز الهضمي هو:",
    explanation: "البلعوم (Pharynx) يمر عبره كل من الهواء والطعام.",
    options: ["البلعوم", "الحنجرة", "الرغامى", "المريء"],
    answer: 0,
  },
  {
    prompt: "عدد فصوص الرئة اليمنى عند البالغ:",
    explanation: "الرئة اليمنى لها ثلاثة فصوص، واليسرى فصان بسبب وجود القلب.",
    options: ["3 فصوص", "فصان", "4 فصوص", "فص واحد"],
    answer: 0,
  },
  {
    prompt: "العضلة الرئيسية للتنفس في حالة الراحة:",
    explanation: "الحجاب الحاجز (Diaphragm) هو العضلة الأساسية للتنفس الهادئ.",
    options: ["الحجاب الحاجز", "العضلات الوربية", "العضلة القصية الترقوية الحلمية", "عضلات البطن"],
    answer: 0,
  },
  {
    prompt: "الضغط داخل التجويف الجنبي مقارنةً بالضغط الجوي:",
    explanation: "الضغط الجنبي سالب (أقل من الجوي) وهو ما يبقي الرئة منتصبةً على جدار الصدر.",
    options: ["أقل من الضغط الجوي", "أعلى من الضغط الجوي", "مساوٍ للضغط الجوي", "يتغير دون قاعدة"],
    answer: 0,
  },
  {
    prompt: "الغضروف الذي يغلق مدخل الحنجرة أثناء البلع:",
    explanation: "لسان المزمار (Epiglottis) يمنع دخول الطعام إلى مجرى الهواء أثناء البلع.",
    options: ["لسان المزمار", "الغضروف الدرقي", "الغضروف الحلقي", "الغضاريف الهرمية"],
    answer: 0,
  },
];

async function seedBank(opts: {
  moduleSlug: string;
  bankSlug: string;
  bankTitle: string;
  questions: SeedQuestion[];
}) {
  const mod = await db.query.curriculumModule.findFirst({
    where: (m, { eq }) => eq(m.slug, opts.moduleSlug),
  });
  if (!mod) {
    console.error(`[seed-quiz] module '${opts.moduleSlug}' not found — run db:seed:curriculum first`);
    return false;
  }

  const existing = await db.query.questionBank.findFirst({
    where: (b, { eq }) => eq(b.slug, opts.bankSlug),
  });
  if (existing) {
    console.log(`[seed-quiz] bank '${opts.bankSlug}' already present — skipping`);
    return true;
  }

  const bankId = randomUUID();
  await db.insert(questionBank).values({
    id: bankId,
    moduleId: mod.id,
    slug: opts.bankSlug,
    title: opts.bankTitle,
  });

  for (const [qi, q] of opts.questions.entries()) {
    const questionId = randomUUID();
    await db.insert(question).values({
      id: questionId,
      bankId,
      prompt: q.prompt,
      explanation: q.explanation,
      order: qi + 1,
    });
    for (const [oi, text] of q.options.entries()) {
      await db.insert(questionOption).values({
        id: randomUUID(),
        questionId,
        text,
        isCorrect: oi === q.answer,
        order: oi + 1,
      });
    }
  }

  console.log(`[seed-quiz] done — bank '${opts.bankSlug}' with ${opts.questions.length} questions`);
  return true;
}

async function main() {
  const okFree = await seedBank({
    moduleSlug: FREE_MODULE_SLUG,
    bankSlug: BANK_SLUG,
    bankTitle: BANK_TITLE,
    questions,
  });
  if (!okFree) process.exit(1);

  const okPremium = await seedBank({
    moduleSlug: PREMIUM_MODULE_SLUG,
    bankSlug: PREMIUM_BANK_SLUG,
    bankTitle: PREMIUM_BANK_TITLE,
    questions: premiumQuestions,
  });
  if (!okPremium) process.exit(1);

  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-quiz] error:", err);
  process.exit(1);
});
