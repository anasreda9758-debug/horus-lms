import type { SeedQuestion } from "../seed-utils";

function img(file: string): string {
  return `/api/content/ospe/image?folder=EN&file=${encodeURIComponent(file)}`;
}

export const questions: SeedQuestion[] = [
  // ── Grammar: Tenses ────────────────────────────────────────────────────
  {
    prompt: "Choose the correct form: By the time the paramedics arrived, the patient ______ already ______.",
    imageUrl: img("en-001-past-perfect.jpg"),
    options: ["had … lost", "has … lost", "was … losing", "did … lose", "loses"],
    answer: 0,
    explanation: "The past perfect 'had lost' is used for an action completed before another past action.",
    difficulty: "medium",
  },
  {
    prompt: "Complete the sentence: The surgeon ______ the procedure while the anaesthetist monitors the patient right now.",
    imageUrl: img("en-002-present-continuous.jpg"),
    options: ["performs", "is performing", "has performed", "performed", "will perform"],
    answer: 1,
    explanation: "The present continuous is used for an action happening at the moment of speaking.",
    difficulty: "easy",
  },
  {
    prompt: "Choose the correct form: The research team ______ over 200 patients since the trial began.",
    imageUrl: img("en-003-present-perfect.jpg"),
    options: ["enrolled", "has been enrolling", "enrolls", "is enrolling", "was enrolling"],
    answer: 1,
    explanation: "The present perfect continuous emphasises the ongoing nature of an action that started in the past and continues to the present.",
    difficulty: "medium",
  },

  // ── Grammar: Conditionals ──────────────────────────────────────────────
  {
    prompt: "Choose the correct conditional: If the dosage ______ adjusted, the patient would not have experienced adverse effects.",
    imageUrl: img("en-004-third-conditional.jpg"),
    options: ["was", "had been", "were", "has been", "is"],
    answer: 1,
    explanation: "The third conditional requires 'had + past participle' in the if-clause.",
    difficulty: "hard",
  },
  {
    prompt: "Complete the sentence: If the hospital ______ more ventilators, it could admit more critical patients.",
    imageUrl: img("en-005-second-conditional.jpg"),
    options: ["has", "had", "will have", "would have", "having"],
    answer: 1,
    explanation: "The second conditional uses the past simple in the if-clause to describe a hypothetical present situation.",
    difficulty: "medium",
  },

  // ── Grammar: Passive Voice ─────────────────────────────────────────────
  {
    prompt: "Rewrite in passive voice: 'The nurse administered the injection.' Select the correct passive form.",
    imageUrl: img("en-006-passive-voice.jpg"),
    options: [
      "The injection was administered by the nurse.",
      "The injection is administered by the nurse.",
      "The injection has been administered by the nurse.",
      "The injection administered by the nurse.",
      "The injection were administered by the nurse.",
    ],
    answer: 0,
    explanation: "Past simple passive: was/were + past participle.",
    difficulty: "easy",
  },
  {
    prompt: "Choose the correct passive form: New clinical guidelines ______ by the Ministry of Health next quarter.",
    imageUrl: img("en-007-future-passive.jpg"),
    options: ["will publish", "will be published", "are published", "were published", "has been published"],
    answer: 1,
    explanation: "Future passive is formed with 'will be + past participle'.",
    difficulty: "easy",
  },

  // ── Grammar: Articles ──────────────────────────────────────────────────
  {
    prompt: "Choose the correct article: The patient was diagnosed with ______ rare autoimmune condition.",
    imageUrl: img("en-008-articles.jpg"),
    options: ["a", "an", "the", "∅ (no article)", "some"],
    answer: 0,
    explanation: "'A' is used before consonant sounds; 'rare' starts with /r/.",
    difficulty: "easy",
  },
  {
    prompt: "Identify the error: 'She is ______ intern at ______ Royal Hospital in London.'",
    imageUrl: img("en-009-articles-error.jpg"),
    options: [
      "an … the",
      "a … the",
      "the … a",
      "an … ∅",
      "a … ∅",
    ],
    answer: 0,
    explanation: "'An' is used before vowel sounds ('intern'), and 'the' is used before specific proper nouns ('the Royal Hospital').",
    difficulty: "medium",
  },

  // ── Grammar: Prepositions ──────────────────────────────────────────────
  {
    prompt: "Choose the correct preposition: The patient was admitted ______ the cardiology department.",
    imageUrl: img("en-010-prepositions.jpg"),
    options: ["to", "in", "on", "at", "into"],
    answer: 0,
    explanation: "'Admitted to' is the standard collocation with hospital departments.",
    difficulty: "easy",
  },

  // ── Medical English: Case Presentations ────────────────────────────────
  {
    prompt: "A doctor says: 'The patient is a 54-year-old male presenting with acute chest pain radiating to the left arm.' What does 'radiating' mean in this context?",
    imageUrl: img("en-011-radiating.jpg"),
    options: [
      "Spreading from one area to another",
      "Emitting heat",
      "Shrinking in intensity",
      "Moving in a circle",
      "Remaining localised",
    ],
    answer: 0,
    explanation: "In medicine, 'radiating' describes pain that spreads from one body area to another.",
    difficulty: "easy",
  },
  {
    prompt: "Complete the case presentation: 'On examination, the patient was ______ and orientated to time, place, and person.'",
    imageUrl: img("en-012-alert.jpg"),
    options: ["alert", "alerts", "alerting", "alerted", "to alert"],
    answer: 0,
    explanation: "'Alert and orientated' is a standard medical phrase describing a patient's mental status.",
    difficulty: "easy",
  },
  {
    prompt: "In a case presentation, the phrase 'comorbidities include hypertension and type 2 diabetes mellitus' is best understood as:",
    imageUrl: img("en-013-comorbidities.jpg"),
    options: [
      "Additional diseases existing alongside the primary condition",
      "Medications the patient is taking",
      "Allergies the patient has reported",
      "Surgical procedures previously performed",
      "Family history of disease",
    ],
    answer: 0,
    explanation: "Comorbidities are additional conditions that coexist with the primary diagnosis.",
    difficulty: "easy",
  },

  // ── Medical English: Patient Communication ─────────────────────────────
  {
    prompt: "Which of the following is the most appropriate way to ask a patient about their symptoms?",
    imageUrl: img("en-014-patient-comm.jpg"),
    options: [
      "Can you describe what you are feeling?",
      "You have stomach pain, right?",
      "Tell me your symptoms now.",
      "What's wrong with you?",
      "Are you faking it?",
    ],
    answer: 0,
    explanation: "Open-ended, non-leading questions encourage patients to communicate freely and feel heard.",
    difficulty: "easy",
  },
  {
    prompt: "A patient says: 'I've been having this terrible headache for three days.' What is the best initial response?",
    imageUrl: img("en-015-empathy.jpg"),
    options: [
      "I'm sorry to hear that. Can you tell me more about the headache?",
      "You should have come earlier.",
      "Take paracetamol and go home.",
      "Headaches are usually nothing serious.",
      "That doesn't sound too bad.",
    ],
    answer: 0,
    explanation: "Acknowledging the patient's discomfort and asking for more information demonstrates empathy and gathers clinical data.",
    difficulty: "easy",
  },
  {
    prompt: "Which instruction to a patient is worded most clearly?",
    imageUrl: img("en-016-instructions.jpg"),
    options: [
      "Take one tablet twice a day after meals.",
      "Administer the prescribed oral analgesic in accordance with the recommended dosing schedule.",
      "Consume the medication as indicated.",
      "Follow the regimen.",
      "You know what to do with the pills.",
    ],
    answer: 0,
    explanation: "Clear, simple language ensures patient understanding and medication adherence.",
    difficulty: "easy",
  },

  // ── Medical English: Medical Reports ──────────────────────────────────
  {
    prompt: "In a discharge summary, what does the abbreviation 'Dx' stand for?",
    imageUrl: img("en-017-dx.jpg"),
    options: ["Diagnosis", "Discharge", "Dexamethasone", "Diet", "Dexterity"],
    answer: 0,
    explanation: "'Dx' is a widely used medical abbreviation for 'diagnosis'.",
    difficulty: "easy",
  },
  {
    prompt: "A lab report states: 'WBC: 14,200/μL (ref: 4,500–11,000).' What is the correct interpretation?",
    imageUrl: img("en-018-lab-report.jpg"),
    options: [
      "White blood cell count is elevated (leucocytosis)",
      "White blood cell count is within normal range",
      "White blood cell count is critically low",
      "Red blood cell count is abnormal",
      "Haemoglobin level is high",
    ],
    answer: 0,
    explanation: "A WBC above the reference range indicates leucocytosis, often suggesting infection or inflammation.",
    difficulty: "medium",
  },
  {
    prompt: "Choose the correct medical term: 'The patient has ______ — difficulty in swallowing.'",
    imageUrl: img("en-019-dysphagia.jpg"),
    options: ["dysphagia", "dyspnoea", "dysuria", "dyslexia", "dystonia"],
    answer: 0,
    explanation: "'Dysphagia' specifically refers to difficulty swallowing. 'Dyspnoea' is breathing difficulty.",
    difficulty: "medium",
  },

  // ── Reading Comprehension: Abstracts ───────────────────────────────────
  {
    prompt: "Read the following abstract excerpt: 'This double-blind, placebo-controlled trial evaluated the efficacy of Drug X in reducing systolic blood pressure over 12 weeks.' What type of study is described?",
    imageUrl: img("en-020-rct.jpg"),
    options: [
      "Randomised controlled trial",
      "Case report",
      "Cohort study",
      "Systematic review",
      "Cross-sectional survey",
    ],
    answer: 0,
    explanation: "'Double-blind, placebo-controlled trial' is characteristic of a randomised controlled trial (RCT).",
    difficulty: "easy",
  },
  {
    prompt: "An abstract states: 'Results: The intervention group showed a statistically significant reduction in HbA1c compared to the control group (p < 0.01).' What does 'p < 0.01' indicate?",
    imageUrl: img("en-021-p-value.jpg"),
    options: [
      "There is less than a 1% probability the result occurred by chance",
      "The result is clinically irrelevant",
      "The sample size was too small",
      "The study had no control group",
      "The results were not peer-reviewed",
    ],
    answer: 0,
    explanation: "A p-value < 0.01 indicates strong statistical significance, meaning the result is unlikely due to chance.",
    difficulty: "medium",
  },
  {
    prompt: "In a research abstract, the phrase 'further research is warranted' means:",
    imageUrl: img("en-022-warranted.jpg"),
    options: [
      "Additional studies are needed to confirm the findings",
      "The research should be discontinued",
      "The results are conclusive and final",
      "No additional funding is required",
      "The current study is flawed",
    ],
    answer: 0,
    explanation: "'Warranted' means justified or needed; the authors suggest more research is necessary.",
    difficulty: "easy",
  },

  // ── Reading Comprehension: Medical Literature ──────────────────────────
  {
    prompt: "The term 'meta-analysis' in medical literature refers to:",
    imageUrl: img("en-023-meta-analysis.jpg"),
    options: [
      "A statistical technique that combines results from multiple studies",
      "Analysis of a single patient's data",
      "A type of clinical trial",
      "A review of only randomised trials",
      "An analysis of hospital financial data",
    ],
    answer: 0,
    explanation: "A meta-analysis pools data from several studies to produce a single, more precise estimate of effect.",
    difficulty: "medium",
  },
  {
    prompt: "What does the abbreviation 'NNT' stand for in evidence-based medicine?",
    imageUrl: img("en-024-nnt.jpg"),
    options: [
      "Number needed to treat",
      "Net negative test",
      "Nursing notification time",
      "New nuclear therapy",
      "Non-negotiable treatment",
    ],
    answer: 0,
    explanation: "NNT indicates how many patients need to be treated to prevent one additional adverse outcome.",
    difficulty: "medium",
  },
  {
    prompt: "A study abstract concludes: 'The findings are limited by a small sample size and single-centre design.' This statement is an example of:",
    imageUrl: img("en-025-limitations.jpg"),
    options: [
      "Acknowledging study limitations",
      "Presenting results",
      "Describing methodology",
      "Stating the objective",
      "Providing recommendations",
    ],
    answer: 0,
    explanation: "Discussing limitations is a standard section of research papers where authors address weaknesses.",
    difficulty: "easy",
  },

  // ── Reading Comprehension: Clinical Guidelines ─────────────────────────
  {
    prompt: "Clinical guidelines state: 'ACE inhibitors should be offered as first-line therapy for patients with hypertension and diabetes.' The phrase 'first-line therapy' means:",
    imageUrl: img("en-026-first-line.jpg"),
    options: [
      "The preferred initial treatment",
      "The last resort treatment",
      "An experimental treatment",
      "A treatment only for severe cases",
      "A surgical intervention",
    ],
    answer: 0,
    explanation: "'First-line' means the preferred or initial treatment before considering alternatives.",
    difficulty: "easy",
  },
  {
    prompt: "A guideline recommends: 'Thrombolysis should be administered within 45 minutes of arrival for suspected STEMI.' What does STEMI stand for?",
    imageUrl: img("en-027-stemi.jpg"),
    options: [
      "ST-Elevation Myocardial Infarction",
      "Severe Tissue Embolism and Myocardial Injury",
      "Subacute Thromboembolic Mesenteric Ischaemia",
      "Systemic Total Erythrocyte Mass Index",
      "Syndrome of Terminal Endothelial Microinfarction",
    ],
    answer: 0,
    explanation: "STEMI is a serious type of heart attack where a major coronary artery is completely blocked.",
    difficulty: "medium",
  },
  {
    prompt: "In a clinical pathway document, 'contraindications' refers to:",
    imageUrl: img("en-028-contraindications.jpg"),
    options: [
      "Conditions under which a treatment should NOT be used",
      "Situations where a treatment is especially effective",
      "Optional additional treatments",
      "Side effects of a medication",
      "Patient consent requirements",
    ],
    answer: 0,
    explanation: "Contraindications are specific situations where a drug or procedure should be avoided.",
    difficulty: "easy",
  },
  {
    prompt: "A clinical guideline states: 'Strong recommendation, moderate-quality evidence.' In the GRADE system, this means:",
    imageUrl: img("en-029-grade.jpg"),
    options: [
      "Most patients should receive the intervention, though future research may change confidence",
      "The recommendation is weak and should be ignored",
      "There is no evidence to support any action",
      "Only specialists should follow this recommendation",
      "The guideline is not endorsed by any organisation",
    ],
    answer: 0,
    explanation: "In GRADE, a strong recommendation with moderate evidence means clinicians should usually follow it.",
    difficulty: "hard",
  },
  {
    prompt: "The phrase 'the evidence is extrapolated from' in a clinical guideline means:",
    imageUrl: img("en-030-extrapolated.jpg"),
    options: [
      "The conclusions are drawn from related but not directly applicable studies",
      "The evidence is fabricated",
      "The studies were conducted in the same hospital",
      "The results are from a single patient",
      "The data has been deleted",
    ],
    answer: 0,
    explanation: "'Extrapolated' means inferred or extended from existing evidence to a slightly different context.",
    difficulty: "medium",
  },
];
