import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/shared/db";
import { ospeAnswerKey, ospeRubric } from "../src/features/ospe/schema";

/**
 * Seed native OSPE answer key placeholders based on topics extracted from
 * Microsoft Forms (CVS 179 stations, Resp 51 stations).
 *
 * Each entry has:
 *   - A placeholder fileName (user replaces with real image later)
 *   - The folder (module code)
 *   - An empty diagnosis (user fills in)
 *   - An identification hint describing what the image should show
 *
 * Usage:  npx tsx scripts/seed-ospe-stations.ts
 * Overwrite: SEED_OVERWRITE=1 npx tsx scripts/seed-ospe-stations.ts
 */

type Station = {
  folder: string;
  fileName: string;
  identification: string;
  findings?: string;
};

// ── CVS Stations (179 extracted from form) ──────────────────────────────
const CVS_STATIONS: Station[] = [
  // ── Anatomy (50) ──
  { folder: "CVS", fileName: "cvs-anatomy-001-nerve-identification.jpg", identification: "Identify the marked nerve in the mediastinum" },
  { folder: "CVS", fileName: "cvs-anatomy-002-conducting-system-sa-node.jpg", identification: "Identify this part of the cardiac conducting system" },
  { folder: "CVS", fileName: "cvs-anatomy-003-vessel-superior-vena-cava.jpg", identification: "Identify this major vessel" },
  { folder: "CVS", fileName: "cvs-anatomy-004-vessel-inferior-vena-cava.jpg", identification: "Identify this major vessel" },
  { folder: "CVS", fileName: "cvs-anatomy-005-vessel-aorta.jpg", identification: "Identify this major vessel" },
  { folder: "CVS", fileName: "cvs-anatomy-006-conducting-system-av-node.jpg", identification: "Identify this part of the cardiac conducting system" },
  { folder: "CVS", fileName: "cvs-anatomy-007-conducting-system-purkinje.jpg", identification: "Identify this part of the cardiac conducting system" },
  { folder: "CVS", fileName: "cvs-anatomy-008-conducting-system-av-bundle.jpg", identification: "Identify this part of the cardiac conducting system" },
  { folder: "CVS", fileName: "cvs-anatomy-009-valve-pulmonary.jpg", identification: "Identify this heart valve" },
  { folder: "CVS", fileName: "cvs-anatomy-010-valve-aortic.jpg", identification: "Identify this heart valve" },
  { folder: "CVS", fileName: "cvs-anatomy-011-valve-tricuspid.jpg", identification: "Identify this heart valve" },
  { folder: "CVS", fileName: "cvs-anatomy-012-valve-mitral.jpg", identification: "Identify this heart valve" },
  { folder: "CVS", fileName: "cvs-anatomy-013-structure-trabeculae-carneae.jpg", identification: "Identify this internal heart structure" },
  { folder: "CVS", fileName: "cvs-anatomy-014-structure-papillary-muscle.jpg", identification: "Identify this internal heart structure" },
  { folder: "CVS", fileName: "cvs-anatomy-015-structure-fossa-ovalis.jpg", identification: "Identify this structure in the interatrial septum" },
  { folder: "CVS", fileName: "cvs-anatomy-016-structure-chordae-tendineae.jpg", identification: "Identify this structure connecting papillary muscles to valve cusps" },
  { folder: "CVS", fileName: "cvs-anatomy-017-organ-esophagus.jpg", identification: "Identify this organ in the posterior mediastinum" },
  { folder: "CVS", fileName: "cvs-anatomy-018-organ-lung.jpg", identification: "Identify this organ" },
  { folder: "CVS", fileName: "cvs-anatomy-019-organ-liver.jpg", identification: "Identify this organ" },
  { folder: "CVS", fileName: "cvs-anatomy-020-nerve-phrenic.jpg", identification: "Identify the nerve running along the pericardium" },
  { folder: "CVS", fileName: "cvs-anatomy-021-nerve-recurrent-laryngeal.jpg", identification: "Identify this nerve in the mediastinum" },
  { folder: "CVS", fileName: "cvs-anatomy-022-vessel-coronary-left-anterior-descending.jpg", identification: "Identify this coronary artery" },
  { folder: "CVS", fileName: "cvs-anatomy-023-vessel-coronary-right.jpg", identification: "Identify this coronary artery" },
  { folder: "CVS", fileName: "cvs-anatomy-024-vessel-coronary-circumflex.jpg", identification: "Identify this coronary artery" },
  { folder: "CVS", fileName: "cvs-anatomy-025-vessel-pulmonary-artery.jpg", identification: "Identify this vessel leaving the right ventricle" },
  { folder: "CVS", fileName: "cvs-anatomy-026-vessel-pulmonary-vein.jpg", identification: "Identify this vessel entering the left atrium" },
  { folder: "CVS", fileName: "cvs-anatomy-027-pericardium-fibrous.jpg", identification: "Identify this layer covering the heart" },
  { folder: "CVS", fileName: "cvs-anatomy-028-pericardium-serous.jpg", identification: "Identify this layer of the pericardium" },
  { folder: "CVS", fileName: "cvs-anatomy-029-wall-left-ventricle.jpg", identification: "Identify the chamber with the thickest wall" },
  { folder: "CVS", fileName: "cvs-anatomy-030-wall-right-ventricle.jpg", identification: "Identify this cardiac chamber" },
  { folder: "CVS", fileName: "cvs-anatomy-031-septum-interventricular.jpg", identification: "Identify this structure separating the ventricles" },
  { folder: "CVS", fileName: "cvs-anatomy-032-septum-interatrial.jpg", identification: "Identify this structure separating the atria" },
  { folder: "CVS", fileName: "cvs-anatomy-033-vein-cardiac-great.jpg", identification: "Identify this vein draining into the right atrium" },
  { folder: "CVS", fileName: "cvs-anatomy-034-artery-brachiocephalic.jpg", identification: "Identify this branch of the aortic arch" },
  { folder: "CVS", fileName: "cvs-anatomy-035-artery-common-carotid.jpg", identification: "Identify this artery in the neck" },
  { folder: "CVS", fileName: "cvs-anatomy-036-artery-subclavian.jpg", identification: "Identify this artery passing under the clavicle" },
  { folder: "CVS", fileName: "cvs-anatomy-037-vein-jugular-internal.jpg", identification: "Identify this large vein in the neck" },
  { folder: "CVS", fileName: "cvs-anatomy-038-lymph-node-mediastinal.jpg", identification: "Identify this structure in the mediastinum" },
  { folder: "CVS", fileName: "cvs-anatomy-039-thymus-gland.jpg", identification: "Identify this organ in the anterior mediastinum" },
  { folder: "CVS", fileName: "cvs-anatomy-040-nerve-vagus.jpg", identification: "Identify this nerve in the thorax" },
  { folder: "CVS", fileName: "cvs-anatomy-041-vessel-descending-aorta.jpg", identification: "Identify this continuation of the aorta" },
  { folder: "CVS", fileName: "cvs-anatomy-042-vessel-hemiazygos.jpg", identification: "Identify this vein on the left side of the thorax" },
  { folder: "CVS", fileName: "cvs-anatomy-043-vessel-azygos.jpg", identification: "Identify this vein draining the thoracic wall" },
  { folder: "CVS", fileName: "cvs-anatomy-044-structure-diaphragm-central-tendon.jpg", identification: "Identify this part of the diaphragm" },
  { folder: "CVS", fileName: "cvs-anatomy-045-organ-thymus-histology.jpg", identification: "Identify this organ based on its histological appearance" },
  { folder: "CVS", fileName: "cvs-anatomy-046-vessel-cardiac-vein-great.jpg", identification: "Identify this vein on the surface of the heart" },
  { folder: "CVS", fileName: "cvs-anatomy-047-structure-moderator-band.jpg", identification: "Identify this structure in the right ventricle" },
  { folder: "CVS", fileName: "cvs-anatomy-048-artery-coronary-sinus-opening.jpg", identification: "Identify this opening in the right atrium" },
  { folder: "CVS", fileName: "cvs-anatomy-049-structure-crista-terminalis.jpg", identification: "Identify this ridge in the right atrium" },
  { folder: "CVS", fileName: "cvs-anatomy-050-structure-columnae-carneae.jpg", identification: "Identify these muscular ridges in the ventricles" },

  // ── Histology (30) ──
  { folder: "CVS", fileName: "cvs-histo-001-tunica-intima.jpg", identification: "Identify this layer of a large artery" },
  { folder: "CVS", fileName: "cvs-histo-002-tunica-media.jpg", identification: "Identify this layer of a large artery (Aorta)" },
  { folder: "CVS", fileName: "cvs-histo-003-tunica-adventitia.jpg", identification: "Identify this outer layer of a blood vessel" },
  { folder: "CVS", fileName: "cvs-histo-004-cardiac-muscle-cross-section.jpg", identification: "Identify this tissue type" },
  { folder: "CVS", fileName: "cvs-histo-005-cardiac-muscle-longitudinal.jpg", identification: "Identify this tissue and its key features" },
  { folder: "CVS", fileName: "cvs-histo-006-intercalated-discs.jpg", identification: "Identify these structures between cardiac muscle cells" },
  { folder: "CVS", fileName: "cvs-histo-007-purkinje-fibers-histology.jpg", identification: "Identify these specialized cardiac muscle fibers" },
  { folder: "CVS", fileName: "cvs-histo-008-elastic-artery-histology.jpg", identification: "Identify this type of blood vessel based on its wall structure" },
  { folder: "CVS", fileName: "cvs-histo-009-muscular-artery-histology.jpg", identification: "Identify this type of blood vessel" },
  { folder: "CVS", fileName: "cvs-histo-010-arteriole-histology.jpg", identification: "Identify this small blood vessel" },
  { folder: "CVS", fileName: "cvs-histo-011-capillary-histology.jpg", identification: "Identify this smallest blood vessel" },
  { folder: "CVS", fileName: "cvs-histo-012-venule-histology.jpg", identification: "Identify this small blood vessel" },
  { folder: "CVS", fileName: "cvs-histo-013-vein-histology.jpg", identification: "Identify this blood vessel based on its wall thickness" },
  { folder: "CVS", fileName: "cvs-histo-014-endocardium-histology.jpg", identification: "Identify this layer lining the heart chambers" },
  { folder: "CVS", fileName: "cvs-histo-015-myocardium-histology.jpg", identification: "Identify this thick muscular layer of the heart" },
  { folder: "CVS", fileName: "cvs-histo-016-epicardium-histology.jpg", identification: "Identify this outermost layer of the heart" },
  { folder: "CVS", fileName: "cvs-histo-017-sa-node-histology.jpg", identification: "Identify this specialized cardiac tissue" },
  { folder: "CVS", fileName: "cvs-histo-018-av-node-histology.jpg", identification: "Identify this specialized cardiac tissue" },
  { folder: "CVS", fileName: "cvs-histo-019-aortic-valve-histology.jpg", identification: "Identify this heart valve based on its histological structure" },
  { folder: "CVS", fileName: "cvs-histo-020-coronary-artery-histology.jpg", identification: "Identify this coronary vessel" },
  { folder: "CVS", fileName: "cvs-histo-021-cardiac-nerve-histology.jpg", identification: "Identify this structure in the cardiac tissue" },
  { folder: "CVS", fileName: "cvs-histo-022-pericardial-mesothelium.jpg", identification: "Identify this tissue lining the pericardium" },
  { folder: "CVS", fileName: "cvs-histo-023-atherosclerotic-plaque-histology.jpg", identification: "Identify this pathological change in an artery" },
  { folder: "CVS", fileName: "cvs-histo-024-amyloid-deposition-heart.jpg", identification: "Identify this abnormal deposit in cardiac tissue" },
  { folder: "CVS", fileName: "cvs-histo-025-hemosiderin-heart.jpg", identification: "Identify this pigment in cardiac macrophages" },
  { folder: "CVS", fileName: "cvs-histo-026-cardiac-fibrosis-histology.jpg", identification: "Identify this pathological change in the myocardium" },
  { folder: "CVS", fileName: "cvs-histo-027-aschoff-body.jpg", identification: "Identify this pathognomonic lesion" },
  { folder: "CVS", fileName: "cvs-histo-028-anitschkow-cell.jpg", identification: "Identify this characteristic cell (caterpillar cell)" },
  { folder: "CVS", fileName: "cvs-histo-029-vascular-endothelium.jpg", identification: "Identify this cell type lining blood vessels" },
  { folder: "CVS", fileName: "cvs-histo-030-cardiac-myocyte-nucleus.jpg", identification: "Identify this feature of cardiac muscle histology" },

  // ── Pathology (60) ──
  { folder: "CVS", fileName: "cvs-patho-001-mi-wavy-fibers-1-3-hours.jpg", identification: "Identify the stage of myocardial infarction" },
  { folder: "CVS", fileName: "cvs-patho-002-mi-coagulative-necrosis-1-3-days.jpg", identification: "Identify the stage of myocardial infarction" },
  { folder: "CVS", fileName: "cvs-patho-003-mi-neutrophilic-infiltration-3-7-days.jpg", identification: "Identify the stage of myocardial infarction (recent, 3-7 days)" },
  { folder: "CVS", fileName: "cvs-patho-004-mi-macrophage-infiltration-7-10-days.jpg", identification: "Identify the stage of myocardial infarction" },
  { folder: "CVS", fileName: "cvs-patho-005-mi-granulation-tissue-10-14-days.jpg", identification: "Identify the stage of myocardial infarction" },
  { folder: "CVS", fileName: "cvs-patho-006-mi-collagenous-scar-2-weeks.jpg", identification: "Identify the stage of myocardial infarction" },
  { folder: "CVS", fileName: "cvs-patho-007-mi-healed-remote.jpg", identification: "Identify this healed myocardial infarction" },
  { folder: "CVS", fileName: "cvs-patho-008-atherosclerosis-fibrofatty-plaque.jpg", identification: "Identify the stage/type of atherosclerosis (mild to moderate)" },
  { folder: "CVS", fileName: "cvs-patho-009-atherosclerosis-complicated-plaque.jpg", identification: "Identify this advanced atherosclerotic lesion" },
  { folder: "CVS", fileName: "cvs-patho-010-aortic-dissection.jpg", identification: "Identify this aortic pathology" },
  { folder: "CVS", fileName: "cvs-patho-011-hypertensive-hemorrhage-brain.jpg", identification: "Identify this cerebrovascular pathology" },
  { folder: "CVS", fileName: "cvs-patho-012-vegetation-endocarditis.jpg", identification: "Identify this lesion on a heart valve" },
  { folder: "CVS", fileName: "cvs-patho-013-libman-sacks-endocarditis.jpg", identification: "Identify this type of endocarditis" },
  { folder: "CVS", fileName: "cvs-patho-014-dilated-cardiomyopathy.jpg", identification: "Identify this type of cardiomyopathy" },
  { folder: "CVS", fileName: "cvs-patho-015-hypertrophic-cardiomyopathy.jpg", identification: "Identify this type of cardiomyopathy" },
  { folder: "CVS", fileName: "cvs-patho-016-restrictive-cardiomyopathy.jpg", identification: "Identify this type of cardiomyopathy" },
  { folder: "CVS", fileName: "cvs-patho-017-chronic-pericarditis.jpg", identification: "Identify this pericardial pathology" },
  { folder: "CVS", fileName: "cvs-patho-018-cardiac-tamponade.jpg", identification: "Identify this emergency condition" },
  { folder: "CVS", fileName: "cvs-patho-019-constrictive-pericarditis.jpg", identification: "Identify this chronic pericardial condition" },
  { folder: "CVS", fileName: "cvs-patho-020-atheroma-gross.jpg", identification: "Identify this gross pathology of an artery" },
  { folder: "CVS", fileName: "cvs-patho-021-thrombus-gross.jpg", identification: "Identify this intravascular lesion" },
  { folder: "CVS", fileName: "cvs-patho-022-embolus-pulmonary.jpg", identification: "Identify this cause of sudden death" },
  { folder: "CVS", fileName: "cvs-patho-023-infarction-spleen.jpg", identification: "Identify this type of organ infarction" },
  { folder: "CVS", fileName: "cvs-patho-024-infarction-kidney.jpg", identification: "Identify this renal pathology" },
  { folder: "CVS", fileName: "cvs-patho-025-infarction-lung.jpg", identification: "Identify this pulmonary pathology" },
  { folder: "CVS", fileName: "cvs-patho-026-rheumatic-heart-aschoff.jpg", identification: "Identify this lesion in rheumatic heart disease" },
  { folder: "CVS", fileName: "cvs-patho-027-syphilitic-aortitis.jpg", identification: "Identify this aortic pathology" },
  { folder: "CVS", fileName: "cvs-patho-028-aneurysm-abdominal-aorta.jpg", identification: "Identify this aortic pathology" },
  { folder: "CVS", fileName: "cvs-patho-029-varicose-veins.jpg", identification: "Identify this venous pathology" },
  { folder: "CVS", fileName: "cvs-patho-030-thrombophlebitis.jpg", identification: "Identify this inflammatory venous condition" },
  { folder: "CVS", fileName: "cvs-patho-031-myocarditis-lymphocytic.jpg", identification: "Identify this inflammatory heart condition" },
  { folder: "CVS", fileName: "cvs-patho-032-myocarditis-giant-cell.jpg", identification: "Identify this rare type of myocarditis" },
  { folder: "CVS", fileName: "cvs-patho-033-cardiac-rhabdomyoma.jpg", identification: "Identify this cardiac tumor" },
  { folder: "CVS", fileName: "cvs-patho-034-cardiac-myxoma.jpg", identification: "Identify this common primary cardiac tumor" },
  { folder: "CVS", fileName: "cvs-patho-035-angiosarcoma-heart.jpg", identification: "Identify this malignant cardiac tumor" },
  { folder: "CVS", fileName: "cvs-patho-036-metastatic-tumor-heart.jpg", identification: "Identify this secondary cardiac involvement" },
  { folder: "CVS", fileName: "cvs-patho-037-cardiac-amyloidosis.jpg", identification: "Identify this infiltrative cardiomyopathy" },
  { folder: "CVS", fileName: "cvs-patho-038-cardiac-sarcoidosis.jpg", identification: "Identify this granulomatous heart disease" },
  { folder: "CVS", fileName: "cvs-patho-039-hemochromatosis-heart.jpg", identification: "Identify this metabolic cardiomyopathy" },
  { folder: "CVS", fileName: "cvs-patho-040-endomyocardial-fibrosis.jpg", identification: "Identify this restrictive cardiomyopathy" },
  { folder: "CVS", fileName: "cvs-patho-041-arteritis-giant-cell.jpg", identification: "Identify this large vessel vasculitis" },
  { folder: "CVS", fileName: "cvs-patho-042-polyarteritis-nodosa.jpg", identification: "Identify this medium vessel vasculitis" },
  { folder: "CVS", fileName: "cvs-patho-043 Kawasaki-disease.jpg", identification: "Identify this vasculitis affecting coronary arteries" },
  { folder: "CVS", fileName: "cvs-patho-044-buerger-disease.jpg", identification: "Identify this thromboangiitis obliterans" },
  { folder: "CVS", fileName: "cvs-patho-045-raynaud-phenomenon.jpg", identification: "Identify this vascular phenomenon" },
  { folder: "CVS", fileName: "cvs-patho-046-deep-vein-thrombosis.jpg", identification: "Identify this venous thrombosis" },
  { folder: "CVS", fileName: "cvs-patho-047-pulmonary-embolism-gross.jpg", identification: "Identify this fatal pulmonary condition" },
  { folder: "CVS", fileName: "cvs-patho-048-mediastinal-mass.jpg", identification: "Identify this anterior mediastinal mass" },
  { folder: "CVS", fileName: "cvs-patho-049-thymoma.jpg", identification: "Identify this anterior mediastinal tumor" },
  { folder: "CVS", fileName: "cvs-patho-050-lymphoma-mediastinal.jpg", identification: "Identify this mediastinal malignancy" },
  { folder: "CVS", fileName: "cvs-patho-051-silicosis-nodes.jpg", identification: "Identify this occupational lung disease with mediastinal involvement" },
  { folder: "CVS", fileName: "cvs-patho-052-atherosclerosis-complicated-hemorrhage.jpg", identification: "Identify this complication of atherosclerosis" },
  { folder: "CVS", fileName: "cvs-patho-053-atherosclerosis-thrombosis.jpg", identification: "Identify this acute vascular event" },
  { folder: "CVS", fileName: "cvs-patho-054-atherosclerosis-calcification.jpg", identification: "Identify this late-stage atherosclerotic change" },
  { folder: "CVS", fileName: "cvs-patho-055-atherosclerosis-ulceration.jpg", identification: "Identify this unstable atherosclerotic plaque" },
  { folder: "CVS", fileName: "cvs-patho-056-atherosclerosis-aneurysm.jpg", identification: "Identify this consequence of atherosclerosis" },
  { folder: "CVS", fileName: "cvs-patho-057-mi-transmural.jpg", identification: "Identify this type of myocardial infarction" },
  { folder: "CVS", fileName: "cvs-patho-058-mi-subendocardial.jpg", identification: "Identify this type of myocardial infarction" },
  { folder: "CVS", fileName: "cvs-patho-059-atherosclerosis-fatty-streak.jpg", identification: "Identify this earliest visible lesion of atherosclerosis" },
  { folder: "CVS", fileName: "cvs-patho-060-cardiac-metastasis-melanoma.jpg", identification: "Identify this secondary cardiac tumor" },

  // ── Other CVS (39) ──
  { folder: "CVS", fileName: "cvs-other-001-ecg-stemi.jpg", identification: "Identify this ECG finding in acute MI" },
  { folder: "CVS", fileName: "cvs-other-002-ecg-ntemi.jpg", identification: "Identify this ECG pattern" },
  { folder: "CVS", fileName: "cvs-other-003-ecg-atrial-fibrillation.jpg", identification: "Identify this cardiac arrhythmia" },
  { folder: "CVS", fileName: "cvs-other-004-ecg-ventricular-tachycardia.jpg", identification: "Identify this life-threatening arrhythmia" },
  { folder: "CVS", fileName: "cvs-other-005-ecg-heart-block.jpg", identification: "Identify this conduction abnormality" },
  { folder: "CVS", fileName: "cvs-other-006-ecg-left-ventricular-hypertrophy.jpg", identification: "Identify this ECG finding" },
  { folder: "CVS", fileName: "cvs-other-007-ecg-right-axis-deviation.jpg", identification: "Identify this axis abnormality" },
  { folder: "CVS", fileName: "cvs-other-008-ecg-normal-sinus.jpg", identification: "Identify this normal rhythm" },
  { folder: "CVS", fileName: "cvs-other-009-echo-dilated-cm.jpg", identification: "Identify this echocardiographic finding" },
  { folder: "CVS", fileName: "cvs-other-010-echo-hcm.jpg", identification: "Identify this echocardiographic finding" },
  { folder: "CVS", fileName: "cvs-other-011-echo-mitral-prolapse.jpg", identification: "Identify this valvular abnormality" },
  { folder: "CVS", fileName: "cvs-other-012-echo-aortic-stenosis.jpg", identification: "Identify this valvular pathology" },
  { folder: "CVS", fileName: "cvs-other-013-echo-pericardial-effusion.jpg", identification: "Identify this pericardial finding" },
  { folder: "CVS", fileName: "cvs-other-014-xray-cardiomegaly.jpg", identification: "Identify this chest X-ray finding" },
  { folder: "CVS", fileName: "cvs-other-015-xray-pulmonary-edema.jpg", identification: "Identify this chest X-ray finding" },
  { folder: "CVS", fileName: "cvs-other-016-xray-pleural-effusion.jpg", identification: "Identify this chest X-ray finding" },
  { folder: "CVS", fileName: "cvs-other-017-xray-pneumonia.jpg", identification: "Identify this chest X-ray finding" },
  { folder: "CVS", fileName: "cvs-other-018-mri-cardiac.jpg", identification: "Identify this cardiac MRI finding" },
  { folder: "CVS", fileName: "cvs-other-019-ct-coronary.jpg", identification: "Identify this coronary CT finding" },
  { folder: "CVS", fileName: "cvs-other-020-angio-coronary.jpg", identification: "Identify this coronary angiography finding" },
  { folder: "CVS", fileName: "cvs-other-021-catheter-right-heart.jpg", identification: "Identify this hemodynamic finding" },
  { folder: "CVS", fileName: "cvs-other-022-specimen-valve-replacement.jpg", identification: "Identify this prosthetic valve type" },
  { folder: "CVS", fileName: "cvs-other-023-specimen-bypass-graft.jpg", identification: "Identify this surgical specimen" },
  { folder: "CVS", fileName: "cvs-other-024-gross-heart-failure.jpg", identification: "Identify this gross pathology" },
  { folder: "CVS", fileName: "cvs-other-025-gross-cardiomegaly.jpg", identification: "Identify this enlarged heart specimen" },
  { folder: "CVS", fileName: "cvs-other-026-micro-atheroma-cross-section.jpg", identification: "Identify this arterial cross-section" },
  { folder: "CVS", fileName: "cvs-other-027-micro-thrombus-in-situ.jpg", identification: "Identify this intravascular lesion" },
  { folder: "CVS", fileName: "cvs-other-028-embryology-heart-looping.jpg", identification: "Identify this stage of cardiac embryology" },
  { folder: "CVS", fileName: "cvs-other-029-embryology-septation.jpg", identification: "Identify this cardiac developmental process" },
  { folder: "CVS", fileName: "cvs-other-030-embryology-fetal-circulation.jpg", identification: "Identify this fetal circulatory structure" },
  { folder: "CVS", fileName: "cvs-other-031-embryology-ductus-arteriosus.jpg", identification: "Identify this fetal vessel" },
  { folder: "CVS", fileName: "cvs-other-032-embryology-foramen-ovale.jpg", identification: "Identify this fetal cardiac structure" },
  { folder: "CVS", fileName: "cvs-other-033-vasculitis-histology.jpg", identification: "Identify this type of vasculitis" },
  { folder: "CVS", fileName: "cvs-other-034-lymphedema.jpg", identification: "Identify this lymphatic pathology" },
  { folder: "CVS", fileName: "cvs-other-035-atherosclerosis-plaque-cross-section.jpg", identification: "Identify this arterial cross-section" },
  { folder: "CVS", fileName: "cvs-other-036-ecg-av-block-3rd-degree.jpg", identification: "Identify this complete heart block" },
  { folder: "CVS", fileName: "cvs-other-037-ecg-wolff-parkinson-white.jpg", identification: "Identify this pre-excitation syndrome" },
  { folder: "CVS", fileName: "cvs-other-038-ecg-long-qt.jpg", identification: "Identify this channelopathy" },
  { folder: "CVS", fileName: "cvs-other-039-ecg-brugada.jpg", identification: "Identify this ECG pattern associated with sudden death" },
];

