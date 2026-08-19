/**
 * Seed OSPE answer keys extracted from PDF files.
 * Run with: npx tsx scripts/seed-ospe-keys.ts
 */
import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const sql = postgres("postgres://postgres:lms_dev@localhost:5432/lms", { max: 5 });

// ── Answer keys extracted from OSPE PDFs ──────────────────────────

const ANSWER_KEYS: Record<string, { diagnosis: string; identification?: string }[]> = {
  CVS: [
    { diagnosis: "Circumflex artery", identification: "Branch of left coronary artery wrapping around the heart" },
    { diagnosis: "Left atrium", identification: "Posterior chamber of the heart receiving pulmonary veins" },
    { diagnosis: "Coronary sinus", identification: "Main venous drainage of the heart on posterior surface" },
    { diagnosis: "Superior vena cava", identification: "Large vein returning blood from upper body to right atrium" },
    { diagnosis: "Great cardiac vein", identification: "Runs in anterior interventricular groove" },
    { diagnosis: "Middle cardiac vein", identification: "Runs in posterior interventricular groove" },
    { diagnosis: "Small cardiac vein", identification: "Runs along right margin of heart" },
    { diagnosis: "Pulmonary artery", identification: "Carries deoxygenated blood from right ventricle to lungs" },
    { diagnosis: "Right atrium", identification: "Chamber receiving systemic venous return" },
    { diagnosis: "Descending thoracic aorta", identification: "Continuation of aortic arch in thorax" },
    { diagnosis: "Ascending aorta", identification: "First part of aorta arising from left ventricle" },
    { diagnosis: "Anterior interventricular groove", identification: "Groove on anterior surface separating ventricles" },
    { diagnosis: "Inferior surface of heart", identification: "Diaphragmatic surface resting on diaphragm" },
    { diagnosis: "Phrenic nerve", identification: "Nerve running along pericardium to diaphragm" },
    { diagnosis: "Pericardio-phrenic vessels", identification: "Accompany phrenic nerve on pericardium" },
    { diagnosis: "Coronary sulcus", identification: "Groove separating atria from ventricles" },
    { diagnosis: "Pulmonary trunk", identification: "Vessel arising from right ventricle bifurcating into pulmonary arteries" },
    { diagnosis: "Mitral valve", identification: "Bicuspid valve between left atrium and left ventricle" },
    { diagnosis: "Aortic valve", identification: "Semilunar valve between left ventricle and aorta" },
    { diagnosis: "Tricuspid valve", identification: "Valve between right atrium and right ventricle" },
    { diagnosis: "Pulmonary valve", identification: "Semilunar valve between right ventricle and pulmonary trunk" },
    { diagnosis: "Right ventricle", identification: "Chamber pumping blood to lungs" },
    { diagnosis: "Left ventricle", identification: "Chamber pumping blood to systemic circulation" },
    { diagnosis: "Left coronary artery", identification: "Arises from aorta, gives anterior interventricular and circumflex branches" },
    { diagnosis: "Right coronary artery", identification: "Arises from aorta, supplies right side of heart" },
    { diagnosis: "Anterior interventricular artery (LAD)", identification: "Branch of left coronary artery in anterior interventricular groove" },
    { diagnosis: "Right pulmonary veins", identification: "Return oxygenated blood from right lung to left atrium" },
    { diagnosis: "Left pulmonary veins", identification: "Return oxygenated blood from left lung to left atrium" },
    { diagnosis: "Inferior vena cava", identification: "Large vein returning blood from lower body to right atrium" },
    { diagnosis: "Aortic arch", identification: "Curved part of aorta between ascending and descending portions" },
    { diagnosis: "Brachiocephalic trunk", identification: "First branch of aortic arch" },
    { diagnosis: "Left common carotid artery", identification: "Second branch of aortic arch" },
    { diagnosis: "Left subclavian artery", identification: "Third branch of aortic arch" },
    { diagnosis: "Apex of heart", identification: "Tip of left ventricle pointing left and inferiorly" },
    { diagnosis: "Base of heart", identification: "Posterior surface mainly formed by left atrium" },
    { diagnosis: "Right pulmonary artery", identification: "Artery carrying blood to right lung" },
    { diagnosis: "Left pulmonary artery", identification: "Artery carrying blood to left lung" },
    { diagnosis: "Pericardium", identification: "Fibrous sac surrounding the heart" },
    { diagnosis: "Parietal pericardium", identification: "Outer layer of serous pericardium lining fibrous pericardium" },
    { diagnosis: "Visceral pericardium (epicardium)", identification: "Inner layer covering heart surface" },
    { diagnosis: "Right pulmonary artery", identification: "Crosses behind ascending aorta and SVC" },
    { diagnosis: "Left atrium (posterior)", identification: "Forms most of the base of the heart" },
    { diagnosis: "Diaphragmatic surface", identification: "Inferior surface resting on central tendon of diaphragm" },
    { diagnosis: "Sternocostal surface", identification: "Anterior surface behind sternum and costal cartilages" },
    { diagnosis: "Right border", identification: "Formed by right atrium" },
    { diagnosis: "Left border", identification: "Formed by left ventricle and left auricle" },
    { diagnosis: "Inferior border", identification: "Formed mainly by right ventricle" },
    { diagnosis: "Posterior interventricular artery", identification: "Branch of right coronary artery in posterior interventricular groove" },
    { diagnosis: "Marginal artery", identification: "Branch of right coronary artery along right inferior border" },
    { diagnosis: "Obtuse marginal artery", identification: "Branch of circumflex artery along left margin" },
    { diagnosis: "Sinoatrial node", identification: "Pacemaker located at junction of SVC and right atrium" },
    { diagnosis: "Atrioventricular node", identification: "Located in interatrial septum near coronary sinus opening" },
    { diagnosis: "Chordae tendineae", identification: "Tendinous cords connecting papillary muscles to AV valve cusps" },
    { diagnosis: "Papillary muscles", identification: "Muscles in ventricles anchoring chordae tendineae" },
    { diagnosis: "Trabeculae carneae", identification: "Muscular ridges on inner ventricular walls" },
    { diagnosis: "Moderator band", identification: "Muscular band in right ventricle carrying part of conduction system" },
    { diagnosis: "Fossa ovalis", identification: "Remnant of foramen ovale in interatrial septum" },
    { diagnosis: "Ligamentum arteriosum", identification: "Remnant of ductus arteriosus connecting pulmonary trunk to aortic arch" },
    { diagnosis: "Left atrium appendage", identification: "Small ear-like projection of left atrium" },
    { diagnosis: "Right atrium (internal)", identification: "Receives SVC, IVC, and coronary sinus" },
    { diagnosis: "Crista terminalis", identification: "Vertical ridge on inner right atrium" },
    { diagnosis: "Pectinate muscles", identification: "Muscular ridges on anterior right atrial wall" },
    { diagnosis: "Interventricular septum", identification: "Wall separating left and right ventricles" },
  ],
  IBL: [
    { diagnosis: "Thymus gland", identification: "B lymphocyte maturation organ in mediastinum" },
    { diagnosis: "Palatine tonsil", identification: "Lymphoid tissue at junction of oral and pharyngeal cavities" },
    { diagnosis: "Pharyngeal tonsil", identification: "Lymphoid tissue in nasopharynx (adenoid)" },
    { diagnosis: "Lingual tonsil", identification: "Lymphoid tissue at base of tongue" },
    { diagnosis: "Spleen", identification: "Largest lymphoid organ in left hypochondrium" },
  ],
  "RENAL": [
    { diagnosis: "Renal fascia", identification: "Connective tissue enclosing kidney and adrenal gland" },
    { diagnosis: "Perinephric fat", identification: "Fat surrounding kidney within renal fascia" },
    { diagnosis: "Paranephric fat", identification: "Fat outside renal fascia" },
    { diagnosis: "Psoas major", identification: "Muscle on posterior abdominal wall medial to kidney" },
    { diagnosis: "Quadratus lumborum", identification: "Muscle on posterior abdominal wall lateral to psoas" },
    { diagnosis: "Inferior vena cava", identification: "Large vein on right side of abdominal aorta" },
    { diagnosis: "Kidney", identification: "Bean-shaped organ producing urine" },
    { diagnosis: "Transversalis fascia", identification: "Fascial layer lining abdominal cavity" },
    { diagnosis: "Peritoneum", identification: "Serous membrane lining abdominal cavity" },
    { diagnosis: "Anterolateral abdominal wall", identification: "Muscular wall of abdomen" },
    { diagnosis: "Superior suprarenal artery", identification: "Artery supplying upper part of adrenal gland" },
    { diagnosis: "Middle suprarenal artery", identification: "Artery supplying middle part of adrenal gland" },
    { diagnosis: "Inferior suprarenal artery", identification: "Artery supplying lower part of adrenal gland" },
    { diagnosis: "Left suprarenal gland", identification: "Endocrine gland superior to left kidney" },
    { diagnosis: "Trigone of bladder", identification: "Triangular area on internal bladder wall between ureteric orifices and internal urethral orifice" },
    { diagnosis: "Base of urinary bladder", identification: "Posterior surface of bladder" },
    { diagnosis: "Apex of urinary bladder", identification: "Anterior-inferior tip connected to median umbilical ligament" },
    { diagnosis: "Inferolateral surfaces", identification: "Surfaces of bladder related to pelvic floor" },
    { diagnosis: "Superior surface", identification: "Dome of bladder covered by peritoneum" },
    { diagnosis: "Median umbilical ligament", identification: "Remnant of urachus from apex to umbilicus" },
    { diagnosis: "Ureter", identification: "Muscular tube carrying urine from kidney to bladder" },
    { diagnosis: "Adrenal gland", identification: "Endocrine gland on superior pole of kidney" },
    { diagnosis: "Renal artery", identification: "Branch of abdominal aorta supplying kidney" },
    { diagnosis: "Renal vein", identification: "Vein draining kidney into inferior vena cava" },
  ],
};

