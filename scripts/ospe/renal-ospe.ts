import type { SeedQuestion } from "../seed-mcq-all";

/**
 * OSPE RENAL Question Bank — 30 clinical MCQs
 * Style: "Identify the structure", "Name the pathology", "What is the diagnosis?"
 */

function img(file: string): string {
  return `/api/content/ospe/image?folder=RENAL&file=${encodeURIComponent(file)}`;
}

export const questions: SeedQuestion[] = [
  // ─────────────────────────────────────────────────────────
  //  ANATOMY — Identify the structure (12 questions)
  // ─────────────────────────────────────────────────────────
  {
    prompt: "Identify this region of the kidney: the outer portion containing glomeruli.",
    imageUrl: img("renal-anatomy-001-cortex.jpg"),
    options: ["Renal cortex", "Renal medulla", "Renal pelvis", "Renal capsule"],
    answer: 0,
    explanation: "The renal cortex contains glomeruli, proximal and distal convoluted tubules, and cortical collecting ducts.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this region of the kidney: the inner portion containing medullary pyramids.",
    imageUrl: img("renal-anatomy-002-medulla.jpg"),
    options: ["Renal medulla", "Renal cortex", "Renal pelvis", "Hilum"],
    answer: 0,
    explanation: "The renal medulla contains the loops of Henle, collecting ducts, and vasa recta arranged in medullary pyramids.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this cup-shaped structure that receives urine from a renal papilla.",
    imageUrl: img("renal-anatomy-003-minor-calyx.jpg"),
    options: ["Minor calyx", "Major calyx", "Renal pelvis", "Ureter"],
    answer: 0,
    explanation: "Minor calyces receive urine from individual renal papillae; they merge to form major calyces, then the renal pelvis.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this funnel-shaped structure that collects urine from the major calyces.",
    imageUrl: img("renal-anatomy-004-renal-pelvis.jpg"),
    options: ["Renal pelvis", "Minor calyx", "Major calyx", "Urinary bladder"],
    answer: 0,
    explanation: "The renal pelvis collects urine from 2-3 major calyces and channels it into the ureter.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this structure: a microscopic filtration unit of the kidney.",
    imageUrl: img("renal-anatomy-005-nephron.jpg"),
    options: ["Nephron", "Renal corpuscle", "Collecting duct", "Loop of Henle"],
    answer: 0,
    explanation: "The nephron is the functional unit of the kidney, consisting of a renal corpuscle and renal tubule.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this part of the nephron: a spherical structure containing a glomerulus.",
    imageUrl: img("renal-anatomy-006-renalc-corpuscule.jpg"),
    options: ["Renal corpuscle (Bowman's capsule + glomerulus)", "Proximal tubule", "Distal tubule", "Collecting duct"],
    answer: 0,
    explanation: "The renal corpuscle consists of the glomerular capillary tuft enclosed by Bowman's capsule.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this nephron segment: the first part of the renal tubule after Bowman's capsule.",
    imageUrl: img("renal-anatomy-007-proximal-tubule.jpg"),
    options: ["Proximal convoluted tubule (PCT)", "Distal convoluted tubule", "Loop of Henle", "Collecting duct"],
    answer: 0,
    explanation: "The PCT is lined by brush-bordered cuboidal cells and reabsorbs ~65% of filtered water and solutes.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this nephron segment: located in the medulla, forming a U-shaped loop.",
    imageUrl: img("renal-anatomy-008-loop-of-henle.jpg"),
    options: ["Loop of Henle", "Proximal tubule", "Distal tubule", "Collecting duct"],
    answer: 0,
    explanation: "The loop of Henle establishes the medullary osmotic gradient essential for urine concentration.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this nephron segment: the final segment before the collecting duct.",
    imageUrl: img("renal-anatomy-009-distal-tubule.jpg"),
    options: ["Distal convoluted tubule (DCT)", "Proximal convoluted tubule", "Loop of Henle", "Collecting duct"],
    answer: 0,
    explanation: "The DCT is the site of fine-tuning of calcium, sodium, and potassium under hormonal control (PTH, aldosterone).",
    difficulty: "medium",
  },
  {
    prompt: "Identify this vessel: the arterial branch supplying a single glomerulus.",
    imageUrl: img("renal-anatomy-010-afferent-arteriole.jpg"),
    options: ["Afferent arteriole", "Efferent arteriole", "Interlobular artery", "Arcuate artery"],
    answer: 0,
    explanation: "The afferent arteriole brings blood to the glomerulus; its diameter regulates glomerular blood pressure.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this vessel: carries blood away from the glomerulus.",
    imageUrl: img("renal-anatomy-011-efferent-arteriole.jpg"),
    options: ["Efferent arteriole", "Afferent arteriole", "Glomerular capillary", "Peritubular capillary"],
    answer: 0,
    explanation: "The efferent arteriole is narrower than the afferent, maintaining glomerular filtration pressure.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this structure: a specialized region of the distal tubule adjacent to the afferent arteriole.",
    imageUrl: img("renal-anatomy-012-juxtaglomerular-apparatus.jpg"),
    options: ["Juxtaglomerular apparatus (JGA)", "Macula densa", "Juxtaglomerular cells", "All of the above"],
    answer: 3,
    explanation: "The JGA includes macula densa cells (from DCT), juxtaglomerular cells (modified smooth muscle), and extraglomerular mesangial cells.",
    difficulty: "hard",
  },

  // ─────────────────────────────────────────────────────────
  //  HISTOLOGY (5 questions)
  // ─────────────────────────────────────────────────────────
  {
    prompt: "Identify this structure: a tuft of capillaries within Bowman's capsule.",
    imageUrl: img("renal-histo-001-glomerulus.jpg"),
    options: ["Glomerulus", "Bowman's capsule", "Mesangial cells", "Podocytes"],
    answer: 0,
    explanation: "The glomerulus is a capillary tuft fenestrated for filtration, supported by mesangial cells.",
    difficulty: "easy",
  },
  {
    prompt: "Identify these cells: visceral epithelial cells covering the glomerular capillaries.",
    imageUrl: img("renal-histo-002-podocytes.jpg"),
    options: ["Podocytes (visceral epithelial cells)", "Endothelial cells", "Mesangial cells", "Macula densa cells"],
    answer: 0,
    explanation: "Podocytes have foot processes (pedicels) that form filtration slits with their neighboring cells.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this layer: the specialized endothelium of glomerular capillaries.",
    imageUrl: img("renal-histo-003-fenestrated-endothelium.jpg"),
    options: ["Fenestrated endothelium", "Simple squamous epithelium", "Transitional epithelium", "Stratified squamous epithelium"],
    answer: 0,
    explanation: "Glomerular capillaries have fenestrated endothelium (70-100nm pores) allowing plasma filtration.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this renal structure: a thick-walled artery branching into afferent arterioles.",
    imageUrl: img("renal-histo-004-interlobular-artery.jpg"),
    options: ["Interlobular (cortical radial) artery", "Arcuate artery", "Afferent arteriole", "Efferent arteriole"],
    answer: 0,
    explanation: "Interlobular arteries branch from arcuate arteries and give off afferent arterioles to glomeruli.",
    difficulty: "hard",
  },
  {
    prompt: "Identify this cell type: large cells with prominent nucleoli lining the proximal tubule.",
    imageUrl: img("renal-histo-005-pct-cells.jpg"),
    options: ["Proximal tubular cells (brush border)", "Distal tubular cells", "Collecting duct cells", "Podocytes"],
    answer: 0,
    explanation: "PCT cells have a prominent brush border (microvilli) for reabsorption, appearing eosinophilic due to abundant mitochondria.",
    difficulty: "medium",
  },

  // ─────────────────────────────────────────────────────────
  //  PATHOLOGY (13 questions)
  // ─────────────────────────────────────────────────────────
  {
    prompt: "Identify this glomerular pathology: diffuse proliferation of mesangial cells.",
    imageUrl: img("renal-patho-001-mesangial-proliferative-gn.jpg"),
    options: [
      "Mesangial proliferative glomerulonephritis",
      "Membranous nephropathy",
      "Minimal change disease",
      "Focal segmental glomerulosclerosis",
    ],
    answer: 0,
    explanation: "Mesangial proliferative GN shows increased mesangial cells and matrix, often IgA nephropathy.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this glomerular pathology: diffuse thickening of the glomerular basement membrane.",
    imageUrl: img("renal-patho-002-membranous-nephropathy.jpg"),
    options: [
      "Membranous nephropathy",
      "Minimal change disease",
      "Focal segmental glomerulosclerosis",
      "Diabetic nephropathy",
    ],
    answer: 0,
    explanation: "Membranous nephropathy shows GBM thickening with subepithelial deposits (spike and dome on EM).",
    difficulty: "medium",
  },
  {
    prompt: "Identify this glomerular pathology: light microscopy appears normal, but podocyte foot processes are effaced on EM.",
    imageUrl: img("renal-patho-003-minimal-change-disease.jpg"),
    options: [
      "Minimal change disease (MCD)",
      "Focal segmental glomerulosclerosis",
      "Membranous nephropathy",
      "IgA nephropathy",
    ],
    answer: 0,
    explanation: "MCD is the most common cause of nephrotic syndrome in children; LM is normal but EM shows foot process effacement.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this glomerular pathology: segmental sclerosis and hyalinosis in some glomeruli.",
    imageUrl: img("renal-patho-004-fsgs.jpg"),
    options: [
      "Focal segmental glomerulosclerosis (FSGS)",
      "Minimal change disease",
      "Membranous nephropathy",
      "Rapidly progressive GN",
    ],
    answer: 0,
    explanation: "FSGS shows sclerosis in segments of some glomeruli (focal = some, segmental = part of the tuft).",
    difficulty: "medium",
  },
  {
    prompt: "Identify this glomerular pathology: crescent formation in Bowman's space.",
    imageUrl: img("renal-patho-005-crescentic-gn.jpg"),
    options: [
      "Rapidly progressive (crescentic) glomerulonephritis",
      "Membranous nephropathy",
      "Focal segmental glomerulosclerosis",
      "Minimal change disease",
    ],
    answer: 0,
    explanation: "Crescentic GN shows proliferation of parietal epithelial cells in Bowman's space, indicating severe injury.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this pathology: nodular glomerulosclerosis (Kimmelstiel-Wilson nodules).",
    imageUrl: img("renal-patho-006-diabetic-nephropathy.jpg"),
    options: [
      "Diabetic nephropathy (Kimmelstiel-Wilson nodules)",
      "Amyloidosis",
      "Membranous nephropathy",
      "Hypertensive nephrosclerosis",
    ],
    answer: 0,
    explanation: "Kimmelstiel-Wilson nodules are round, eosinophilic, acellular mesangial nodules pathognomonic of diabetic nephropathy.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this renal pathology: hyaline arteriolosclerosis of afferent and efferent arterioles.",
    imageUrl: img("renal-patho-007-hypertensive-nephrosclerosis.jpg"),
    options: [
      "Hypertensive nephrosclerosis",
      "Diabetic nephropathy",
      "Glomerulonephritis",
      "Renal vein thrombosis",
    ],
    answer: 0,
    explanation: "Benign hypertension shows hyaline arteriolosclerosis; malignant shows hyperplastic arteriolosclerosis (onion-skin).",
    difficulty: "medium",
  },
  {
    prompt: "Identify this renal pathology: acute tubular necrosis with loss of brush border and nuclear loss.",
    imageUrl: img("renal-patho-008-acute-tubular-necrosis.jpg"),
    options: [
      "Acute tubular necrosis (ATN)",
      "Acute interstitial nephritis",
      "Acute pyelonephritis",
      "Cortical necrosis",
    ],
    answer: 0,
    explanation: "ATN shows tubular cell necrosis, loss of brush border, nuclear pyknosis/karyolysis, and intratubular casts.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this renal pathology: interstitial inflammation with tubulitis (lymphocytes invading tubules).",
    imageUrl: img("renal-patho-009-acute-interstitial-nephritis.jpg"),
    options: [
      "Acute interstitial nephritis (AIN)",
      "Acute tubular necrosis",
      "Acute pyelonephritis",
      "Chronic pyelonephritis",
    ],
    answer: 0,
    explanation: "AIN shows interstitial edema and inflammatory infiltrate (often eosinophils) with tubulitis, commonly drug-induced.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this renal pathology: acute suppurative inflammation of the kidney with microabscesses.",
    imageUrl: img("renal-patho-010-acute-pyelonephritis.jpg"),
    options: [
      "Acute pyelonephritis",
      "Acute interstitial nephritis",
      "Acute tubular necrosis",
      "Renal abscess",
    ],
    answer: 0,
    explanation: "Acute pyelonephritis shows neutrophilic infiltrate in interstitium and tubules, often with bacterial colonies.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this renal pathology: chronic inflammation with blunted calyces and cortical scarring.",
    imageUrl: img("renal-patho-011-chronic-pyelonephritis.jpg"),
    options: [
      "Chronic pyelonephritis",
      "Chronic glomerulonephritis",
      "Hypertensive nephrosclerosis",
      "Polycystic kidney disease",
    ],
    answer: 0,
    explanation: "Chronic pyelonephritis shows interstitial fibrosis, tubular atrophy, and blunted/deformed calyces.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this pathology: bilateral kidneys with cortical thinning and granular surface.",
    imageUrl: img("renal-patho-012-chronic-gn.jpg"),
    options: [
      "Chronic glomerulonephritis (end-stage kidney)",
      "Polycystic kidney disease",
      "Chronic pyelonephritis",
      "Hypertensive nephrosclerosis",
    ],
    answer: 0,
    explanation: "Chronic GN shows shrunken kidneys with granular cortical surface due to global glomerulosclerosis and interstitial fibrosis.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this congenital renal pathology: multiple cysts replacing both kidneys.",
    imageUrl: img("renal-patho-013-pkd.jpg"),
    options: [
      "Autosomal dominant polycystic kidney disease (ADPKD)",
      "Autosomal recessive PKD",
      "Multicystic dysplastic kidney",
      "Renal agenesis",
    ],
    answer: 0,
    explanation: "ADPKD shows bilateral kidneys replaced by numerous cysts, often with hepatic cysts and berry aneurysms.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this pathology: thyroidization of the kidney — dilated tubules filled with colloid-like casts.",
    imageUrl: img("renal-patho-014-thyroidization.jpg"),
    options: [
      "Thyroidization (chronic pyelonephritis / obstructive uropathy)",
      "Amyloidosis",
      "Diabetic nephropathy",
      "Renal cell carcinoma",
    ],
    answer: 0,
    explanation: "Thyroidization shows dilated tubules filled with eosinophilic colloid-like casts, resembling thyroid follicles.",
    difficulty: "hard",
  },
];