// ── Respiratory Stations (51 extracted from form) ────────────────────────
const RESP_STATIONS: Station[] = [
  // ── Pathology (33) ──
  { folder: "RESP", fileName: "resp-patho-001-tb-early-firm-tubercles.jpg", identification: "Identify the stage/type of tuberculosis" },
  { folder: "RESP", fileName: "resp-patho-002-tb-caseating-tubercles.jpg", identification: "Identify the type of tuberculous lesion" },
  { folder: "RESP", fileName: "resp-patho-003-tb-ghon-focus.jpg", identification: "Identify this primary TB lesion" },
  { folder: "RESP", fileName: "resp-patho-004-tb-ghon-complex.jpg", identification: "Identify this primary TB complex" },
  { folder: "RESP", fileName: "resp-patho-005-tb-miliary.jpg", identification: "Identify this disseminated form of TB" },
  { folder: "RESP", fileName: "resp-patho-006-tb-tuberculoma.jpg", identification: "Identify this localized TB lesion" },
  { folder: "RESP", fileName: "resp-patho-007-tb-healed-focus.jpg", identification: "Identify this healed TB lesion" },
  { folder: "RESP", fileName: "resp-patho-008-emphysema-centrilobular.jpg", identification: "Identify this type of emphysema" },
  { folder: "RESP", fileName: "resp-patho-009-emphysema-panacinar.jpg", identification: "Identify this type of emphysema" },
  { folder: "RESP", fileName: "resp-patho-010-emphysema-distal-acinar.jpg", identification: "Identify this type of emphysema (paraseptal)" },
  { folder: "RESP", fileName: "resp-patho-011-emphysema-irregular.jpg", identification: "Identify this type of emphysema" },
  { folder: "RESP", fileName: "resp-patho-012-bronchiectasis.jpg", identification: "Identify this airway pathology" },
  { folder: "RESP", fileName: "resp-patho-013-bronchiectasis-honeycomb.jpg", identification: "Identify this end-stage lung pathology" },
  { folder: "RESP", fileName: "resp-patho-014-chronic-bronchitis.jpg", identification: "Identify this chronic airway condition" },
  { folder: "RESP", fileName: "resp-patho-015-bronchial-asthma.jpg", identification: "Identify this obstructive airway disease" },
  { folder: "RESP", fileName: "resp-patho-016-lung-abscess.jpg", identification: "Identify this necrotizing lung infection" },
  { folder: "RESP", fileName: "resp-patho-017-pneumonia-lobar.jpg", identification: "Identify this pattern of pneumonia" },
  { folder: "RESP", fileName: "resp-patho-018-pneumonia-broncho.jpg", identification: "Identify this pattern of pneumonia" },
  { folder: "RESP", fileName: "resp-patho-019-lung-cancer-squamous.jpg", identification: "Identify this type of lung cancer" },
  { folder: "RESP", fileName: "resp-patho-020-lung-cancer-adenocarcinoma.jpg", identification: "Identify this type of lung cancer" },
  { folder: "RESP", fileName: "resp-patho-021-lung-cancer-small-cell.jpg", identification: "Identify this aggressive lung cancer" },
  { folder: "RESP", fileName: "resp-patho-022-lung-cancer-large-cell.jpg", identification: "Identify this type of lung cancer" },
  { folder: "RESP", fileName: "resp-patho-023-ARDS.jpg", identification: "Identify this acute lung injury pattern" },
  { folder: "RESP", fileName: "resp-patho-024-pulmonary-fibrosis.jpg", identification: "Identify this interstitial lung disease" },
  { folder: "RESP", fileName: "resp-patho-025-pulmonary-edema.jpg", identification: "Identify this cause of respiratory distress" },
  { folder: "RESP", fileName: "resp-patho-026-pulmonary-hemorrhage.jpg", identification: "Identify this bleeding into the lungs" },
  { folder: "RESP", fileName: "resp-patho-027-pulmonary-hypertension.jpg", identification: "Identify this vascular lung pathology" },
  { folder: "RESP", fileName: "resp-patho-028-pneumoconiosis-silicosis.jpg", identification: "Identify this occupational lung disease" },
  { folder: "RESP", fileName: "resp-patho-029-pneumoconiosis-asbestosis.jpg", identification: "Identify this occupational lung disease" },
  { folder: "RESP", fileName: "resp-patho-030-pneumoconiosis-coal-workers.jpg", identification: "Identify this occupational lung disease" },
  { folder: "RESP", fileName: "resp-patho-031-sarcoidosis-lung.jpg", identification: "Identify this granulomatous lung disease" },
  { folder: "RESP", fileName: "resp-patho-032-empyema.jpg", identification: "Identify this collection of pus in the pleural space" },
  { folder: "RESP", fileName: "resp-patho-033-hemothorax.jpg", identification: "Identify this pleural pathology" },

  // ── Microbiology (8) ──
  { folder: "RESP", fileName: "resp-micro-001-stain-ziehl-neelsen.jpg", identification: "What is the type of this stain?" },
  { folder: "RESP", fileName: "resp-micro-002-stain-fluorochrome.jpg", identification: "What is the type of this stain?" },
  { folder: "RESP", fileName: "resp-micro-003-stain-gram-positive.jpg", identification: "What is the type of this stain?" },
  { folder: "RESP", fileName: "resp-micro-004-stain-gram-negative.jpg", identification: "What is the type of this stain?" },
  { folder: "RESP", fileName: "resp-micro-005-culture-lowenstein-jensen.jpg", identification: "What is the type of this culture medium?" },
  { folder: "RESP", fileName: "resp-micro-006-culture-dorset-egg.jpg", identification: "What is the type of this culture medium?" },
  { folder: "RESP", fileName: "resp-micro-007-culture-chocolate-agar.jpg", identification: "What is the type of this culture medium?" },
  { folder: "RESP", fileName: "resp-micro-008-culture-blood-agar.jpg", identification: "What is the type of this culture medium?" },

  // ── Physiology (5) ──
  { folder: "RESP", fileName: "resp-physio-001-spirometry-fev1.jpg", identification: "Identify parameter number 4 on this spirometry tracing" },
  { folder: "RESP", fileName: "resp-physio-002-spirometry-fvc.jpg", identification: "Identify this spirometry parameter" },
  { folder: "RESP", fileName: "resp-physio-003-spirometry-residual-volume.jpg", identification: "Identify this lung volume" },
  { folder: "RESP", fileName: "resp-physio-004-spirometry-tidal-volume.jpg", identification: "Identify this resting lung volume" },
  { folder: "RESP", fileName: "resp-physio-005-abg-interpretation.jpg", interpretation: "Interpret this arterial blood gas result" },

  // ── Anatomy & Histology (5) ──
  { folder: "RESP", fileName: "resp-anato-001-lung-lobes-right.jpg", identification: "Identify the lobes and fissures of the right lung" },
  { folder: "RESP", fileName: "resp-anato-002-lung-lobes-left.jpg", identification: "Identify the lobes and fissures of the left lung" },
  { folder: "RESP", fileName: "resp-anato-003-bronchial-tree.jpg", identification: "Identify this part of the bronchial tree" },
  { folder: "RESP", fileName: "resp-histo-001-alveoli-histology.jpg", identification: "Identify this respiratory tissue" },
  { folder: "RESP", fileName: "resp-histo-002-bronchus-histology.jpg", identification: "Identify this airway based on its histological structure" },
];