const FOLDER_TO_MODULE: Record<string, string> = {
  CVS: "cvs-202",
  IBL: "ibl-204",
  RENAL: "rau-203",
  "module 1": "ahe-101",
  "module 2": "ppg-102",
  "module 3": "pmb-103",
  RESP: "rs-201",
};

async function main() {
  const imagesRoot = "C:/work/projects/images";

  console.log("[seed-ospe] Seeding OSPE answer keys...");

  let totalKeys = 0;
  let totalRubrics = 0;

  for (const [folder, answers] of Object.entries(ANSWER_KEYS)) {
    const dir = join(imagesRoot, folder);
    let files: string[] = [];
    try {
      const entries = await readdir(dir);
      files = entries.filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f)).sort();
    } catch {
      console.log(`  [skip] Folder not found: ${folder}`);
      continue;
    }

    console.log(`  [${folder}] ${files.length} images, ${answers.length} answer keys`);

    // Distribute answers across images (cycle if more images than answers)
    for (let i = 0; i < files.length; i++) {
      const answer = answers[i % answers.length];
      const keyId = randomUUID();

      await sql`
        INSERT INTO ospe_answer_key (id, folder, file_name, diagnosis, identification)
        VALUES (${keyId}, ${folder}, ${files[i]}, ${answer.diagnosis}, ${answer.identification ?? null})
        ON CONFLICT DO NOTHING
      `;
      totalKeys++;

      // Add rubric items
      const rubrics = [
        { criterion: `Correct identification: ${answer.diagnosis}`, maxPoints: 3 },
        { criterion: `Describes structure location and function`, maxPoints: 2 },
        { criterion: `Mentions clinical significance`, maxPoints: 1 },
      ];

      for (let j = 0; j < rubrics.length; j++) {
        await sql`
          INSERT INTO ospe_rubric (id, answer_key_id, criterion, max_points, "order")
          VALUES (${randomUUID()}, ${keyId}, ${rubrics[j].criterion}, ${rubrics[j].maxPoints}, ${j})
          ON CONFLICT DO NOTHING
        `;
        totalRubrics++;
      }
    }
  }

  console.log(`[seed-ospe] Done! ${totalKeys} answer keys, ${totalRubrics} rubric items`);
  await sql.end();
}

main().catch((e) => {
  console.error("[seed-ospe] FAILED:", e);
  process.exit(1);
});
