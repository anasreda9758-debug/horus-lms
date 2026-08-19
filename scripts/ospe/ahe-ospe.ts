import type { SeedQuestion } from "../seed-utils";

/**
 * OSPE AHE-101 Question Bank — 30 clinical MCQs
 * Module: Anatomy, Embryology & Histology
 * Style: "Identify the structure", "Name this tissue", "What stage of development is shown?"
 * imageUrl points to the OSPE image API (user uploads real images later)
 */

function img(file: string): string {
  return `/api/content/ospe/image?folder=AEH&file=${encodeURIComponent(file)}`;
}

export const questions: SeedQuestion[] = [
  // ─────────────────────────────────────────────────────────
  //  GROSS ANATOMY — Bones, Muscles, Nerves, Vessels, Organs (10 questions)
  // ─────────────────────────────────────────────────────────
  {
    prompt: "Identify the bone indicated by the arrow on this radiograph of the upper limb.",
    imageUrl: img("ahe-001-humerus-xray.jpg"),
    options: ["Humerus", "Radius", "Ulna", "Clavicle", "Scapula"],
    answer: 0,
    explanation: "The humerus is the single bone of the upper arm, articulating with the scapula at the shoulder and the radius and ulna at the elbow.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this muscle on the anterior aspect of the forearm that flexes the wrist.",
    imageUrl: img("ahe-002-flexor-carpi-radialis.jpg"),
    options: ["Flexor carpi radialis", "Palmaris longus", "Flexor carpi ulnaris", "Brachioradialis", "Pronator teres"],
    answer: 0,
    explanation: "The flexor carpi radialis lies lateral to the palmaris longus and flexes and abducts the wrist.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this nerve as it emerges between the heads of the trapezius to innervate the supraspinatus and infraspinatus.",
    imageUrl: img("ahe-003-suprascapular-nerve.jpg"),
    options: ["Suprascapular nerve", "Axillary nerve", "Long thoracic nerve", "Thoracodorsal nerve", "Subscapular nerve"],
    answer: 0,
    explanation: "The suprascapular nerve passes through the suprascapular notch and innervates the supraspinatus and infraspinatus muscles.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this artery that is the first branch of the brachiocephalic trunk.",
    imageUrl: img("ahe-004-right-subclavian-artery.jpg"),
    options: ["Right subclavian artery", "Right common carotid artery", "Left subclavian artery", "Internal thoracic artery", "Vertebral artery"],
    answer: 0,
    explanation: "The brachiocephalic trunk bifurcates into the right common carotid and right subclavian arteries; the right subclavian is the larger terminal branch.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this organ shown in the dissection, located in the right hypochondriac region inferior to the diaphragm.",
    imageUrl: img("ahe-005-liver.jpg"),
    options: ["Liver", "Spleen", "Right kidney", "Gallbladder", "Duodenum"],
    answer: 0,
    explanation: "The liver is the largest internal organ, situated in the right hypochondrium beneath the diaphragm with its right dome reaching the fifth intercostal space.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this triangle of the neck bounded by the omohyoid, sternocleidomastoid, and the posterior belly of the digastric.",
    imageUrl: img("ahe-006-carotid-triangle.jpg"),
    options: ["Carotid triangle", "Submandibular triangle", "Submental triangle", "Muscular triangle", "Occipital triangle"],
    answer: 0,
    explanation: "The carotid triangle contains the common carotid artery, internal jugular vein, and cranial nerves IX, X, and XII.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this muscle of the posterior abdominal wall that forms the floor of the lumbar triangle.",
    imageUrl: img("ahe-007-quadratus-lumborum.jpg"),
    options: ["Quadratus lumborum", "Psoas major", "Iliacus", "Serratus posterior inferior", "Erector spinae"],
    answer: 0,
    explanation: "The quadratus lumborum is a deep posterior abdominal wall muscle that laterally flexes the vertebral column and stabilizes the 12th rib during respiration.",
    difficulty: "hard",
  },
  {
    prompt: "Identify this nerve as it exits the pelvis through the greater sciatic foramen, inferior to the piriformis.",
    imageUrl: img("ahe-008-sciatic-nerve.jpg"),
    options: ["Sciatic nerve", "Superior gluteal nerve", "Inferior gluteal nerve", "Pudendal nerve", "Obturator nerve"],
    answer: 0,
    explanation: "The sciatic nerve is the largest nerve in the body, emerging below the piriformis through the greater sciatic foramen and innervating the posterior thigh and leg.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this structure on the medial surface of the mandible, a key landmark for the mental nerve.",
    imageUrl: img("ahe-009-mental-foramen.jpg"),
    options: ["Mental foramen", "Mandibular foramen", "Inferior alveolar foramen", "Greater palatine foramen", "Zygomaticofacial foramen"],
    answer: 0,
    explanation: "The mental foramen transmits the mental nerve and vessels, emerging on the anterior surface of the mandible below the second premolar.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this vessel that accompanies the median nerve through the carpal tunnel.",
    imageUrl: img("ahe-010-ulnar-artery.jpg"),
    options: ["Ulnar artery", "Radial artery", "Anterior interosseous artery", "Posterior interosseous artery", "Common interosseous artery"],
    answer: 0,
    explanation: "The ulnar artery passes through the carpal tunnel alongside the ulnar nerve (deep to the flexor retinaculum) to form the superficial palmar arch.",
    difficulty: "hard",
  },

  // ─────────────────────────────────────────────────────────
  //  HISTOLOGY — Tissue Identification, Epithelium, Connective Tissue,
  //  Muscle Types, Nervous Tissue (10 questions)
  // ─────────────────────────────────────────────────────────
  {
    prompt: "Name this tissue type characterized by a single layer of tall, column-shaped cells with basal nuclei.",
    imageUrl: img("ahe-011-simple-columnar-epithelium.jpg"),
    options: ["Simple columnar epithelium", "Simple cuboidal epithelium", "Stratified squamous epithelium", "Pseudostratified columnar epithelium", "Simple squamous epithelium"],
    answer: 0,
    explanation: "Simple columnar epithelium lines the gastrointestinal tract and has a single layer of tall cells with basally located nuclei, often with microvilli or goblet cells.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this type of cartilage found in the tracheal rings, characterized by glassy matrix and chondrocytes in lacunae.",
    imageUrl: img("ahe-012-hyaline-cartilage.jpg"),
    options: ["Hyaline cartilage", "Elastic cartilage", "Fibrocartilage", "Osseous tissue", "Adipose tissue"],
    answer: 0,
    explanation: "Hyaline cartilage has a smooth, glassy matrix rich in type II collagen and proteoglycans, found in trachea, costal cartilages, and articular surfaces.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this muscle tissue type characterized by involuntary, spindle-shaped cells with central nuclei and no striations.",
    imageUrl: img("ahe-013-smooth-muscle.jpg"),
    options: ["Smooth muscle", "Skeletal muscle", "Cardiac muscle", "Myoepithelial cells", "Myofibroblasts"],
    answer: 0,
    explanation: "Smooth muscle is involuntary, non-striated, and found in the walls of hollow organs; cells are fusiform with a single central nucleus.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this nervous tissue cell that provides myelination in the peripheral nervous system.",
    imageUrl: img("ahe-014-schwann-cell.jpg"),
    options: ["Schwann cell", "Oligodendrocyte", "Astrocyte", "Microglia", "Ependymal cell"],
    answer: 0,
    explanation: "Schwann cells form the myelin sheath around axons in the PNS, with each cell myelinating a single internode of one axon.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this dense regular connective tissue forming the core of a tendon on this H&E section.",
    imageUrl: img("ahe-015-dense-regular-ct.jpg"),
    options: ["Dense regular connective tissue", "Dense irregular connective tissue", "Reticular connective tissue", "Areolar connective tissue", "Elastic connective tissue"],
    answer: 0,
    explanation: "Dense regular CT consists of closely packed parallel collagen fibers with fibroblasts (tenocytes) squeezed between them, providing tensile strength along one axis.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this specialized stratified epithelium that lines the urinary bladder and can stretch.",
    imageUrl: img("ahe-016-transitional-epithelium.jpg"),
    options: ["Transitional epithelium (urothelium)", "Stratified squamous non-keratinized epithelium", "Stratified cuboidal epithelium", "Pseudostratified columnar epithelium", "Simple squamous epithelium"],
    answer: 0,
    explanation: "Transitional epithelium (urothelium) has dome-shaped surface cells when relaxed and flattens when distended, providing a permeability barrier in the urinary tract.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this type of bone tissue seen in cross-section showing concentric lamellae around a central canal.",
    imageUrl: img("ahe-017-compact-bone-haversian.jpg"),
    options: ["Compact bone (osteon)", "Spongy bone (trabecular)", "Woven bone", "Endosteum", "Periosteum"],
    answer: 0,
    explanation: "Compact bone is organized into osteons (Haversian systems) with concentric lamellae surrounding a central Haversian canal containing blood vessels.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this type of epithelium with cilia on the apical surface and goblet cells, found in the respiratory tract.",
    imageUrl: img("ahe-018-pseudostratified-ciliated.jpg"),
    options: ["Pseudostratified ciliated columnar epithelium", "Simple columnar epithelium", "Stratified columnar epithelium", "Ciliated simple cuboidal epithelium", "Transitional epithelium"],
    answer: 0,
    explanation: "Pseudostratified ciliated columnar epithelium lines the respiratory tract and appears stratified due to nuclei at different levels, but all cells contact the basement membrane.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this type of connective tissue characterized by a loose arrangement of fibers and abundant ground substance, found beneath epithelia.",
    imageUrl: img("ahe-019-areolar-ct.jpg"),
    options: ["Areolar connective tissue", "Adipose tissue", "Reticular connective tissue", "Dense irregular connective tissue", "Elastic connective tissue"],
    answer: 0,
    explanation: "Areolar CT is a loose CT with all three fiber types (collagen, elastic, reticular) and various cell types in a semi-fluid ground substance, serving as a universal packing tissue.",
    difficulty: "easy",
  },
  {
    prompt: "Identify this neuron type based on its multipolar morphology with numerous dendrites extending from the cell body.",
    imageUrl: img("ahe-020-multipolar-neuron.jpg"),
    options: ["Multipolar neuron", "Bipolar neuron", "Unipolar (pseudounipolar) neuron", "Anaxonic neuron", "Pyramidal neuron"],
    answer: 0,
    explanation: "Multipolar neurons have one axon and multiple dendrites and are the most common type, found throughout the CNS (e.g., motor neurons, pyramidal cells).",
    difficulty: "medium",
  },

  // ─────────────────────────────────────────────────────────
  //  EMBRYOLOGY — Developmental Stages, Fetal Structures, Congenital Anomalies (10 questions)
  // ─────────────────────────────────────────────────────────
  {
    prompt: "What stage of embryonic development is shown? The image displays a bilaminar embryonic disc.",
    imageUrl: img("ahe-021-bilaminar-disc.jpg"),
    options: ["Week 2 — bilaminar disc (epiblast and hypoblast)", "Week 3 — trilaminar disc", "Week 1 — implantation", "Week 4 — gastrulation complete", "Week 8 — organogenesis complete"],
    answer: 0,
    explanation: "During week 2, the inner cell mass differentiates into the epiblast and hypoblast, forming the bilaminar embryonic disc.",
    difficulty: "medium",
  },
  {
    prompt: "Identify this embryological structure that connects the midgut to the yolk sac.",
    imageUrl: img("ahe-022-vitelline-duct.jpg"),
    options: ["Vitelline duct (omphalomesenteric duct)", "Allantois", "Urachus", "Hypoblastic cord", "Cloacal membrane"],
    answer: 0,
    explanation: "The vitelline duct connects the midgut to the yolk sac; its persistent remnant can form a Meckel diverticulum (the most common congenital anomaly of the GI tract).",
    difficulty: "medium",
  },
  {
    prompt: "Identify this structure that is the embryological origin of the notochord in the trilaminar disc.",
    imageUrl: img("ahe-023-notochord.jpg"),
    options: ["Notochord", "Neural plate", "Primitive streak", "Somite", "Lateral plate mesoderm"],
    answer: 0,
    explanation: "The notochord is a defining structure of chordates, inducing the overlying ectoderm to form the neural plate (neural induction) and persisting as the nucleus pulposus.",
    difficulty: "medium",
  },
  {
    prompt: "What is the most likely diagnosis? This newborn presents with a protrusion of abdominal contents through the umbilical ring.",
    imageUrl: img("ahe-024-omphalocele.jpg"),
    options: ["Omphalocele", "Gastroschisis", "Umbilical hernia", "Ventral hernia", "Diaphragmatic hernia"],
    answer: 0,
    explanation: "An omphalocele is a congenital herniation of abdominal contents through the umbilical ring, covered by a peritoneal-amniotic membrane, resulting from failure of midgut return.",
    difficulty: "hard",
  },
  {
    prompt: "Identify this fetal structure that shunts blood from the pulmonary artery directly to the aorta.",
    imageUrl: img("ahe-025-ductus-arteriosus.jpg"),
    options: ["Ductus arteriosus", "Ductus venosus", "Foramen ovale", "Umbilical artery", "Umbilical vein"],
    answer: 0,
    explanation: "The ductus arteriosus connects the pulmonary artery to the aorta, diverting blood away from the non-functional fetal lungs; it closes to become the ligamentum arteriosum.",
    difficulty: "medium",
  },
  {
    prompt: "What is the most likely diagnosis? This infant has failure of the posterior neural tube to close, resulting in a sac-like protrusion.",
    imageUrl: img("ahe-026-meningomyelocele.jpg"),
    options: ["Meningomyelocele (spina bifida cystica)", "Anencephaly", "Encephalocele", "Craniorachischisis", "Spina bifida occulta"],
    answer: 0,
    explanation: "Meningomyelocele is a severe form of spina bifida where the meninges and spinal cord herniate through a vertebral arch defect, typically in the lumbosacral region.",
    difficulty: "hard",
  },
  {
    prompt: "Identify this fetal circulatory structure that carries oxygenated blood from the placenta to the fetus.",
    imageUrl: img("ahe-027-umbilical-vein.jpg"),
    options: ["Umbilical vein", "Umbilical artery", "Ductus venosus", "Inferior vena cava", "Portal vein"],
    answer: 0,
    explanation: "The umbilical vein carries oxygenated, nutrient-rich blood from the placenta to the fetus; after birth it becomes the ligamentum teres (round ligament of the liver).",
    difficulty: "medium",
  },
  {
    prompt: "Identify this embryological structure that gives rise to most of the connective tissue of the face and neck.",
    imageUrl: img("ahe-028-pharyngeal-arch.jpg"),
    options: ["Pharyngeal (branchial) arch", "Somite", "Neural crest", "Somatopleure", "Splanchnopleure"],
    answer: 0,
    explanation: "Pharyngeal arches are mesenchymal bars that give rise to jaw bones, middle ear ossicles, and facial musculature, with neural crest contributing to the skeletal components.",
    difficulty: "medium",
  },
  {
    prompt: "What is the most likely diagnosis? Newborn presents with bilious vomiting due to failure of rotation of the midgut.",
    imageUrl: img("ahe-029-midgut-volvulus.jpg"),
    options: ["Midgut volvulus (malrotation)", "Duodenal atresia", "Hirschsprung disease", "Meconium ileus", "Imperforate anus"],
    answer: 0,
    explanation: "Failure of the normal 270-degree counterclockwise rotation of the midgut can result in volvulus, causing bilious vomiting and risk of bowel ischemia.",
    difficulty: "hard",
  },
  {
    prompt: "Identify this structure that forms the earliest visible cardiac chamber in the embryonic heart tube.",
    imageUrl: img("ahe-030-primitive-ventricle.jpg"),
    options: ["Primitive ventricle", "Primitive atrium", "Sinus venosus", "Bulbus cordis", "Conus arteriosus"],
    answer: 0,
    explanation: "The primitive ventricle is the most prominent chamber of the early heart tube and gives rise to the left ventricle; the bulbus cordis contributes to the right ventricle.",
    difficulty: "hard",
  },
];