// ── Seed Logic ──────────────────────────────────────────────────────────
async function seedStations(stations: Station[], overwrite: boolean) {
  let created = 0;
  let skipped = 0;

  for (const s of stations) {
    const existing = await db.query.ospeAnswerKey.findFirst({
      where: (t, { and, eq }) => and(eq(t.folder, s.folder), eq(t.fileName, s.fileName)),
    });

    if (existing && !overwrite) {
      skipped++;
      continue;
    }

    if (existing && overwrite) {
      await db.delete(ospeRubric).where((r, { eq }) => eq(r.answerKeyId, existing.id));
      await db.delete(ospeAnswerKey).where((k, { eq }) => eq(k.id, existing.id));
    }

    const id = randomUUID();
    await db.insert(ospeAnswerKey).values({
      id,
      folder: s.folder,
      fileName: s.fileName,
      diagnosis: "",           // user fills in later
      identification: s.identification,
      findings: s.findings ?? null,
      differential: null,
      management: null,
    });

    // Add default rubric items (user adjusts points later)
    const rubricItems = [
      "Correct identification of structure/pathology",
      "Key clinical findings described",
      "Differential diagnosis provided",
      "Management plan outlined",
    ];
    for (let i = 0; i < rubricItems.length; i++) {
      await db.insert(ospeRubric).values({
        id: randomUUID(),
        answerKeyId: id,
        criterion: rubricItems[i],
        maxPoints: i === 0 ? 2 : 1,
        order: i + 1,
      });
    }

    created++;
  }

  return { created, skipped };
}

async function main() {
  const overwrite = process.env.SEED_OVERWRITE === "1";

  console.log("[seed-ospe-stations] Seeding CVS stations...");
  const cvs = await seedStations(CVS_STATIONS, overwrite);
  console.log(`  CVS: ${cvs.created} created, ${cvs.skipped} skipped`);

  console.log("[seed-ospe-stations] Seeding RESP stations...");
  const resp = await seedStations(RESP_STATIONS, overwrite);
  console.log(`  RESP: ${resp.created} created, ${resp.skipped} skipped`);

  const total = cvs.created + resp.created;
  const totalSkipped = cvs.skipped + resp.skipped;
  console.log(`\n[seed-ospe-stations] Done — ${total} stations created, ${totalSkipped} skipped`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-ospe-stations] error:", err);
  process.exit(1);
});
