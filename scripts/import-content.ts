// Imports the authoritative medical curriculum into the LMS from the real content
// folders (C:\work\projects\semester <n>). Ported from the Streamlit prototype (app.py).
//
//   CONTENT_ROOT=<abs path to the folder holding "semester 1|2"> npx tsx scripts/import-content.ts
//   CONTENT_ROOT defaults to the workspace parent (C:\work\projects).
//
// Behavior:
//   - Wipes all existing modules/lectures (cascades quiz banks, progress, attempts).
//   - All modules are paid (isFree=false); access is granted per module/term/year
//     subscription through the billing system.
//   - Fuzzy-matches each curriculum lecture/seminar/practical against PDF filenames in
//     the subject's folder. When no dedicated file matches, falls back to the subject's
//     primary PDF so the PDF viewer always has something to open.
//   - Extracts searchable text only for reasonably small PDFs (<= MAX_EXTRACT_MB) and
//     caps stored content length.
import "dotenv/config";
import { readdirSync, statSync, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { PDFParse } from "pdf-parse";
import { db } from "../src/shared/db";
import { lecture, curriculumModule } from "../src/features/curriculum/schema";

const CONTENT_ROOT = resolve(process.env.CONTENT_ROOT ?? "C:/work/projects");
const MAX_EXTRACT_MB = 12;
const MAX_CONTENT_CHARS = 120_000;

const KIND_PREFIX = ["lecture", "seminar", "practical"];

// ---- Authoritative curriculum (from app.py CURRICULUM) ---------------------------

type LectureKind = "lecture" | "seminar" | "practical";

type Curriculum = {
  code: string;
  slug: string;
  name: string;
  description: string;
  order: number;
  isFree: boolean;
  term: number;
  subjects: {
    name: string;
    lectures: { title: string; kind: LectureKind }[];
  }[];
};

const CURRICULUM: Curriculum[] = [
  {
    code: "AEH-101",
    slug: "ahe-101",
    name: "Anatomy, Embryology & Histology (AEH-101)",
    description: "Ø§Ù„ØªØ´Ø±ÙŠØ­ØŒ Ø§Ù„Ø£Ø¬Ù†Ø©ØŒ ÙˆØ§Ù„Ø£Ù†Ø³Ø¬Ø© â€” Ø§Ù„ØªØ±Ù… Ø§Ù„Ø£ÙˆÙ„.",
    order: 1,
    isFree: false,
    term: 1,
    subjects: [
      {
        name: "Anatomy",
        lectures: [
          { title: "Anatomical terms", kind: "lecture" },
          { title: "Integumentary system", kind: "lecture" },
          { title: "Skeletal system", kind: "lecture" },
          { title: "Articulations (joint)", kind: "lecture" },
          { title: "CVS", kind: "lecture" },
          { title: "Lymphatic", kind: "lecture" },
          { title: "Respiratory system", kind: "lecture" },
          { title: "Digestive system", kind: "lecture" },
          { title: "Urinary system", kind: "lecture" },
          { title: "Nervous system", kind: "lecture" },
          { title: "Introduction to anatomy", kind: "seminar" },
          { title: "CVS", kind: "seminar" },
          { title: "Muscles & joints", kind: "seminar" },
          { title: "Anatomical terms", kind: "practical" },
          { title: "Axial & Appendicular Skeleton", kind: "practical" },
          { title: "Muscles & Joint", kind: "practical" },
          { title: "CVS & Lymphatic", kind: "practical" },
          { title: "Respiratory", kind: "practical" },
          { title: "GIT", kind: "practical" },
          { title: "Renal", kind: "practical" },
          { title: "Nervous", kind: "practical" },
        ],
      },
      {
        name: "Embryology",
        lectures: [
          { title: "Male & Female genital system", kind: "lecture" },
          { title: "Reproductive cycles", kind: "lecture" },
          { title: "Fertilization", kind: "lecture" },
          { title: "Implantation & bilaminar disc formation", kind: "lecture" },
          { title: "Gastrulation", kind: "lecture" },
          { title: "Placenta", kind: "lecture" },
          { title: "Fetal membrane", kind: "lecture" },
        ],
      },
      {
        name: "Histology",
        lectures: [
          { title: "Cell membrane & membranous organelles", kind: "lecture" },
          { title: "Non-membranous organelles, inclusions", kind: "lecture" },
          { title: "Nucleus & cell division", kind: "lecture" },
          { title: "Epithelium", kind: "lecture" },
          { title: "Connective tissues 1", kind: "lecture" },
          { title: "Connective tissues 2", kind: "lecture" },
          { title: "Nervous tissue", kind: "lecture" },
          { title: "Skin", kind: "lecture" },
          { title: "Introduction to histology", kind: "seminar" },
          { title: "Membranous organelles", kind: "seminar" },
          { title: "Nucleus", kind: "seminar" },
          { title: "Epithelium", kind: "seminar" },
          { title: "Nervous", kind: "seminar" },
          { title: "Membranous & non-membranous organelles", kind: "practical" },
          { title: "Nucleus & cell division", kind: "practical" },
          { title: "Epithelium", kind: "practical" },
          { title: "Connective tissues", kind: "practical" },
          { title: "Nervous tissue", kind: "practical" },
          { title: "Skin", kind: "practical" },
        ],
      },
    ],
  },
  {
    code: "PPG-102",
    slug: "ppg-102",
    name: "Pharmacology, Molecular Biology & Physiology (PPG-102)",
    description: "Ø§Ù„ÙØ§Ø±Ù…Ø§ÙƒÙˆÙ„ÙˆØ¬ÙŠØ§ØŒ Ø§Ù„Ø¨ÙŠÙˆÙ„ÙˆØ¬ÙŠØ§ Ø§Ù„Ø¬Ø²ÙŠØ¦ÙŠØ©ØŒ ÙˆØ§Ù„ÙÙŠØ²ÙŠÙˆÙ„ÙˆØ¬ÙŠØ§ â€” Ø§Ù„ØªØ±Ù… Ø§Ù„Ø£ÙˆÙ„.",
    order: 2,
    isFree: false,
    term: 1,
    subjects: [
      {
        name: "Pharmacology",
        lectures: [
          { title: "Targets for drug actions", kind: "lecture" },
          { title: "Graded dose response curve", kind: "lecture" },
          { title: "Quantal dose & response curve", kind: "lecture" },
          { title: "Factors affecting dose response", kind: "lecture" },
          { title: "Drug absorption", kind: "lecture" },
          { title: "Drug distribution", kind: "lecture" },
          { title: "Metabolism", kind: "lecture" },
          { title: "Elimination", kind: "lecture" },
          { title: "Autonomic pharmacology 1", kind: "lecture" },
          { title: "Autonomic pharmacology 2", kind: "lecture" },
          { title: "Neuromuscular transmission", kind: "lecture" },
          { title: "Drug development", kind: "practical" },
          { title: "Prescription writing", kind: "practical" },
          { title: "Classic experiment", kind: "practical" },
        ],
      },
      {
        name: "Molecular Biology",
        lectures: [
          { title: "Introduction to molecular biology & DNA organization", kind: "lecture" },
          { title: "DNA replication", kind: "lecture" },
          { title: "RNA structure & transcription", kind: "lecture" },
          { title: "Translation", kind: "lecture" },
          { title: "Regulation of gene expression", kind: "lecture" },
          { title: "Mutation & repair", kind: "lecture" },
          { title: "Heredity", kind: "lecture" },
        ],
      },
      {
        name: "Physiology",
        lectures: [
          { title: "Organisation of the human body", kind: "lecture" },
          { title: "Cell membrane, body fluids & water balance", kind: "lecture" },
          { title: "Transport across the cell membrane", kind: "lecture" },
          { title: "Introduction to the nervous system", kind: "lecture" },
          { title: "Autonomic nervous system", kind: "lecture" },
          { title: "Autonomic ganglia & sympathetic function", kind: "lecture" },
          { title: "Parasympathetic functions", kind: "lecture" },
          { title: "Chemical transmission", kind: "lecture" },
          { title: "Nerve physiology", kind: "lecture" },
          { title: "Properties of nerve impulse", kind: "lecture" },
          { title: "Body temperature", kind: "practical" },
          { title: "Arterial blood pressure", kind: "practical" },
          { title: "Cell membrane transport", kind: "practical" },
          { title: "Functions of autonomic neurons", kind: "practical" },
          { title: "Neuromuscular transmission", kind: "practical" },
        ],
      },
    ],
  },
  {
    code: "PMB-103",
    slug: "pmb-103",
    name: "Pathology, Microbiology & Biochemistry (PMB-103)",
    description: "Ø§Ù„Ø¨Ø§Ø«ÙˆÙ„ÙˆØ¬ÙŠØ§ØŒ Ø§Ù„Ù…ÙŠÙƒØ±ÙˆØ¨ÙŠÙˆÙ„ÙˆØ¬ÙŠØ§ØŒ ÙˆØ§Ù„ÙƒÙŠÙ…ÙŠØ§Ø¡ Ø§Ù„Ø­ÙŠÙˆÙŠØ© â€” Ø§Ù„ØªØ±Ù… Ø§Ù„Ø£ÙˆÙ„.",
    order: 3,
    isFree: false,
    term: 1,
    subjects: [
      {
        name: "Pathology",
        lectures: [
          { title: "Introduction & inflammation", kind: "lecture" },
          { title: "Types of inflammation", kind: "lecture" },
          { title: "Inflammation 3", kind: "lecture" },
          { title: "Cell injury 1", kind: "lecture" },
          { title: "Cell injury 2", kind: "lecture" },
          { title: "Repair", kind: "lecture" },
          { title: "Circulatory disturbances 1", kind: "lecture" },
          { title: "Circulatory disturbances 2", kind: "lecture" },
          { title: "Disturbance of growth", kind: "lecture" },
          { title: "Neoplasia classification 1", kind: "lecture" },
          { title: "Neoplasia classification 2", kind: "lecture" },
          { title: "Neoplasia: clinical aspect", kind: "lecture" },
          { title: "Introduction", kind: "seminar" },
          { title: "Morphology of inflammation", kind: "practical" },
          { title: "Morphology of repair", kind: "practical" },
          { title: "Morphology of circulatory disturbances", kind: "practical" },
          { title: "Morphology of tumors", kind: "practical" },
        ],
      },
      {
        name: "Microbiology",
        lectures: [
          { title: "Bacterial cell structure", kind: "lecture" },
          { title: "Bacterial growth requirements", kind: "lecture" },
          { title: "Bacterial genetics", kind: "lecture" },
          { title: "General virology", kind: "lecture" },
          { title: "Mycology", kind: "lecture" },
          { title: "Sterilization & disinfection", kind: "lecture" },
          { title: "Microscope", kind: "practical" },
          { title: "Staining", kind: "practical" },
          { title: "Culture media", kind: "practical" },
        ],
      },
      {
        name: "Biochemistry",
        lectures: [
          { title: "CHO: monosaccharides", kind: "lecture" },
          { title: "CHO: disaccharides & polysaccharides", kind: "lecture" },
          { title: "Fatty acids & simple lipids", kind: "lecture" },
          { title: "Compound & derived lipids", kind: "lecture" },
          { title: "Amino acids & protein structure", kind: "lecture" },
          { title: "Protein classification, denaturation & folding", kind: "lecture" },
          { title: "Enzymology 1", kind: "lecture" },
          { title: "Enzymology 2", kind: "lecture" },
          { title: "(CHO) GAGs & glycoproteins", kind: "seminar" },
          { title: "Derived lipids", kind: "seminar" },
          { title: "Protein chemistry", kind: "seminar" },
          { title: "Practical 1", kind: "practical" },
          { title: "Practical 2", kind: "practical" },
        ],
      },
    ],
  },
  {
    code: "MT-104",
    slug: "mt-104",
    name: "Medical Terminology (MT-104)",
    description: "Ø§Ù„Ù…ØµØ·Ù„Ø­Ø§Øª Ø§Ù„Ø·Ø¨ÙŠØ© â€” Ø§Ù„ØªØ±Ù… Ø§Ù„Ø£ÙˆÙ„.",
    order: 4,
    isFree: false,
    term: 1,
    subjects: [],
  },
  {
    code: "EN-105",
    slug: "en-105",
    name: "English Language (EN-105)",
    description: "Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ© â€” Ø§Ù„ØªØ±Ù… Ø§Ù„Ø£ÙˆÙ„.",
    order: 5,
    isFree: false,
    term: 1,
    subjects: [],
  },
  {
    code: "RS-201",
    slug: "rs-201",
    name: "Respiratory System (RS-201)",
    description: "Ø§Ù„Ø¬Ù‡Ø§Ø² Ø§Ù„ØªÙ†ÙØ³ÙŠ â€” Ø§Ù„ØªØ±Ù… Ø§Ù„Ø«Ø§Ù†ÙŠ.",
    order: 6,
    isFree: false,
    term: 2,
    subjects: [
      {
        name: "Anatomy",
        lectures: [
          { title: "Anatomy of nose", kind: "lecture" },
          { title: "Anatomy of pharynx", kind: "lecture" },
          { title: "Anatomy of larynx, trachea & bronchi", kind: "lecture" },
          { title: "Anatomy of lung", kind: "lecture" },
          { title: "Anatomy of thoracic wall & diaphragm", kind: "lecture" },
          { title: "Blood supply & innervation of thoracic wall", kind: "lecture" },
          { title: "Development of the respiratory system", kind: "lecture" },
          { title: "Nose & pharynx", kind: "practical" },
          { title: "Larynx, trachea & lung", kind: "practical" },
          { title: "Thoracic cage & pleura", kind: "practical" },
        ],
      },
      {
        name: "Histology",
        lectures: [
          { title: "Conductive portion of the respiratory tract", kind: "lecture" },
          { title: "Respiratory portion of the respiratory tract", kind: "lecture" },
          { title: "Trachea & lung", kind: "practical" },
        ],
      },
      {
        name: "Physiology",
        lectures: [
          { title: "Respiration and mechanics of breathing", kind: "lecture" },
          { title: "Factors affecting pulmonary ventilation", kind: "lecture" },
          { title: "Alveolar gas exchange", kind: "lecture" },
          { title: "O2 & CO2 transport", kind: "lecture" },
          { title: "Neural and chemical control of respiration", kind: "lecture" },
          { title: "Hypoxia", kind: "lecture" },
          { title: "Lung compliance", kind: "seminar" },
          { title: "Pulmonary function tests I & II", kind: "practical" },
        ],
      },
      {
        name: "Pathology",
        lectures: [
          { title: "Diseases affecting the upper respiratory tract", kind: "lecture" },
          { title: "Pneumonia & suppurative lung diseases", kind: "lecture" },
          { title: "COPD", kind: "lecture" },
          { title: "Pathology of tuberculosis", kind: "lecture" },
          { title: "Tumors of the respiratory system", kind: "lecture" },
          { title: "Pulmonary infection & obstructive diseases", kind: "practical" },
          { title: "TB & pulmonary neoplasms", kind: "practical" },
        ],
      },
      {
        name: "Microbiology",
        lectures: [
          { title: "Respiratory viral infections", kind: "lecture" },
          { title: "Bacterial URT infections", kind: "lecture" },
          { title: "Bacterial LRT infections", kind: "lecture" },
          { title: "Mycobacterial infections", kind: "lecture" },
          { title: "Diagnosis of pulmonary tuberculosis", kind: "practical" },
        ],
      },
      {
        name: "Pharmacology",
        lectures: [
          { title: "Drugs used to treat cough", kind: "lecture" },
          { title: "Treatment of bronchial asthma", kind: "lecture" },
          { title: "Drug therapy for pneumonia", kind: "seminar" },
          { title: "Antituberculous drugs", kind: "seminar" },
        ],
      },
      {
        name: "Clinical",
        lectures: [{ title: "Dyspnea", kind: "lecture" }],
      },
    ],
  },
  {
    code: "CVS-202",
    slug: "cvs-202",
    name: "Cardio-Vascular System (CVS-202)",
    description: "Ø§Ù„Ø¬Ù‡Ø§Ø² Ø§Ù„Ù‚Ù„Ø¨ÙŠ Ø§Ù„ÙˆØ¹Ø§Ø¦ÙŠ â€” Ø§Ù„ØªØ±Ù… Ø§Ù„Ø«Ø§Ù†ÙŠ.",
    order: 7,
    isFree: false,
    term: 2,
    subjects: [
      {
        name: "Anatomy",
        lectures: [
          { title: "External features of the heart", kind: "lecture" },
          { title: "Internal features of the heart", kind: "lecture" },
          { title: "Mediastinum", kind: "lecture" },
          { title: "Development of the heart", kind: "lecture" },
          { title: "Congenital anomalies of the heart", kind: "seminar" },
          { title: "Anatomy of cardiac configuration", kind: "seminar" },
          { title: "Heart 1: external features", kind: "practical" },
          { title: "Heart 2: internal features", kind: "practical" },
          { title: "Mediastinum", kind: "practical" },
          { title: "Blood supply & innervation of the heart", kind: "practical" },
          { title: "Great vessels of the thorax", kind: "practical" },
        ],
      },
      {
        name: "Clinical",
        lectures: [{ title: "Hypertension (HTN)", kind: "lecture" }],
      },
      {
        name: "Microbiology",
        lectures: [
          { title: "Microorganisms of CVS infection", kind: "lecture" },
          { title: "Staph & strept lab diagnosis", kind: "practical" },
        ],
      },
      {
        name: "Pathology",
        lectures: [
          { title: "Hypertension & vessel diseases", kind: "lecture" },
          { title: "Atherosclerosis & aneurysm", kind: "lecture" },
          { title: "MI & CAD", kind: "lecture" },
          { title: "Cardiovascular diseases", kind: "practical" },
        ],
      },
      {
        name: "Pharmacology",
        lectures: [
          { title: "Drugs used to treat hypertension", kind: "lecture" },
          { title: "Treatment of heart failure", kind: "lecture" },
          { title: "Drug therapy for IHD and angina", kind: "lecture" },
          { title: "Antihyperlipidaemic drugs", kind: "seminar" },
        ],
      },
      {
        name: "Biochemistry",
        lectures: [
          { title: "Cholesterol metabolism", kind: "lecture" },
          { title: "Lipoprotein metabolism", kind: "lecture" },
        ],
      },
      {
        name: "Physiology",
        lectures: [
          { title: "Rhythmicity & conductivity", kind: "lecture" },
          { title: "Excitability & contractility", kind: "lecture" },
          { title: "Cardiac cycle", kind: "lecture" },
          { title: "HR regulation & nervous control of the CVS", kind: "lecture" },
          { title: "Cardiac output", kind: "lecture" },
          { title: "Factors maintaining arterial blood pressure", kind: "lecture" },
          { title: "Capillary circulation and edema", kind: "lecture" },
          { title: "Venous & special circulation", kind: "lecture" },
          { title: "Physiological anatomy of the heart", kind: "seminar" },
          { title: "Application on cardiac cycle", kind: "seminar" },
          { title: "Blood pressure & pulse", kind: "practical" },
          { title: "Performing ECG", kind: "practical" },
        ],
      },
      {
        name: "Histology",
        lectures: [
          { title: "Histology of the heart", kind: "lecture" },
          { title: "Histology of the vascular system", kind: "lecture" },
          { title: "Heart & blood vessels", kind: "practical" },
        ],
      },
    ],
  },
  {
    code: "RAU-203",
    slug: "rau-203",
    name: "Renal & Urinary System (RAU-203)",
    description: "Ø§Ù„Ø¬Ù‡Ø§Ø² Ø§Ù„Ø¨ÙˆÙ„ÙŠ â€” Ø§Ù„ØªØ±Ù… Ø§Ù„Ø«Ø§Ù†ÙŠ.",
    order: 8,
    isFree: false,
    term: 2,
    subjects: [
      {
        name: "Anatomy",
        lectures: [
          { title: "Anatomy of the upper urinary tract", kind: "lecture" },
          { title: "Development of the renal system", kind: "lecture" },
          { title: "Aorta & IVC", kind: "seminar" },
          { title: "Anatomy of the upper urinary tract", kind: "practical" },
          { title: "Urinary bladder & urethra", kind: "practical" },
          { title: "Vertebrae & posterior abdominal wall", kind: "practical" },
        ],
      },
      {
        name: "Pathology",
        lectures: [
          { title: "Pathology of urinary tract infection", kind: "lecture" },
          { title: "Pathology of urinary tract obstruction", kind: "lecture" },
          { title: "Glomerular & tubular disease", kind: "lecture" },
          { title: "Tumors of the kidney & urinary system", kind: "lecture" },
          { title: "Urinary tract obstruction", kind: "practical" },
          { title: "Renal & urinary tumors", kind: "practical" },
        ],
      },
      {
        name: "Clinical",
        lectures: [{ title: "Nephritic syndrome & edema", kind: "lecture" }],
      },
      {
        name: "Biochemistry",
        lectures: [
          { title: "Acidâ€“base balance", kind: "lecture" },
          { title: "Biochemical aspects of renal function", kind: "lecture" },
          { title: "Urine composition", kind: "lecture" },
          { title: "Urine analysis & urinary stone", kind: "practical" },
        ],
      },
      {
        name: "Histology",
        lectures: [
          { title: "Histology of the renal corpuscles", kind: "lecture" },
          { title: "Histology of renal tubules & urinary passages", kind: "lecture" },
          { title: "Structure of the kidney & urinary tract", kind: "practical" },
        ],
      },
      {
        name: "Pharmacology",
        lectures: [
          { title: "Diuretics", kind: "lecture" },
          { title: "Diuretics & drugs changing urinary pH", kind: "seminar" },
          { title: "Drug therapy of UTI", kind: "seminar" },
        ],
      },
      {
        name: "Microbiology",
        lectures: [
          { title: "Organisms causing urinary tract infection", kind: "lecture" },
          { title: "Diagnosis of UTI", kind: "practical" },
        ],
      },
      {
        name: "Physiology",
        lectures: [
          { title: "Renal structure & function", kind: "lecture" },
          { title: "Renal blood flow and its control", kind: "lecture" },
          { title: "Tubular function and its control", kind: "lecture" },
          { title: "Role of the kidney in electrolyte homeostasis", kind: "lecture" },
          { title: "Role of the kidney in water balance & micturition", kind: "lecture" },
          { title: "Laboratory assessment of renal function", kind: "practical" },
        ],
      },
    ],
  },
  {
    code: "IBL-204",
    slug: "ibl-204",
    name: "Immune, Blood & Lymphatic (IBL-204)",
    description: "Ø§Ù„Ù…Ù†Ø§Ø¹Ø© ÙˆØ§Ù„Ø¯Ù… ÙˆØ§Ù„Ø¬Ù‡Ø§Ø² Ø§Ù„Ù„Ù…ÙØ§ÙˆÙŠ â€” Ø§Ù„ØªØ±Ù… Ø§Ù„Ø«Ø§Ù†ÙŠ.",
    order: 9,
    isFree: false,
    term: 2,
    subjects: [
      {
        name: "Clinical",
        lectures: [{ title: "Anemia", kind: "lecture" }],
      },
      {
        name: "Anatomy",
        lectures: [{ title: "Lymphatics & lymphangiology", kind: "lecture" }],
      },
      {
        name: "Physiology",
        lectures: [
          { title: "General functions of blood", kind: "lecture" },
          { title: "Blood indices", kind: "lecture" },
          { title: "Platelets & haemostasis", kind: "lecture" },
          { title: "Natural anticoagulation mechanism", kind: "lecture" },
        ],
      },
      {
        name: "Histology",
        lectures: [
          { title: "Structure of blood cells", kind: "lecture" },
          { title: "Myeloid tissue & hematopoiesis", kind: "lecture" },
          { title: "Lymph nodes, spleen, tonsils & thymus gland", kind: "lecture" },
        ],
      },
      {
        name: "Biochemistry",
        lectures: [
          { title: "Plasma proteins", kind: "lecture" },
          { title: "Hemoglobin synthesis", kind: "lecture" },
          { title: "Hemoglobin catabolism", kind: "lecture" },
        ],
      },
      {
        name: "Pharmacology",
        lectures: [
          { title: "Anticoagulants", kind: "lecture" },
          { title: "Anticoagulant & antiplatelet drugs", kind: "seminar" },
        ],
      },
      {
        name: "Microbiology (Immunology)",
        lectures: [
          { title: "Innate immunity", kind: "lecture" },
          { title: "Adaptive immunity", kind: "lecture" },
          { title: "Hypersensitivity", kind: "lecture" },
          { title: "Tolerance, autoimmunity & tumor immunology", kind: "lecture" },
        ],
      },
    ],
  },
  {
    code: "UNI-205",
    slug: "uni-205",
    name: "Community Health Issues (UNI-205)",
    description: "Ø§Ù„Ù‚Ø¶Ø§ÙŠØ§ Ø§Ù„Ù…Ø¬ØªÙ…Ø¹ÙŠØ© â€” Ø§Ù„ØªØ±Ù… Ø§Ù„Ø«Ø§Ù†ÙŠ.",
    order: 10,
    isFree: false,
    term: 2,
    subjects: [],
  },
];

// ---- Folder keywords (from app.py get_subject_folder_keywords) -------------------

function subjectFolderKeywords(code: string, subject: string): string[] | null {
  if (code === "AEH-101") return subject === "Histology" ? ["histology"] : ["anatomy", "embryology"];
  if (code === "PPG-102") return ["physiology", "pharmacology"];
  if (code === "PMB-103") {
    if (subject === "Pathology") return ["patho"];
    if (subject === "Microbiology") return ["micro"];
    if (subject === "Biochemistry") return ["biochemistry"];
  }
  if (code === "RS-201") return ["resp"];
  if (code === "CVS-202") return ["cvs"];
  if (code === "RAU-203") return ["renal"];
  if (code === "IBL-204") return ["ibl"];
  if (code === "MT-104") return ["medical", "terminology"];
  if (code === "EN-105") return ["english"];
  if (code === "UNI-205") return ["health"];
  return null;
}

function termDirName(term: number) {
  return `semester ${term}`;
}

// ---- Fuzzy PDF matching (from app.py _normalize_words/_word_matches/_find_lecture_file) ----

const STOPWORDS = new Set(["lecture", "practical", "seminar", "ppt", "pdf", "the", "and", "of", "a", "an"]);

const SYNONYMS: Record<string, Set<string>> = {
  urinary: new Set(["renal", "kidney"]),
  renal: new Set(["urinary", "kidney"]),
  kidney: new Set(["renal", "urinary"]),
  cardiovascular: new Set(["cvs", "cardiac", "heart"]),
  cvs: new Set(["cardiovascular", "cardiac", "heart"]),
  heart: new Set(["cvs", "cardiac", "cardiovascular"]),
};

function normalizeWords(text: string): string[] {
  const t = text.replace(/\.pdf$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return t.split(" ").filter((w) => w && !STOPWORDS.has(w));
}

function wordMatches(targetWord: string, candWords: string[]): boolean {
  const toTry = new Set([targetWord, ...(SYNONYMS[targetWord] ?? [])]);
  return candWords.some(
    (cw) => cw.length >= 3 && [...toTry].some((tw) => cw.includes(tw) || tw.includes(cw)),
  );
}

function findLectureFile(folderPath: string, lectureTitle: string, kind: LectureKind): string | null {
  const targetWords = normalizeWords(lectureTitle);
  if (!targetWords.length) return null;

  const candidates: { score: number; extraWords: number; kindBonus: number; name: string }[] = [];
  for (const fname of readdirSyncSafe(folderPath)) {
    if (!fname.toLowerCase().endsWith(".pdf")) continue;
    const candWords = normalizeWords(fname);
    if (!candWords.length) continue;
    const matches = targetWords.filter((tw) => tw.length >= 3 && wordMatches(tw, candWords)).length;
    const score = matches / targetWords.length;

    const lower = fname.toLowerCase();
    const startsWithKind = KIND_PREFIX.some((k) => lower.startsWith(k));
    let kindBonus = 0;
    if (startsWithKind) {
      kindBonus = lower.startsWith(kind) ? 0.15 : -0.15;
    }

    candidates.push({ score, extraWords: candWords.length, kindBonus, name: fname });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || b.kindBonus - a.kindBonus || a.extraWords - b.extraWords);
  const best = candidates[0];
  if (best.score < 0.5) return null;
  return join(folderPath, best.name);
}

function readdirSyncSafe(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

// ---- Text extraction ---------------------------------------------------------------

async function extractPdfText(filePath: string): Promise<string> {
  try {
    const buf = await readFile(filePath);
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    await parser.destroy();
    return (result.text ?? "").slice(0, MAX_CONTENT_CHARS);
  } catch {
    return "";
  }
}

// ---- Main ---------------------------------------------------------------------------

async function main() {
  console.log(`[import-content] CONTENT_ROOT=${CONTENT_ROOT}`);

  const existing = await db.select({ id: curriculumModule.id }).from(curriculumModule);
  if (existing.length > 0) {
    console.log(`[import-content] wiping ${existing.length} existing module(s) + cascades...`);
    for (const m of existing) {
      await db.delete(curriculumModule).where(eq(curriculumModule.id, m.id));
    }
  }

  let modulesCreated = 0;
  let lecturesCreated = 0;
  let filesLinked = 0;
  let textsExtracted = 0;
  let missingFolders = 0;

  for (const mod of CURRICULUM) {
    const moduleId = randomUUID();
    await db.insert(curriculumModule).values({
      id: moduleId,
      name: mod.name,
      slug: mod.slug,
      description: mod.description,
      order: mod.order,
      isFree: mod.isFree,
      term: mod.term,
    });
    modulesCreated++;

    const termDir = join(CONTENT_ROOT, termDirName(mod.term));
    let order = 0;

    for (const subject of mod.subjects) {
      const keywords = subjectFolderKeywords(mod.code, subject.name);
      let subjectFolder: string | null = null;
      if (keywords?.length) {
        subjectFolder = findFolderByKeywords(termDir, keywords);
      }
      if (!subjectFolder) {
        missingFolders++;
        console.log(`  [warn] no folder for ${mod.code} / ${subject.name} (keywords=${keywords?.join(",")})`);
      }

      const folderPdfs = subjectFolder ? readdirSyncSafe(subjectFolder).filter((f) => f.toLowerCase().endsWith(".pdf")).sort() : [];

      for (const item of subject.lectures) {
        order++;
        let pdfFile: string | null = null;
        let content: string | null = null;

        if (subjectFolder) {
          const matched = findLectureFile(subjectFolder, item.title, item.kind);
          if (matched) {
            pdfFile = normalizeSlashes(relative(CONTENT_ROOT, matched));
            filesLinked++;
            const size = await fileSize(matched);
            if (size > 0 && size <= MAX_EXTRACT_MB * 1024 * 1024) {
              const text = await extractPdfText(matched);
              if (text.trim()) {
                content = text;
                textsExtracted++;
              }
            }
          } else if (folderPdfs.length > 0) {
            const primary = join(subjectFolder, folderPdfs[0]);
            pdfFile = normalizeSlashes(relative(CONTENT_ROOT, primary));
            filesLinked++;
          }
        }

        const title = item.title;
        const slug = slugify(`${mod.slug}-${subject.name}-${title}`);
        await db.insert(lecture).values({
          id: randomUUID(),
          moduleId,
          title,
          slug,
          subject: subject.name,
          kind: item.kind,
          summary: null,
          content,
          pdfFile,
          order,
        });
        lecturesCreated++;
      }
    }

    console.log(`[import-content] module: ${mod.slug} (${mod.subjects.reduce((s, x) => s + x.lectures.length, 0)} lectures)`);
  }

  console.log(
    `[import-content] done â€” modules=${modulesCreated} lectures=${lecturesCreated} filesLinked=${filesLinked} texts=${textsExtracted} missingFolders=${missingFolders}`,
  );
  process.exit(0);
}

function findFolderByKeywords(rootDir: string, keywords: string[]): string | null {
  const kws = keywords.map((k) => k.toLowerCase());
  if (!existsSync(rootDir) || !statSync(rootDir).isDirectory()) return null;
  const dirs: string[] = [];
  walk(rootDir, dirs);
  for (const d of dirs) {
    const nameLower = d.toLowerCase();
    if (kws.every((k) => nameLower.includes(k))) return d;
  }
  return null;
}

function walk(dir: string, out: string[]) {
  for (const entry of readdirSyncSafe(dir)) {
    const full = join(dir, entry);
    try {
      if (statSync(full).isDirectory()) {
        out.push(full);
        walk(full, out);
      }
    } catch {
      // unreadable entry
    }
  }
}

async function fileSize(p: string): Promise<number> {
  try {
    const st = await stat(p);
    return st.size;
  } catch {
    return 0;
  }
}

function normalizeSlashes(p: string): string {
  return p.split(sep).join("/");
}

function slugify(s: string): string {
  const t = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return t || "item";
}

main().catch((err) => {
  console.error("[import-content] error:", err);
  process.exit(1);
});
