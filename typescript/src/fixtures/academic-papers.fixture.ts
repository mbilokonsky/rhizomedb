/**
 * Academic Paper Digestion Fixture
 *
 * Ingests real papers from gut-microbiome-mental-health research (2022-2025)
 * into RhizomeDB as a knowledge graph. Tests whether the delta/HyperView model
 * can represent and query academic knowledge with full provenance.
 *
 * Entity types: paper, researcher, institution, bacterium, metabolite, mechanism,
 *               condition, claim
 *
 * Relationship patterns:
 *   paper ←authored_by→ researcher
 *   researcher ←affiliated_with→ institution
 *   paper ←makes_claim→ claim
 *   claim ←about_bacterium→ bacterium
 *   claim ←about_metabolite→ metabolite
 *   claim ←involves_mechanism→ mechanism
 *   claim ←relevant_to_condition→ condition
 *   bacterium ←produces→ metabolite
 */

import { RhizomeDB } from '../storage/instance';

// Stable entity IDs for cross-paper reuse
export const ids = {
  // Papers
  paper_mehta_2025: 'paper:mehta-2025-cureus-gut-mood',
  paper_cao_2025: 'paper:cao-2025-bmc-systematic-review',
  paper_rathore_2025: 'paper:rathore-2025-cureus-bidirectional',
  paper_zhang_2025: 'paper:zhang-2025-frontiers-multimodal',
  paper_shaikh_2025: 'paper:shaikh-2025-cureus-systematic-review',
  paper_radjabzadeh_2022: 'paper:radjabzadeh-2022-nature-mwas',

  // Researchers (some shared across papers)
  researcher_mehta: 'researcher:ishani-mehta',
  researcher_juneja: 'researcher:keshav-juneja',
  researcher_naik: 'researcher:sunil-naik', // shared: papers 3 & 5
  researcher_cao: 'researcher:yuanyuan-cao',
  researcher_meng: 'researcher:miaomiao-meng',
  researcher_rathore: 'researcher:kanchanbala-rathore',
  researcher_shukla: 'researcher:neha-shukla',
  researcher_zhang: 'researcher:zhang-ruohan',
  researcher_jiang: 'researcher:jiang-feng',
  researcher_song: 'researcher:song-yuanbo',
  researcher_shaikh: 'researcher:raja-gulfam-shaikh',
  researcher_dey: 'researcher:animesh-dey',
  researcher_hasan: 'researcher:asif-hasan',
  researcher_radjabzadeh: 'researcher:djawad-radjabzadeh',
  researcher_kraaij: 'researcher:robert-kraaij',
  researcher_amin: 'researcher:najaf-amin',
  researcher_van_duijn: 'researcher:cornelia-van-duijn',

  // Institutions (some shared)
  inst_maharaja: 'inst:maharaja-agrasen-hisar',
  inst_shandong: 'inst:shandong-univ-tcm',
  inst_guangxi: 'inst:guangxi-univ-chinese-med',
  inst_mgm_indore: 'inst:mgm-medical-college-indore',
  inst_brainware: 'inst:brainware-university-kolkata',
  inst_aligarh: 'inst:aligarh-muslim-university',
  inst_erasmus: 'inst:erasmus-medical-center',
  inst_amsterdam: 'inst:amsterdam-umc',

  // Bacteria (heavily shared across papers)
  bact_lactobacillus: 'bacterium:lactobacillus',
  bact_bifidobacterium: 'bacterium:bifidobacterium',
  bact_faecalibacterium: 'bacterium:faecalibacterium',
  bact_eggerthella: 'bacterium:eggerthella',
  bact_bacteroides: 'bacterium:bacteroides',
  bact_proteobacteria: 'bacterium:proteobacteria',
  bact_firmicutes: 'bacterium:firmicutes',
  bact_prevotella: 'bacterium:prevotella',
  bact_coprococcus: 'bacterium:coprococcus',
  bact_streptococcus: 'bacterium:streptococcus',
  bact_enterococcus: 'bacterium:enterococcus',
  bact_bacillus: 'bacterium:bacillus',
  bact_alistipes: 'bacterium:alistipes',
  bact_ruminococcaceae: 'bacterium:ruminococcaceae',
  bact_flavonifractor: 'bacterium:flavonifractor',
  bact_subdoligranulum: 'bacterium:subdoligranulum',
  bact_sellimonas: 'bacterium:sellimonas',
  bact_hungatella: 'bacterium:hungatella',
  bact_lachnospira: 'bacterium:lachnospira',
  bact_actinobacteria: 'bacterium:actinobacteria',

  // Metabolites (heavily shared)
  metab_serotonin: 'metabolite:serotonin',
  metab_gaba: 'metabolite:gaba',
  metab_dopamine: 'metabolite:dopamine',
  metab_butyrate: 'metabolite:butyrate',
  metab_acetate: 'metabolite:acetate',
  metab_propionate: 'metabolite:propionate',
  metab_scfa: 'metabolite:short-chain-fatty-acids',
  metab_cortisol: 'metabolite:cortisol',
  metab_bdnf: 'metabolite:bdnf',
  metab_lps: 'metabolite:lipopolysaccharide',
  metab_glutamate: 'metabolite:glutamate',
  metab_tryptophan: 'metabolite:tryptophan',

  // Brain mechanisms (heavily shared)
  mech_vagus: 'mechanism:vagus-nerve-signaling',
  mech_hpa: 'mechanism:hpa-axis',
  mech_neuroinflammation: 'mechanism:neuroinflammation',
  mech_bbb: 'mechanism:blood-brain-barrier',
  mech_leaky_gut: 'mechanism:intestinal-permeability',
  mech_microglia: 'mechanism:microglia-activation',

  // Conditions (heavily shared)
  cond_depression: 'condition:major-depressive-disorder',
  cond_anxiety: 'condition:anxiety-disorders',
  cond_bipolar: 'condition:bipolar-disorder',
  cond_schizophrenia: 'condition:schizophrenia',
  cond_ibs: 'condition:irritable-bowel-syndrome',
  cond_autism: 'condition:autism-spectrum-disorder',
  cond_postnatal_depression: 'condition:postnatal-depression',

  // === Batch 2: Papers 7-16 ===

  // Papers
  paper_tillisch_2013: 'paper:tillisch-2013-gastro-fmri',
  paper_kang_2019: 'paper:kang-2019-sciprep-autism-mtt',
  paper_liu_2020: 'paper:liu-2020-bmc-ibs-comorbidity',
  paper_valles_colomer_2019: 'paper:valles-colomer-2019-nature-micro',
  paper_pinto_sanchez_2017: 'paper:pinto-sanchez-2017-gastro-ibs',
  paper_messaoudi_2011: 'paper:messaoudi-2011-bjn-psychobiotic',
  paper_steenbergen_2015: 'paper:steenbergen-2015-bbi-cognitive',
  paper_akkasheh_2016: 'paper:akkasheh-2016-nutrition-mdd',
  paper_slykerman_2017: 'paper:slykerman-2017-ebiomed-postnatal',
  paper_dinan_2013: 'paper:dinan-2013-biolpsych-psychobiotics',

  // New researchers (batch 2)
  researcher_tillisch: 'researcher:kirsten-tillisch',
  researcher_labus: 'researcher:jennifer-labus',
  researcher_kang: 'researcher:dae-wook-kang',
  researcher_adams: 'researcher:james-b-adams',
  researcher_krajmalnik_brown: 'researcher:rosa-krajmalnik-brown',
  researcher_liu_tong: 'researcher:tong-liu',
  researcher_valles_colomer: 'researcher:mireia-valles-colomer',
  researcher_raes: 'researcher:jeroen-raes',
  researcher_falony: 'researcher:gwen-falony',
  researcher_pinto_sanchez: 'researcher:maria-ines-pinto-sanchez',
  researcher_messaoudi: 'researcher:michael-messaoudi',
  researcher_steenbergen: 'researcher:laura-steenbergen',
  researcher_akkasheh: 'researcher:ghodarz-akkasheh',
  researcher_slykerman: 'researcher:rebecca-slykerman',
  researcher_dinan: 'researcher:timothy-dinan',
  researcher_cryan: 'researcher:john-cryan',

  // New institutions (batch 2)
  inst_ucla: 'inst:ucla',
  inst_arizona_state: 'inst:arizona-state-university',
  inst_qilu_shandong: 'inst:qilu-hospital-shandong', // same university system as inst_shandong!
  inst_ku_leuven: 'inst:ku-leuven-rega-institute',
  inst_mcmaster: 'inst:mcmaster-university',
  inst_leiden: 'inst:leiden-university',
  inst_kashan: 'inst:kashan-univ-medical-sciences',
  inst_auckland: 'inst:university-of-auckland',
  inst_ucc_cork: 'inst:university-college-cork',

  // New bacteria (batch 2)
  bact_dialister: 'bacterium:dialister',
  bact_eubacterium_rectale: 'bacterium:eubacterium-rectale',
  bact_b_infantis: 'bacterium:bifidobacterium-infantis',
  bact_b_longum: 'bacterium:bifidobacterium-longum',
  bact_l_rhamnosus: 'bacterium:lactobacillus-rhamnosus',
  bact_l_helveticus: 'bacterium:lactobacillus-helveticus',
  bact_l_acidophilus: 'bacterium:lactobacillus-acidophilus',
  bact_l_casei: 'bacterium:lactobacillus-casei',

  // New metabolites (batch 2)
  metab_dopac: 'metabolite:3-4-dihydroxyphenylacetic-acid',
  metab_norepinephrine: 'metabolite:norepinephrine',

  // New mechanisms (batch 2)
  mech_enteric_nervous: 'mechanism:enteric-nervous-system',
  mech_immune_cytokine: 'mechanism:immune-cytokine-pathway',

  // === Batch 3: Papers 17-27 ===

  // Papers
  paper_sudo_2004: 'paper:sudo-2004-jphysiol-germfree',
  paper_bravo_2011: 'paper:bravo-2011-pnas-vagus',
  paper_kelly_2017: 'paper:kelly-2017-bbi-lost-translation',
  paper_zheng_2016: 'paper:zheng-2016-molpsych-fmt-depression',
  paper_kelly_2016: 'paper:kelly-2016-jpsychres-fmt-rats',
  paper_nikolova_2021: 'paper:nikolova-2021-jamapsych-metaanalysis',
  paper_tian_2022: 'paper:tian-2022-bbi-bbreve-mdd',
  paper_rudzki_2019: 'paper:rudzki-2019-psychoneuro-plantarum',
  paper_chahwan_2019: 'paper:chahwan-2019-jad-ecologic',
  paper_zhu_2020: 'paper:zhu-2020-molpsych-schiz-fmt',
  paper_ohare_2025: 'paper:ohare-2025-neuroimmod-saneurogut',

  // New researchers (batch 3)
  researcher_sudo: 'researcher:nobuyuki-sudo',
  researcher_koga: 'researcher:yasuhiro-koga',
  researcher_bravo: 'researcher:javier-bravo',
  researcher_forsythe: 'researcher:paul-forsythe',
  researcher_bienenstock: 'researcher:john-bienenstock',
  researcher_kelly: 'researcher:john-r-kelly',
  researcher_clarke: 'researcher:gerard-clarke',
  researcher_zheng_peng: 'researcher:peng-zheng',
  researcher_xie_peng: 'researcher:peng-xie',
  researcher_nikolova: 'researcher:viktoriya-nikolova',
  researcher_young: 'researcher:allan-young',
  researcher_tian: 'researcher:peijun-tian',
  researcher_chen_wei: 'researcher:wei-chen',
  researcher_rudzki: 'researcher:leszek-rudzki',
  researcher_szulc: 'researcher:agata-szulc',
  researcher_chahwan: 'researcher:bahia-chahwan',
  researcher_roberts: 'researcher:lynette-roberts',
  researcher_zhu_feng: 'researcher:feng-zhu',
  researcher_ma_xiancang: 'researcher:xiancang-ma',
  researcher_ohare: 'researcher:michaela-ohare',
  researcher_hemmings: 'researcher:sian-hemmings',

  // New institutions (batch 3)
  inst_kyushu: 'inst:kyushu-university',
  inst_chongqing: 'inst:chongqing-medical-university',
  inst_kings_college: 'inst:kings-college-london',
  inst_jiangnan: 'inst:jiangnan-university',
  inst_bialystok: 'inst:medical-university-bialystok',
  inst_uts: 'inst:university-technology-sydney',
  inst_xian_jiaotong: 'inst:xian-jiaotong-university',
  inst_stellenbosch: 'inst:stellenbosch-university',

  // New bacteria (batch 3)
  bact_l_plantarum: 'bacterium:lactobacillus-plantarum',
  bact_b_breve: 'bacterium:bifidobacterium-breve',
  bact_ruminococcus_gnavus: 'bacterium:ruminococcus-gnavus',
  bact_catenibacterium: 'bacterium:catenibacterium',
  bact_collinsella: 'bacterium:collinsella',
  bact_holdemanella: 'bacterium:holdemanella',

  // New metabolites (batch 3)
  metab_kynurenine: 'metabolite:kynurenine',
  metab_corticosterone: 'metabolite:corticosterone',

  // New mechanisms (batch 3)
  mech_kynurenine_pathway: 'mechanism:tryptophan-kynurenine-pathway',
  mech_developmental_window: 'mechanism:developmental-critical-window',
  mech_fmt_transfer: 'mechanism:fecal-microbiota-transfer',

  // New conditions (batch 3)
  cond_ptsd: 'condition:post-traumatic-stress-disorder',
};

// Claim IDs are unique per paper-claim pair
let claimCounter = 0;
function claimId(paperId: string): string {
  return `claim:${paperId.replace('paper:', '')}:${++claimCounter}`;
}

/**
 * Seed all entity annotations (names, types, metadata).
 */
async function seedEntities(db: RhizomeDB, author: string): Promise<number> {
  let count = 0;

  async function ann(entityId: string, property: string, value: string | number | boolean): Promise<void> {
    await db.annotate(entityId, property, value, author);
    count++;
  }

  // ----- Papers -----
  await ann(ids.paper_mehta_2025, 'title', 'Gut Microbiota and Mental Health: A Comprehensive Review of Gut-Brain Interactions in Mood Disorders');
  await ann(ids.paper_mehta_2025, 'journal', 'Cureus');
  await ann(ids.paper_mehta_2025, 'year', 2025);
  await ann(ids.paper_mehta_2025, 'type', 'paper');
  await ann(ids.paper_mehta_2025, 'doi', '10.7759/cureus.80323');
  await ann(ids.paper_mehta_2025, 'study_type', 'review');

  await ann(ids.paper_cao_2025, 'title', 'Gut microbiota variations in depression and anxiety: a systematic review');
  await ann(ids.paper_cao_2025, 'journal', 'BMC Psychiatry');
  await ann(ids.paper_cao_2025, 'year', 2025);
  await ann(ids.paper_cao_2025, 'type', 'paper');
  await ann(ids.paper_cao_2025, 'doi', '10.1186/s12888-025-06871-8');
  await ann(ids.paper_cao_2025, 'study_type', 'review');

  await ann(ids.paper_rathore_2025, 'title', 'The Bidirectional Relationship Between the Gut Microbiome and Mental Health: A Comprehensive Review');
  await ann(ids.paper_rathore_2025, 'journal', 'Cureus');
  await ann(ids.paper_rathore_2025, 'year', 2025);
  await ann(ids.paper_rathore_2025, 'type', 'paper');
  await ann(ids.paper_rathore_2025, 'study_type', 'review');

  await ann(ids.paper_zhang_2025, 'title', 'Gut microbiota as a novel target for treating anxiety and depression: from mechanisms to multimodal interventions');
  await ann(ids.paper_zhang_2025, 'journal', 'Frontiers in Microbiology');
  await ann(ids.paper_zhang_2025, 'year', 2025);
  await ann(ids.paper_zhang_2025, 'type', 'paper');
  await ann(ids.paper_zhang_2025, 'study_type', 'review');

  await ann(ids.paper_shaikh_2025, 'title', 'Understanding the Impact of the Gut Microbiome on Mental Health: A Systematic Review');
  await ann(ids.paper_shaikh_2025, 'journal', 'Cureus');
  await ann(ids.paper_shaikh_2025, 'year', 2025);
  await ann(ids.paper_shaikh_2025, 'type', 'paper');
  await ann(ids.paper_shaikh_2025, 'study_type', 'review');

  await ann(ids.paper_radjabzadeh_2022, 'title', 'Gut microbiome-wide association study of depressive symptoms');
  await ann(ids.paper_radjabzadeh_2022, 'journal', 'Nature Communications');
  await ann(ids.paper_radjabzadeh_2022, 'year', 2022);
  await ann(ids.paper_radjabzadeh_2022, 'type', 'paper');
  await ann(ids.paper_radjabzadeh_2022, 'doi', '10.1038/s41467-022-34502-3');
  await ann(ids.paper_radjabzadeh_2022, 'study_type', 'cohort');

  // ----- Researchers -----
  const researchers: [string, string][] = [
    [ids.researcher_mehta, 'Ishani Mehta'],
    [ids.researcher_juneja, 'Keshav Juneja'],
    [ids.researcher_naik, 'Sunil Naik'],
    [ids.researcher_cao, 'YuanYuan Cao'],
    [ids.researcher_meng, 'MiaoMiao Meng'],
    [ids.researcher_rathore, 'Kanchanbala Rathore'],
    [ids.researcher_shukla, 'Neha Shukla'],
    [ids.researcher_zhang, 'Zhang Ruohan'],
    [ids.researcher_jiang, 'Jiang Feng'],
    [ids.researcher_song, 'Song Yuanbo'],
    [ids.researcher_shaikh, 'Raja Gulfam Shaikh'],
    [ids.researcher_dey, 'Animesh Dey'],
    [ids.researcher_hasan, 'Asif Hasan'],
    [ids.researcher_radjabzadeh, 'Djawad Radjabzadeh'],
    [ids.researcher_kraaij, 'Robert Kraaij'],
    [ids.researcher_amin, 'Najaf Amin'],
    [ids.researcher_van_duijn, 'Cornelia M van Duijn'],
  ];
  for (const [id, name] of researchers) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'researcher');
  }

  // ----- Institutions -----
  const institutions: [string, string, string][] = [
    [ids.inst_maharaja, 'Maharaja Agrasen Institute of Medical Research and Education', 'India'],
    [ids.inst_shandong, 'Shandong University of Traditional Chinese Medicine', 'China'],
    [ids.inst_guangxi, 'Guangxi University of Chinese Medicine', 'China'],
    [ids.inst_mgm_indore, 'Mahatma Gandhi Memorial Medical College Indore', 'India'],
    [ids.inst_brainware, 'Brainware University Kolkata', 'India'],
    [ids.inst_aligarh, 'Aligarh Muslim University', 'India'],
    [ids.inst_erasmus, 'Erasmus Medical Center Rotterdam', 'Netherlands'],
    [ids.inst_amsterdam, 'Amsterdam UMC', 'Netherlands'],
  ];
  for (const [id, name, country] of institutions) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'institution');
    await ann(id, 'country', country);
  }

  // ----- Bacteria -----
  const bacteria: [string, string, string][] = [
    [ids.bact_lactobacillus, 'Lactobacillus', 'genus'],
    [ids.bact_bifidobacterium, 'Bifidobacterium', 'genus'],
    [ids.bact_faecalibacterium, 'Faecalibacterium', 'genus'],
    [ids.bact_eggerthella, 'Eggerthella', 'genus'],
    [ids.bact_bacteroides, 'Bacteroides', 'genus'],
    [ids.bact_proteobacteria, 'Proteobacteria', 'phylum'],
    [ids.bact_firmicutes, 'Firmicutes', 'phylum'],
    [ids.bact_prevotella, 'Prevotella', 'genus'],
    [ids.bact_coprococcus, 'Coprococcus', 'genus'],
    [ids.bact_streptococcus, 'Streptococcus', 'genus'],
    [ids.bact_enterococcus, 'Enterococcus', 'genus'],
    [ids.bact_bacillus, 'Bacillus', 'genus'],
    [ids.bact_alistipes, 'Alistipes', 'genus'],
    [ids.bact_ruminococcaceae, 'Ruminococcaceae', 'family'],
    [ids.bact_flavonifractor, 'Flavonifractor', 'genus'],
    [ids.bact_subdoligranulum, 'Subdoligranulum', 'genus'],
    [ids.bact_sellimonas, 'Sellimonas', 'genus'],
    [ids.bact_hungatella, 'Hungatella', 'genus'],
    [ids.bact_lachnospira, 'Lachnospira', 'genus'],
    [ids.bact_actinobacteria, 'Actinobacteria', 'phylum'],
  ];
  for (const [id, name, rank] of bacteria) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'bacterium');
    await ann(id, 'taxonomic_rank', rank);
  }

  // ----- Metabolites -----
  const metabolites: [string, string][] = [
    [ids.metab_serotonin, 'Serotonin (5-HT)'],
    [ids.metab_gaba, 'Gamma-aminobutyric acid (GABA)'],
    [ids.metab_dopamine, 'Dopamine'],
    [ids.metab_butyrate, 'Butyrate'],
    [ids.metab_acetate, 'Acetate'],
    [ids.metab_propionate, 'Propionate'],
    [ids.metab_scfa, 'Short-chain fatty acids (SCFAs)'],
    [ids.metab_cortisol, 'Cortisol'],
    [ids.metab_bdnf, 'Brain-derived neurotrophic factor (BDNF)'],
    [ids.metab_lps, 'Lipopolysaccharide (LPS)'],
    [ids.metab_glutamate, 'Glutamate'],
    [ids.metab_tryptophan, 'Tryptophan'],
  ];
  for (const [id, name] of metabolites) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'metabolite');
  }

  // ----- Mechanisms -----
  const mechanisms: [string, string][] = [
    [ids.mech_vagus, 'Vagus nerve signaling'],
    [ids.mech_hpa, 'Hypothalamic-pituitary-adrenal (HPA) axis'],
    [ids.mech_neuroinflammation, 'Neuroinflammation'],
    [ids.mech_bbb, 'Blood-brain barrier integrity'],
    [ids.mech_leaky_gut, 'Increased intestinal permeability (leaky gut)'],
    [ids.mech_microglia, 'Microglia activation'],
  ];
  for (const [id, name] of mechanisms) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'mechanism');
  }

  // ----- Conditions -----
  const conditions: [string, string][] = [
    [ids.cond_depression, 'Major Depressive Disorder'],
    [ids.cond_anxiety, 'Anxiety Disorders'],
    [ids.cond_bipolar, 'Bipolar Disorder'],
    [ids.cond_schizophrenia, 'Schizophrenia'],
    [ids.cond_ibs, 'Irritable Bowel Syndrome'],
    [ids.cond_autism, 'Autism Spectrum Disorder'],
    [ids.cond_postnatal_depression, 'Postnatal Depression'],
  ];
  for (const [id, name] of conditions) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'condition');
  }

  // ===== Batch 2: Papers 7-16 =====

  // Papers
  await ann(ids.paper_tillisch_2013, 'title', 'Consumption of fermented milk product with probiotic modulates brain activity');
  await ann(ids.paper_tillisch_2013, 'journal', 'Gastroenterology');
  await ann(ids.paper_tillisch_2013, 'year', 2013);
  await ann(ids.paper_tillisch_2013, 'type', 'paper');
  await ann(ids.paper_tillisch_2013, 'doi', '10.1053/j.gastro.2013.02.043');
  await ann(ids.paper_tillisch_2013, 'study_type', 'clinical_trial');

  await ann(ids.paper_kang_2019, 'title', 'Long-term benefit of Microbiota Transfer Therapy on autism symptoms and gut microbiota');
  await ann(ids.paper_kang_2019, 'journal', 'Scientific Reports');
  await ann(ids.paper_kang_2019, 'year', 2019);
  await ann(ids.paper_kang_2019, 'type', 'paper');
  await ann(ids.paper_kang_2019, 'doi', '10.1038/s41598-019-42183-0');
  await ann(ids.paper_kang_2019, 'study_type', 'clinical_trial');

  await ann(ids.paper_liu_2020, 'title', 'Microbial and metabolomic profiles in correlation with depression and anxiety co-morbidities in diarrhoea-predominant IBS patients');
  await ann(ids.paper_liu_2020, 'journal', 'BMC Microbiology');
  await ann(ids.paper_liu_2020, 'year', 2020);
  await ann(ids.paper_liu_2020, 'type', 'paper');
  await ann(ids.paper_liu_2020, 'doi', '10.1186/s12866-020-01841-4');
  await ann(ids.paper_liu_2020, 'study_type', 'cohort');

  await ann(ids.paper_valles_colomer_2019, 'title', 'The neuroactive potential of the human gut microbiota in quality of life and depression');
  await ann(ids.paper_valles_colomer_2019, 'journal', 'Nature Microbiology');
  await ann(ids.paper_valles_colomer_2019, 'year', 2019);
  await ann(ids.paper_valles_colomer_2019, 'type', 'paper');
  await ann(ids.paper_valles_colomer_2019, 'doi', '10.1038/s41564-018-0337-x');
  await ann(ids.paper_valles_colomer_2019, 'study_type', 'cohort');

  await ann(ids.paper_pinto_sanchez_2017, 'title', 'Probiotic Bifidobacterium longum NCC3001 Reduces Depression Scores and Alters Brain Activity: A Pilot Study in Patients With Irritable Bowel Syndrome');
  await ann(ids.paper_pinto_sanchez_2017, 'journal', 'Gastroenterology');
  await ann(ids.paper_pinto_sanchez_2017, 'year', 2017);
  await ann(ids.paper_pinto_sanchez_2017, 'type', 'paper');
  await ann(ids.paper_pinto_sanchez_2017, 'study_type', 'clinical_trial');

  await ann(ids.paper_messaoudi_2011, 'title', 'Assessment of psychotropic-like properties of a probiotic formulation (Lactobacillus helveticus R0052 and Bifidobacterium longum R0175) in rats and human subjects');
  await ann(ids.paper_messaoudi_2011, 'journal', 'British Journal of Nutrition');
  await ann(ids.paper_messaoudi_2011, 'year', 2011);
  await ann(ids.paper_messaoudi_2011, 'type', 'paper');
  await ann(ids.paper_messaoudi_2011, 'doi', '10.1017/s0007114510004319');
  await ann(ids.paper_messaoudi_2011, 'study_type', 'clinical_trial');

  await ann(ids.paper_steenbergen_2015, 'title', 'A randomized controlled trial to test the effect of multispecies probiotics on cognitive reactivity to sad mood');
  await ann(ids.paper_steenbergen_2015, 'journal', 'Brain, Behavior, and Immunity');
  await ann(ids.paper_steenbergen_2015, 'year', 2015);
  await ann(ids.paper_steenbergen_2015, 'type', 'paper');
  await ann(ids.paper_steenbergen_2015, 'study_type', 'clinical_trial');

  await ann(ids.paper_akkasheh_2016, 'title', 'Clinical and metabolic response to probiotic administration in patients with major depressive disorder: A randomized, double-blind, placebo-controlled trial');
  await ann(ids.paper_akkasheh_2016, 'journal', 'Nutrition');
  await ann(ids.paper_akkasheh_2016, 'year', 2016);
  await ann(ids.paper_akkasheh_2016, 'type', 'paper');
  await ann(ids.paper_akkasheh_2016, 'study_type', 'clinical_trial');

  await ann(ids.paper_slykerman_2017, 'title', 'Effect of Lactobacillus rhamnosus HN001 in Pregnancy on Postpartum Symptoms of Depression and Anxiety: A Randomised Double-blind Placebo-controlled Trial');
  await ann(ids.paper_slykerman_2017, 'journal', 'EBioMedicine');
  await ann(ids.paper_slykerman_2017, 'year', 2017);
  await ann(ids.paper_slykerman_2017, 'type', 'paper');
  await ann(ids.paper_slykerman_2017, 'doi', '10.1016/j.ebiom.2017.09.013');
  await ann(ids.paper_slykerman_2017, 'study_type', 'clinical_trial');

  await ann(ids.paper_dinan_2013, 'title', 'Psychobiotics: a novel class of psychotropic');
  await ann(ids.paper_dinan_2013, 'journal', 'Biological Psychiatry');
  await ann(ids.paper_dinan_2013, 'year', 2013);
  await ann(ids.paper_dinan_2013, 'type', 'paper');
  await ann(ids.paper_dinan_2013, 'study_type', 'review');

  // Batch 2 researchers
  const researchers2: [string, string][] = [
    [ids.researcher_tillisch, 'Kirsten Tillisch'],
    [ids.researcher_labus, 'Jennifer Labus'],
    [ids.researcher_kang, 'Dae-Wook Kang'],
    [ids.researcher_adams, 'James B Adams'],
    [ids.researcher_krajmalnik_brown, 'Rosa Krajmalnik-Brown'],
    [ids.researcher_liu_tong, 'Tong Liu'],
    [ids.researcher_valles_colomer, 'Mireia Valles-Colomer'],
    [ids.researcher_raes, 'Jeroen Raes'],
    [ids.researcher_falony, 'Gwen Falony'],
    [ids.researcher_pinto_sanchez, 'Maria Ines Pinto-Sanchez'],
    [ids.researcher_messaoudi, 'Michael Messaoudi'],
    [ids.researcher_steenbergen, 'Laura Steenbergen'],
    [ids.researcher_akkasheh, 'Ghodarz Akkasheh'],
    [ids.researcher_slykerman, 'Rebecca Slykerman'],
    [ids.researcher_dinan, 'Timothy Dinan'],
    [ids.researcher_cryan, 'John Cryan'],
  ];
  for (const [id, name] of researchers2) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'researcher');
  }

  // Batch 2 institutions
  const institutions2: [string, string, string][] = [
    [ids.inst_ucla, 'University of California, Los Angeles', 'United States'],
    [ids.inst_arizona_state, 'Arizona State University', 'United States'],
    [ids.inst_qilu_shandong, 'Qilu Hospital, Shandong University', 'China'],
    [ids.inst_ku_leuven, 'KU Leuven / Rega Institute', 'Belgium'],
    [ids.inst_mcmaster, 'McMaster University', 'Canada'],
    [ids.inst_leiden, 'Leiden University', 'Netherlands'],
    [ids.inst_kashan, 'Kashan University of Medical Sciences', 'Iran'],
    [ids.inst_auckland, 'University of Auckland', 'New Zealand'],
    [ids.inst_ucc_cork, 'University College Cork', 'Ireland'],
  ];
  for (const [id, name, country] of institutions2) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'institution');
    await ann(id, 'country', country);
  }

  // Batch 2 new bacteria
  const bacteria2: [string, string, string][] = [
    [ids.bact_dialister, 'Dialister', 'genus'],
    [ids.bact_eubacterium_rectale, 'Eubacterium rectale', 'species'],
    [ids.bact_b_infantis, 'Bifidobacterium infantis', 'species'],
    [ids.bact_b_longum, 'Bifidobacterium longum', 'species'],
    [ids.bact_l_rhamnosus, 'Lactobacillus rhamnosus', 'species'],
    [ids.bact_l_helveticus, 'Lactobacillus helveticus', 'species'],
    [ids.bact_l_acidophilus, 'Lactobacillus acidophilus', 'species'],
    [ids.bact_l_casei, 'Lactobacillus casei', 'species'],
  ];
  for (const [id, name, rank] of bacteria2) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'bacterium');
    await ann(id, 'taxonomic_rank', rank);
  }

  // Batch 2 new metabolites
  await ann(ids.metab_dopac, 'name', '3,4-Dihydroxyphenylacetic acid (DOPAC)');
  await ann(ids.metab_dopac, 'type', 'metabolite');
  await ann(ids.metab_norepinephrine, 'name', 'Norepinephrine');
  await ann(ids.metab_norepinephrine, 'type', 'metabolite');

  // Batch 2 new mechanisms
  await ann(ids.mech_enteric_nervous, 'name', 'Enteric nervous system');
  await ann(ids.mech_enteric_nervous, 'type', 'mechanism');
  await ann(ids.mech_immune_cytokine, 'name', 'Immune cytokine pathway');
  await ann(ids.mech_immune_cytokine, 'type', 'mechanism');

  // ===== Batch 3: Papers 17-27 =====

  // Papers
  await ann(ids.paper_sudo_2004, 'title', 'Postnatal microbial colonization programs the hypothalamic-pituitary-adrenal system for stress response in mice');
  await ann(ids.paper_sudo_2004, 'journal', 'The Journal of Physiology');
  await ann(ids.paper_sudo_2004, 'year', 2004);
  await ann(ids.paper_sudo_2004, 'type', 'paper');
  await ann(ids.paper_sudo_2004, 'doi', '10.1113/jphysiol.2004.063388');
  await ann(ids.paper_sudo_2004, 'study_type', 'animal_study');

  await ann(ids.paper_bravo_2011, 'title', 'Ingestion of Lactobacillus strain regulates emotional behavior and central GABA receptor expression in a mouse via the vagus nerve');
  await ann(ids.paper_bravo_2011, 'journal', 'Proceedings of the National Academy of Sciences');
  await ann(ids.paper_bravo_2011, 'year', 2011);
  await ann(ids.paper_bravo_2011, 'type', 'paper');
  await ann(ids.paper_bravo_2011, 'doi', '10.1073/pnas.1102999108');
  await ann(ids.paper_bravo_2011, 'study_type', 'animal_study');

  await ann(ids.paper_kelly_2017, 'title', 'Lost in translation? The potential psychobiotic Lactobacillus rhamnosus (JB-1) fails to modulate stress or cognitive performance in healthy male subjects');
  await ann(ids.paper_kelly_2017, 'journal', 'Brain, Behavior, and Immunity');
  await ann(ids.paper_kelly_2017, 'year', 2017);
  await ann(ids.paper_kelly_2017, 'type', 'paper');
  await ann(ids.paper_kelly_2017, 'doi', '10.1016/j.bbi.2016.11.018');
  await ann(ids.paper_kelly_2017, 'study_type', 'clinical_trial');

  await ann(ids.paper_zheng_2016, 'title', 'Gut microbiome remodeling induces depressive-like behaviors through a pathway mediated by the host metabolism');
  await ann(ids.paper_zheng_2016, 'journal', 'Molecular Psychiatry');
  await ann(ids.paper_zheng_2016, 'year', 2016);
  await ann(ids.paper_zheng_2016, 'type', 'paper');
  await ann(ids.paper_zheng_2016, 'doi', '10.1038/mp.2016.44');
  await ann(ids.paper_zheng_2016, 'study_type', 'animal_study');

  await ann(ids.paper_kelly_2016, 'title', 'Transferring the blues: Depression-associated gut microbiota induces neurobehavioural changes in the rat');
  await ann(ids.paper_kelly_2016, 'journal', 'Journal of Psychiatric Research');
  await ann(ids.paper_kelly_2016, 'year', 2016);
  await ann(ids.paper_kelly_2016, 'type', 'paper');
  await ann(ids.paper_kelly_2016, 'doi', '10.1016/j.jpsychires.2016.07.019');
  await ann(ids.paper_kelly_2016, 'study_type', 'animal_study');

  await ann(ids.paper_nikolova_2021, 'title', 'Perturbations in Gut Microbiota Composition in Psychiatric Disorders: A Review and Meta-analysis');
  await ann(ids.paper_nikolova_2021, 'journal', 'JAMA Psychiatry');
  await ann(ids.paper_nikolova_2021, 'year', 2021);
  await ann(ids.paper_nikolova_2021, 'type', 'paper');
  await ann(ids.paper_nikolova_2021, 'doi', '10.1001/jamapsychiatry.2021.2573');
  await ann(ids.paper_nikolova_2021, 'study_type', 'review');

  await ann(ids.paper_tian_2022, 'title', 'Bifidobacterium breve CCFM1025 attenuates major depression disorder via regulating gut microbiome and tryptophan metabolism');
  await ann(ids.paper_tian_2022, 'journal', 'Brain, Behavior, and Immunity');
  await ann(ids.paper_tian_2022, 'year', 2022);
  await ann(ids.paper_tian_2022, 'type', 'paper');
  await ann(ids.paper_tian_2022, 'doi', '10.1016/j.bbi.2021.11.023');
  await ann(ids.paper_tian_2022, 'study_type', 'clinical_trial');

  await ann(ids.paper_rudzki_2019, 'title', 'Probiotic Lactobacillus Plantarum 299v decreases kynurenine concentration and improves cognitive functions in patients with major depression');
  await ann(ids.paper_rudzki_2019, 'journal', 'Psychoneuroendocrinology');
  await ann(ids.paper_rudzki_2019, 'year', 2019);
  await ann(ids.paper_rudzki_2019, 'type', 'paper');
  await ann(ids.paper_rudzki_2019, 'doi', '10.1016/j.psyneuen.2018.10.010');
  await ann(ids.paper_rudzki_2019, 'study_type', 'clinical_trial');

  await ann(ids.paper_chahwan_2019, 'title', 'Gut feelings: A randomised, triple-blind, placebo-controlled trial of probiotics for depressive symptoms');
  await ann(ids.paper_chahwan_2019, 'journal', 'Journal of Affective Disorders');
  await ann(ids.paper_chahwan_2019, 'year', 2019);
  await ann(ids.paper_chahwan_2019, 'type', 'paper');
  await ann(ids.paper_chahwan_2019, 'doi', '10.1016/j.jad.2019.04.097');
  await ann(ids.paper_chahwan_2019, 'study_type', 'clinical_trial');

  await ann(ids.paper_zhu_2020, 'title', 'Transplantation of microbiota from drug-free patients with schizophrenia causes schizophrenia-like abnormal behaviors and dysregulated kynurenine metabolism in mice');
  await ann(ids.paper_zhu_2020, 'journal', 'Molecular Psychiatry');
  await ann(ids.paper_zhu_2020, 'year', 2020);
  await ann(ids.paper_zhu_2020, 'type', 'paper');
  await ann(ids.paper_zhu_2020, 'doi', '10.1038/s41380-019-0475-4');
  await ann(ids.paper_zhu_2020, 'study_type', 'animal_study');

  await ann(ids.paper_ohare_2025, 'title', 'The saNeuroGut Initiative: Investigating the Gut Microbiome and Symptoms of Anxiety, Depression, and Posttraumatic Stress');
  await ann(ids.paper_ohare_2025, 'journal', 'Neuroimmunomodulation');
  await ann(ids.paper_ohare_2025, 'year', 2025);
  await ann(ids.paper_ohare_2025, 'type', 'paper');
  await ann(ids.paper_ohare_2025, 'doi', '10.1159/000542696');
  await ann(ids.paper_ohare_2025, 'study_type', 'cohort');

  // Batch 3 researchers
  const researchers3: [string, string][] = [
    [ids.researcher_sudo, 'Nobuyuki Sudo'],
    [ids.researcher_koga, 'Yasuhiro Koga'],
    [ids.researcher_bravo, 'Javier A Bravo'],
    [ids.researcher_forsythe, 'Paul Forsythe'],
    [ids.researcher_bienenstock, 'John Bienenstock'],
    [ids.researcher_kelly, 'John R Kelly'],
    [ids.researcher_clarke, 'Gerard Clarke'],
    [ids.researcher_zheng_peng, 'Peng Zheng'],
    [ids.researcher_xie_peng, 'Peng Xie'],
    [ids.researcher_nikolova, 'Viktoriya L Nikolova'],
    [ids.researcher_young, 'Allan H Young'],
    [ids.researcher_tian, 'Peijun Tian'],
    [ids.researcher_chen_wei, 'Wei Chen'],
    [ids.researcher_rudzki, 'Leszek Rudzki'],
    [ids.researcher_szulc, 'Agata Szulc'],
    [ids.researcher_chahwan, 'Bahia Chahwan'],
    [ids.researcher_roberts, 'Lynette Roberts'],
    [ids.researcher_zhu_feng, 'Feng Zhu'],
    [ids.researcher_ma_xiancang, 'Xiancang Ma'],
    [ids.researcher_ohare, 'Michaela A O\'Hare'],
    [ids.researcher_hemmings, 'Sian M J Hemmings'],
  ];
  for (const [id, name] of researchers3) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'researcher');
  }

  // Batch 3 institutions
  const institutions3: [string, string, string][] = [
    [ids.inst_kyushu, 'Kyushu University', 'Japan'],
    [ids.inst_chongqing, 'Chongqing Medical University', 'China'],
    [ids.inst_kings_college, 'King\'s College London', 'United Kingdom'],
    [ids.inst_jiangnan, 'Jiangnan University', 'China'],
    [ids.inst_bialystok, 'Medical University of Bialystok', 'Poland'],
    [ids.inst_uts, 'University of Technology Sydney', 'Australia'],
    [ids.inst_xian_jiaotong, 'Xi\'an Jiaotong University', 'China'],
    [ids.inst_stellenbosch, 'Stellenbosch University', 'South Africa'],
  ];
  for (const [id, name, country] of institutions3) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'institution');
    await ann(id, 'country', country);
  }

  // Batch 3 new bacteria
  const bacteria3: [string, string, string][] = [
    [ids.bact_l_plantarum, 'Lactobacillus plantarum', 'species'],
    [ids.bact_b_breve, 'Bifidobacterium breve', 'species'],
    [ids.bact_ruminococcus_gnavus, 'Ruminococcus gnavus', 'species'],
    [ids.bact_catenibacterium, 'Catenibacterium', 'genus'],
    [ids.bact_collinsella, 'Collinsella', 'genus'],
    [ids.bact_holdemanella, 'Holdemanella', 'genus'],
  ];
  for (const [id, name, rank] of bacteria3) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'bacterium');
    await ann(id, 'taxonomic_rank', rank);
  }

  // Batch 3 new metabolites
  await ann(ids.metab_kynurenine, 'name', 'Kynurenine');
  await ann(ids.metab_kynurenine, 'type', 'metabolite');
  await ann(ids.metab_corticosterone, 'name', 'Corticosterone');
  await ann(ids.metab_corticosterone, 'type', 'metabolite');

  // Batch 3 new mechanisms
  await ann(ids.mech_kynurenine_pathway, 'name', 'Tryptophan-kynurenine pathway');
  await ann(ids.mech_kynurenine_pathway, 'type', 'mechanism');
  await ann(ids.mech_developmental_window, 'name', 'Developmental critical window for microbial colonization');
  await ann(ids.mech_developmental_window, 'type', 'mechanism');
  await ann(ids.mech_fmt_transfer, 'name', 'Fecal microbiota transfer (behavior transfer)');
  await ann(ids.mech_fmt_transfer, 'type', 'mechanism');

  // Batch 3 new conditions
  await ann(ids.cond_ptsd, 'name', 'Post-traumatic Stress Disorder');
  await ann(ids.cond_ptsd, 'type', 'condition');

  return count;
}

/**
 * Seed relationships between entities.
 */
async function seedRelationships(db: RhizomeDB, author: string): Promise<number> {
  let count = 0;

  async function rel(roleA: string, a: string, ctxA: string, roleB: string, b: string, ctxB: string): Promise<void> {
    await db.relate(roleA, a, ctxA, roleB, b, ctxB, author);
    count++;
  }

  // ===== Paper → Researcher (authored_by) =====

  // Paper 1: Mehta et al.
  await rel('paper', ids.paper_mehta_2025, 'authors', 'author', ids.researcher_mehta, 'papers');
  await rel('paper', ids.paper_mehta_2025, 'authors', 'author', ids.researcher_juneja, 'papers');

  // Paper 2: Cao et al.
  await rel('paper', ids.paper_cao_2025, 'authors', 'author', ids.researcher_cao, 'papers');
  await rel('paper', ids.paper_cao_2025, 'authors', 'author', ids.researcher_meng, 'papers');

  // Paper 3: Rathore et al. — includes Sunil Naik (shared with paper 5)
  await rel('paper', ids.paper_rathore_2025, 'authors', 'author', ids.researcher_rathore, 'papers');
  await rel('paper', ids.paper_rathore_2025, 'authors', 'author', ids.researcher_shukla, 'papers');
  await rel('paper', ids.paper_rathore_2025, 'authors', 'author', ids.researcher_naik, 'papers');

  // Paper 4: Zhang et al.
  await rel('paper', ids.paper_zhang_2025, 'authors', 'author', ids.researcher_zhang, 'papers');
  await rel('paper', ids.paper_zhang_2025, 'authors', 'author', ids.researcher_jiang, 'papers');
  await rel('paper', ids.paper_zhang_2025, 'authors', 'author', ids.researcher_song, 'papers');

  // Paper 5: Shaikh et al. — includes Sunil Naik (shared with paper 3)
  await rel('paper', ids.paper_shaikh_2025, 'authors', 'author', ids.researcher_shaikh, 'papers');
  await rel('paper', ids.paper_shaikh_2025, 'authors', 'author', ids.researcher_dey, 'papers');
  await rel('paper', ids.paper_shaikh_2025, 'authors', 'author', ids.researcher_naik, 'papers');
  await rel('paper', ids.paper_shaikh_2025, 'authors', 'author', ids.researcher_hasan, 'papers');

  // Paper 6: Radjabzadeh et al.
  await rel('paper', ids.paper_radjabzadeh_2022, 'authors', 'author', ids.researcher_radjabzadeh, 'papers');
  await rel('paper', ids.paper_radjabzadeh_2022, 'authors', 'author', ids.researcher_kraaij, 'papers');
  await rel('paper', ids.paper_radjabzadeh_2022, 'authors', 'author', ids.researcher_amin, 'papers');
  await rel('paper', ids.paper_radjabzadeh_2022, 'authors', 'author', ids.researcher_van_duijn, 'papers');

  // ===== Researcher → Institution =====
  await rel('researcher', ids.researcher_mehta, 'affiliations', 'member', ids.inst_maharaja, 'researchers');
  await rel('researcher', ids.researcher_cao, 'affiliations', 'member', ids.inst_shandong, 'researchers');
  await rel('researcher', ids.researcher_meng, 'affiliations', 'member', ids.inst_shandong, 'researchers');
  await rel('researcher', ids.researcher_zhang, 'affiliations', 'member', ids.inst_guangxi, 'researchers');
  await rel('researcher', ids.researcher_jiang, 'affiliations', 'member', ids.inst_guangxi, 'researchers');
  await rel('researcher', ids.researcher_song, 'affiliations', 'member', ids.inst_guangxi, 'researchers');
  await rel('researcher', ids.researcher_shaikh, 'affiliations', 'member', ids.inst_mgm_indore, 'researchers');
  await rel('researcher', ids.researcher_dey, 'affiliations', 'member', ids.inst_brainware, 'researchers');
  await rel('researcher', ids.researcher_hasan, 'affiliations', 'member', ids.inst_aligarh, 'researchers');
  await rel('researcher', ids.researcher_radjabzadeh, 'affiliations', 'member', ids.inst_erasmus, 'researchers');
  await rel('researcher', ids.researcher_kraaij, 'affiliations', 'member', ids.inst_erasmus, 'researchers');
  await rel('researcher', ids.researcher_amin, 'affiliations', 'member', ids.inst_erasmus, 'researchers');
  await rel('researcher', ids.researcher_van_duijn, 'affiliations', 'member', ids.inst_erasmus, 'researchers');

  // ===== Bacterium → produces → Metabolite =====
  await rel('producer', ids.bact_lactobacillus, 'produces', 'product', ids.metab_gaba, 'produced_by');
  await rel('producer', ids.bact_lactobacillus, 'produces', 'product', ids.metab_serotonin, 'produced_by');
  await rel('producer', ids.bact_bifidobacterium, 'produces', 'product', ids.metab_gaba, 'produced_by');
  await rel('producer', ids.bact_bacteroides, 'produces', 'product', ids.metab_gaba, 'produced_by');
  await rel('producer', ids.bact_enterococcus, 'produces', 'product', ids.metab_serotonin, 'produced_by');
  await rel('producer', ids.bact_enterococcus, 'produces', 'product', ids.metab_dopamine, 'produced_by');
  await rel('producer', ids.bact_bacillus, 'produces', 'product', ids.metab_dopamine, 'produced_by');
  await rel('producer', ids.bact_streptococcus, 'produces', 'product', ids.metab_serotonin, 'produced_by');
  await rel('producer', ids.bact_faecalibacterium, 'produces', 'product', ids.metab_butyrate, 'produced_by');
  await rel('producer', ids.bact_coprococcus, 'produces', 'product', ids.metab_butyrate, 'produced_by');
  await rel('producer', ids.bact_ruminococcaceae, 'produces', 'product', ids.metab_butyrate, 'produced_by');

  // ===== Batch 2: Paper → Researcher =====

  // Paper 7: Tillisch et al. 2013
  await rel('paper', ids.paper_tillisch_2013, 'authors', 'author', ids.researcher_tillisch, 'papers');
  await rel('paper', ids.paper_tillisch_2013, 'authors', 'author', ids.researcher_labus, 'papers');

  // Paper 8: Kang et al. 2019
  await rel('paper', ids.paper_kang_2019, 'authors', 'author', ids.researcher_kang, 'papers');
  await rel('paper', ids.paper_kang_2019, 'authors', 'author', ids.researcher_adams, 'papers');
  await rel('paper', ids.paper_kang_2019, 'authors', 'author', ids.researcher_krajmalnik_brown, 'papers');

  // Paper 9: Liu et al. 2020
  await rel('paper', ids.paper_liu_2020, 'authors', 'author', ids.researcher_liu_tong, 'papers');

  // Paper 10: Valles-Colomer et al. 2019
  await rel('paper', ids.paper_valles_colomer_2019, 'authors', 'author', ids.researcher_valles_colomer, 'papers');
  await rel('paper', ids.paper_valles_colomer_2019, 'authors', 'author', ids.researcher_raes, 'papers');
  await rel('paper', ids.paper_valles_colomer_2019, 'authors', 'author', ids.researcher_falony, 'papers');

  // Paper 11: Pinto-Sanchez et al. 2017
  await rel('paper', ids.paper_pinto_sanchez_2017, 'authors', 'author', ids.researcher_pinto_sanchez, 'papers');

  // Paper 12: Messaoudi et al. 2011
  await rel('paper', ids.paper_messaoudi_2011, 'authors', 'author', ids.researcher_messaoudi, 'papers');

  // Paper 13: Steenbergen et al. 2015
  await rel('paper', ids.paper_steenbergen_2015, 'authors', 'author', ids.researcher_steenbergen, 'papers');

  // Paper 14: Akkasheh et al. 2016
  await rel('paper', ids.paper_akkasheh_2016, 'authors', 'author', ids.researcher_akkasheh, 'papers');

  // Paper 15: Slykerman et al. 2017
  await rel('paper', ids.paper_slykerman_2017, 'authors', 'author', ids.researcher_slykerman, 'papers');

  // Paper 16: Dinan & Cryan 2013
  await rel('paper', ids.paper_dinan_2013, 'authors', 'author', ids.researcher_dinan, 'papers');
  await rel('paper', ids.paper_dinan_2013, 'authors', 'author', ids.researcher_cryan, 'papers');

  // ===== Batch 2: Researcher → Institution =====
  await rel('researcher', ids.researcher_tillisch, 'affiliations', 'member', ids.inst_ucla, 'researchers');
  await rel('researcher', ids.researcher_labus, 'affiliations', 'member', ids.inst_ucla, 'researchers');
  await rel('researcher', ids.researcher_kang, 'affiliations', 'member', ids.inst_arizona_state, 'researchers');
  await rel('researcher', ids.researcher_adams, 'affiliations', 'member', ids.inst_arizona_state, 'researchers');
  await rel('researcher', ids.researcher_krajmalnik_brown, 'affiliations', 'member', ids.inst_arizona_state, 'researchers');
  await rel('researcher', ids.researcher_liu_tong, 'affiliations', 'member', ids.inst_qilu_shandong, 'researchers');
  await rel('researcher', ids.researcher_valles_colomer, 'affiliations', 'member', ids.inst_ku_leuven, 'researchers');
  await rel('researcher', ids.researcher_raes, 'affiliations', 'member', ids.inst_ku_leuven, 'researchers');
  await rel('researcher', ids.researcher_falony, 'affiliations', 'member', ids.inst_ku_leuven, 'researchers');
  await rel('researcher', ids.researcher_pinto_sanchez, 'affiliations', 'member', ids.inst_mcmaster, 'researchers');
  await rel('researcher', ids.researcher_steenbergen, 'affiliations', 'member', ids.inst_leiden, 'researchers');
  await rel('researcher', ids.researcher_akkasheh, 'affiliations', 'member', ids.inst_kashan, 'researchers');
  await rel('researcher', ids.researcher_slykerman, 'affiliations', 'member', ids.inst_auckland, 'researchers');
  await rel('researcher', ids.researcher_dinan, 'affiliations', 'member', ids.inst_ucc_cork, 'researchers');
  await rel('researcher', ids.researcher_cryan, 'affiliations', 'member', ids.inst_ucc_cork, 'researchers');

  // ===== Batch 2: Bacterium → produces → Metabolite =====
  await rel('producer', ids.bact_eubacterium_rectale, 'produces', 'product', ids.metab_butyrate, 'produced_by');
  await rel('producer', ids.bact_b_longum, 'produces', 'product', ids.metab_gaba, 'produced_by');
  await rel('producer', ids.bact_l_helveticus, 'produces', 'product', ids.metab_gaba, 'produced_by');
  await rel('producer', ids.bact_b_infantis, 'produces', 'product', ids.metab_tryptophan, 'produced_by');

  // ===== Batch 3: Paper → Researcher =====

  // Paper 17: Sudo et al. 2004
  await rel('paper', ids.paper_sudo_2004, 'authors', 'author', ids.researcher_sudo, 'papers');
  await rel('paper', ids.paper_sudo_2004, 'authors', 'author', ids.researcher_koga, 'papers');

  // Paper 18: Bravo et al. 2011 (Cryan + Dinan already exist)
  await rel('paper', ids.paper_bravo_2011, 'authors', 'author', ids.researcher_bravo, 'papers');
  await rel('paper', ids.paper_bravo_2011, 'authors', 'author', ids.researcher_forsythe, 'papers');
  await rel('paper', ids.paper_bravo_2011, 'authors', 'author', ids.researcher_bienenstock, 'papers');
  await rel('paper', ids.paper_bravo_2011, 'authors', 'author', ids.researcher_dinan, 'papers');
  await rel('paper', ids.paper_bravo_2011, 'authors', 'author', ids.researcher_cryan, 'papers');

  // Paper 19: Kelly et al. 2017 (Cryan, Dinan, Bienenstock already exist)
  await rel('paper', ids.paper_kelly_2017, 'authors', 'author', ids.researcher_kelly, 'papers');
  await rel('paper', ids.paper_kelly_2017, 'authors', 'author', ids.researcher_bienenstock, 'papers');
  await rel('paper', ids.paper_kelly_2017, 'authors', 'author', ids.researcher_cryan, 'papers');
  await rel('paper', ids.paper_kelly_2017, 'authors', 'author', ids.researcher_clarke, 'papers');
  await rel('paper', ids.paper_kelly_2017, 'authors', 'author', ids.researcher_dinan, 'papers');

  // Paper 20: Zheng et al. 2016
  await rel('paper', ids.paper_zheng_2016, 'authors', 'author', ids.researcher_zheng_peng, 'papers');
  await rel('paper', ids.paper_zheng_2016, 'authors', 'author', ids.researcher_xie_peng, 'papers');

  // Paper 21: Kelly et al. 2016 (Cryan, Dinan already exist)
  await rel('paper', ids.paper_kelly_2016, 'authors', 'author', ids.researcher_kelly, 'papers');
  await rel('paper', ids.paper_kelly_2016, 'authors', 'author', ids.researcher_cryan, 'papers');
  await rel('paper', ids.paper_kelly_2016, 'authors', 'author', ids.researcher_dinan, 'papers');

  // Paper 22: Nikolova et al. 2021
  await rel('paper', ids.paper_nikolova_2021, 'authors', 'author', ids.researcher_nikolova, 'papers');
  await rel('paper', ids.paper_nikolova_2021, 'authors', 'author', ids.researcher_young, 'papers');

  // Paper 23: Tian et al. 2022
  await rel('paper', ids.paper_tian_2022, 'authors', 'author', ids.researcher_tian, 'papers');
  await rel('paper', ids.paper_tian_2022, 'authors', 'author', ids.researcher_chen_wei, 'papers');

  // Paper 24: Rudzki et al. 2019
  await rel('paper', ids.paper_rudzki_2019, 'authors', 'author', ids.researcher_rudzki, 'papers');
  await rel('paper', ids.paper_rudzki_2019, 'authors', 'author', ids.researcher_szulc, 'papers');

  // Paper 25: Chahwan et al. 2019
  await rel('paper', ids.paper_chahwan_2019, 'authors', 'author', ids.researcher_chahwan, 'papers');
  await rel('paper', ids.paper_chahwan_2019, 'authors', 'author', ids.researcher_roberts, 'papers');

  // Paper 26: Zhu et al. 2020
  await rel('paper', ids.paper_zhu_2020, 'authors', 'author', ids.researcher_zhu_feng, 'papers');
  await rel('paper', ids.paper_zhu_2020, 'authors', 'author', ids.researcher_ma_xiancang, 'papers');

  // Paper 27: O'Hare et al. 2025
  await rel('paper', ids.paper_ohare_2025, 'authors', 'author', ids.researcher_ohare, 'papers');
  await rel('paper', ids.paper_ohare_2025, 'authors', 'author', ids.researcher_hemmings, 'papers');

  // ===== Batch 3: Researcher → Institution =====
  await rel('researcher', ids.researcher_sudo, 'affiliations', 'member', ids.inst_kyushu, 'researchers');
  await rel('researcher', ids.researcher_koga, 'affiliations', 'member', ids.inst_kyushu, 'researchers');
  await rel('researcher', ids.researcher_bravo, 'affiliations', 'member', ids.inst_ucc_cork, 'researchers');
  await rel('researcher', ids.researcher_forsythe, 'affiliations', 'member', ids.inst_mcmaster, 'researchers');
  await rel('researcher', ids.researcher_bienenstock, 'affiliations', 'member', ids.inst_mcmaster, 'researchers');
  await rel('researcher', ids.researcher_kelly, 'affiliations', 'member', ids.inst_ucc_cork, 'researchers');
  await rel('researcher', ids.researcher_clarke, 'affiliations', 'member', ids.inst_ucc_cork, 'researchers');
  await rel('researcher', ids.researcher_zheng_peng, 'affiliations', 'member', ids.inst_chongqing, 'researchers');
  await rel('researcher', ids.researcher_xie_peng, 'affiliations', 'member', ids.inst_chongqing, 'researchers');
  await rel('researcher', ids.researcher_nikolova, 'affiliations', 'member', ids.inst_kings_college, 'researchers');
  await rel('researcher', ids.researcher_young, 'affiliations', 'member', ids.inst_kings_college, 'researchers');
  await rel('researcher', ids.researcher_tian, 'affiliations', 'member', ids.inst_jiangnan, 'researchers');
  await rel('researcher', ids.researcher_chen_wei, 'affiliations', 'member', ids.inst_jiangnan, 'researchers');
  await rel('researcher', ids.researcher_rudzki, 'affiliations', 'member', ids.inst_bialystok, 'researchers');
  await rel('researcher', ids.researcher_szulc, 'affiliations', 'member', ids.inst_bialystok, 'researchers');
  await rel('researcher', ids.researcher_chahwan, 'affiliations', 'member', ids.inst_uts, 'researchers');
  await rel('researcher', ids.researcher_roberts, 'affiliations', 'member', ids.inst_uts, 'researchers');
  await rel('researcher', ids.researcher_zhu_feng, 'affiliations', 'member', ids.inst_xian_jiaotong, 'researchers');
  await rel('researcher', ids.researcher_ma_xiancang, 'affiliations', 'member', ids.inst_xian_jiaotong, 'researchers');
  await rel('researcher', ids.researcher_ohare, 'affiliations', 'member', ids.inst_stellenbosch, 'researchers');
  await rel('researcher', ids.researcher_hemmings, 'affiliations', 'member', ids.inst_stellenbosch, 'researchers');

  // ===== Batch 3: Bacterium → produces → Metabolite =====
  await rel('producer', ids.bact_l_plantarum, 'produces', 'product', ids.metab_gaba, 'produced_by');
  await rel('producer', ids.bact_b_breve, 'produces', 'product', ids.metab_gaba, 'produced_by');

  // ===== Batch 3: Taxonomic hierarchy =====
  await rel('species', ids.bact_l_plantarum, 'genus', 'genus', ids.bact_lactobacillus, 'species');
  await rel('species', ids.bact_b_breve, 'genus', 'genus', ids.bact_bifidobacterium, 'species');

  // ===== Taxonomic hierarchy: species → genus =====
  // This allows genus-level queries to discover species-level claims
  await rel('species', ids.bact_b_longum, 'genus', 'genus', ids.bact_bifidobacterium, 'species');
  await rel('species', ids.bact_b_infantis, 'genus', 'genus', ids.bact_bifidobacterium, 'species');
  await rel('species', ids.bact_l_rhamnosus, 'genus', 'genus', ids.bact_lactobacillus, 'species');
  await rel('species', ids.bact_l_helveticus, 'genus', 'genus', ids.bact_lactobacillus, 'species');
  await rel('species', ids.bact_l_acidophilus, 'genus', 'genus', ids.bact_lactobacillus, 'species');
  await rel('species', ids.bact_l_casei, 'genus', 'genus', ids.bact_lactobacillus, 'species');
  await rel('species', ids.bact_eubacterium_rectale, 'genus', 'genus', ids.bact_firmicutes, 'species');

  return count;
}

/**
 * Seed claims — the specific assertions each paper makes.
 * Each claim is a first-class entity linked to its paper and the concepts it references.
 */
async function seedClaims(db: RhizomeDB, author: string): Promise<number> {
  let count = 0;

  async function ann(entityId: string, property: string, value: string | number | boolean): Promise<void> {
    await db.annotate(entityId, property, value, author);
    count++;
  }

  async function rel(roleA: string, a: string, ctxA: string, roleB: string, b: string, ctxB: string): Promise<void> {
    await db.relate(roleA, a, ctxA, roleB, b, ctxB, author);
    count++;
  }

  async function makeClaim(
    paperId: string,
    statement: string,
    bacteria: string[],
    metabolites: string[],
    mechanisms: string[],
    conditions: string[],
    direction?: string
  ): Promise<string> {
    const cid = claimId(paperId);
    await ann(cid, 'type', 'claim');
    await ann(cid, 'statement', statement);
    if (direction) await ann(cid, 'direction', direction);

    await rel('source', paperId, 'claims', 'claim', cid, 'source_paper');
    for (const b of bacteria) await rel('claim', cid, 'bacteria', 'subject', b, 'claims_about');
    for (const m of metabolites) await rel('claim', cid, 'metabolites', 'subject', m, 'claims_about');
    for (const mech of mechanisms) await rel('claim', cid, 'mechanisms', 'subject', mech, 'claims_about');
    for (const c of conditions) await rel('claim', cid, 'conditions', 'subject', c, 'claims_about');
    return cid;
  }

  // ===================================================================
  // Paper 1: Mehta et al. 2025 — Cureus mood disorders review
  // ===================================================================
  await makeClaim(ids.paper_mehta_2025,
    'Lactobacilli and Bifidobacterium produce acetylcholine and GABA',
    [ids.bact_lactobacillus, ids.bact_bifidobacterium], [ids.metab_gaba], [], []);

  await makeClaim(ids.paper_mehta_2025,
    'Candida, Streptococcus, Escherichia, and Enterococcus secrete serotonin',
    [ids.bact_streptococcus, ids.bact_enterococcus], [ids.metab_serotonin], [], []);

  await makeClaim(ids.paper_mehta_2025,
    'Bacillus and Serratia produce dopamine',
    [ids.bact_bacillus], [ids.metab_dopamine], [], []);

  await makeClaim(ids.paper_mehta_2025,
    'SCFAs cross the blood-brain barrier through monocarboxylate transporters and reduce neuroinflammation',
    [], [ids.metab_scfa], [ids.mech_bbb, ids.mech_neuroinflammation], []);

  await makeClaim(ids.paper_mehta_2025,
    'Low SCFA levels correlate with major depressive disorder',
    [], [ids.metab_scfa], [], [ids.cond_depression], 'decreased_in_disease');

  await makeClaim(ids.paper_mehta_2025,
    'Flavonifractor degrades quercetin and is associated with elevated oxidative stress in bipolar disorder',
    [ids.bact_flavonifractor], [], [], [ids.cond_bipolar], 'increased_in_disease');

  await makeClaim(ids.paper_mehta_2025,
    'Vagus nerve transmits gut signals to brainstem affecting mood',
    [], [], [ids.mech_vagus], [ids.cond_depression, ids.cond_anxiety]);

  await makeClaim(ids.paper_mehta_2025,
    'HPA axis dysregulation in depression linked to gut dysbiosis',
    [], [ids.metab_cortisol], [ids.mech_hpa], [ids.cond_depression]);

  // ===================================================================
  // Paper 2: Cao et al. 2025 — BMC Psychiatry systematic review
  // ===================================================================
  await makeClaim(ids.paper_cao_2025,
    'Alistipes enriched in depression across 7 studies',
    [ids.bact_alistipes], [], [], [ids.cond_depression], 'increased_in_disease');

  await makeClaim(ids.paper_cao_2025,
    'Eggerthella enriched in depression',
    [ids.bact_eggerthella], [], [], [ids.cond_depression], 'increased_in_disease');

  await makeClaim(ids.paper_cao_2025,
    'Prevotella and Faecalibacterium depleted in depression',
    [ids.bact_prevotella, ids.bact_faecalibacterium], [ids.metab_butyrate], [], [ids.cond_depression], 'decreased_in_disease');

  await makeClaim(ids.paper_cao_2025,
    'Actinobacteria and Proteobacteria enriched at phylum level in depression',
    [ids.bact_actinobacteria, ids.bact_proteobacteria], [], [], [ids.cond_depression], 'increased_in_disease');

  await makeClaim(ids.paper_cao_2025,
    'Lachnospira and Faecalibacterium decreased in anxiety',
    [ids.bact_lachnospira, ids.bact_faecalibacterium], [], [], [ids.cond_anxiety], 'decreased_in_disease');

  await makeClaim(ids.paper_cao_2025,
    'Gut microbiota influence mental health through neural, immune, and chemical signal networks including vagus nerve and HPA axis',
    [], [ids.metab_butyrate], [ids.mech_vagus, ids.mech_hpa], [ids.cond_depression, ids.cond_anxiety]);

  // ===================================================================
  // Paper 3: Rathore et al. 2025 — Cureus bidirectional review
  // ===================================================================
  await makeClaim(ids.paper_rathore_2025,
    'Lactobacillus and Bifidobacterium increase tryptophan availability for serotonin synthesis',
    [ids.bact_lactobacillus, ids.bact_bifidobacterium], [ids.metab_tryptophan, ids.metab_serotonin], [], []);

  await makeClaim(ids.paper_rathore_2025,
    'Enterococcus and Bacillus contribute to dopamine production; disruptions linked to anhedonia',
    [ids.bact_enterococcus, ids.bact_bacillus], [ids.metab_dopamine], [], [ids.cond_depression]);

  await makeClaim(ids.paper_rathore_2025,
    'Bacteroides and Lactobacillus synthesize GABA, reducing neuronal excitability',
    [ids.bact_bacteroides, ids.bact_lactobacillus], [ids.metab_gaba], [], []);

  await makeClaim(ids.paper_rathore_2025,
    'Proteobacteria pathogenic overrepresentation associated with psychiatric disorders',
    [ids.bact_proteobacteria], [], [], [ids.cond_depression, ids.cond_anxiety, ids.cond_schizophrenia], 'increased_in_disease');

  await makeClaim(ids.paper_rathore_2025,
    'Butyrate increases brain-derived neurotrophic factor synthesis',
    [], [ids.metab_butyrate, ids.metab_bdnf], [], []);

  await makeClaim(ids.paper_rathore_2025,
    'Approximately 90% of body serotonin produced by enterochromaffin cells in response to microbial metabolites',
    [], [ids.metab_serotonin], [], []);

  await makeClaim(ids.paper_rathore_2025,
    'Dysbiosis increases neuroinflammation via LPS translocation through leaky gut',
    [], [ids.metab_lps], [ids.mech_neuroinflammation, ids.mech_leaky_gut], [ids.cond_depression]);

  // ===================================================================
  // Paper 4: Zhang et al. 2025 — Frontiers multimodal interventions
  // ===================================================================
  await makeClaim(ids.paper_zhang_2025,
    'Vagus nerve stimulation produces anxiolytic effects through noradrenergic pathways and AMPAR-mediated neurotransmission',
    [], [], [ids.mech_vagus], [ids.cond_anxiety]);

  await makeClaim(ids.paper_zhang_2025,
    'Gut dysbiosis disrupts HPA signaling, elevating cortisol and worsening anxiety/depression',
    [], [ids.metab_cortisol], [ids.mech_hpa], [ids.cond_depression, ids.cond_anxiety]);

  await makeClaim(ids.paper_zhang_2025,
    'Dysbiosis increases intestinal permeability allowing LPS to trigger pro-inflammatory cytokines (IL-6, IL-1β, TNF-α)',
    [], [ids.metab_lps], [ids.mech_leaky_gut, ids.mech_neuroinflammation], [ids.cond_depression, ids.cond_anxiety]);

  await makeClaim(ids.paper_zhang_2025,
    'SCFAs cross blood-brain barrier and reduce neuroinflammation by inhibiting histone deacetylase activity',
    [], [ids.metab_scfa], [ids.mech_bbb, ids.mech_neuroinflammation], []);

  await makeClaim(ids.paper_zhang_2025,
    'Reduced butyrate availability disrupts mental health through altered BDNF expression',
    [], [ids.metab_butyrate, ids.metab_bdnf], [], [ids.cond_depression], 'decreased_in_disease');

  await makeClaim(ids.paper_zhang_2025,
    'Approximately 3.15% of global population suffers from MDD while 4.80% experience anxiety disorders',
    [], [], [], [ids.cond_depression, ids.cond_anxiety]);

  // ===================================================================
  // Paper 5: Shaikh et al. 2025 — Cureus systematic review
  // ===================================================================
  await makeClaim(ids.paper_shaikh_2025,
    'Depression associated with reduced bacterial diversity and elevated Firmicutes levels',
    [ids.bact_firmicutes], [], [], [ids.cond_depression], 'increased_in_disease');

  await makeClaim(ids.paper_shaikh_2025,
    'Anxiety characterized by low SCFA-producing bacteria and increased Proteobacteria',
    [ids.bact_proteobacteria], [ids.metab_scfa], [], [ids.cond_anxiety], 'increased_in_disease');

  await makeClaim(ids.paper_shaikh_2025,
    'Schizophrenia linked to endotoxemia and decreased Lactobacillus populations',
    [ids.bact_lactobacillus], [ids.metab_lps], [], [ids.cond_schizophrenia], 'decreased_in_disease');

  await makeClaim(ids.paper_shaikh_2025,
    'Bipolar disorder shows altered Firmicutes/Bacteroidetes ratios',
    [ids.bact_firmicutes, ids.bact_bacteroides], [], [], [ids.cond_bipolar]);

  await makeClaim(ids.paper_shaikh_2025,
    'Probiotics and dietary changes were as effective as drug treatment in alleviating symptoms',
    [], [], [], [ids.cond_depression, ids.cond_anxiety]);

  // ===================================================================
  // Paper 6: Radjabzadeh et al. 2022 — Nature Communications MWAS
  // ===================================================================
  await makeClaim(ids.paper_radjabzadeh_2022,
    'Eggerthella associated with depressive symptoms in cohort of 1054 participants, replicated in 1539',
    [ids.bact_eggerthella], [], [], [ids.cond_depression], 'increased_in_disease');

  await makeClaim(ids.paper_radjabzadeh_2022,
    'Coprococcus depleted in individuals with depressive symptoms',
    [ids.bact_coprococcus], [], [], [ids.cond_depression], 'decreased_in_disease');

  await makeClaim(ids.paper_radjabzadeh_2022,
    'Subdoligranulum and Sellimonas enriched in depressive symptoms',
    [ids.bact_subdoligranulum, ids.bact_sellimonas], [], [], [ids.cond_depression], 'increased_in_disease');

  await makeClaim(ids.paper_radjabzadeh_2022,
    'Hungatella and Ruminococcaceae enriched in depressive symptoms',
    [ids.bact_hungatella, ids.bact_ruminococcaceae], [], [], [ids.cond_depression], 'increased_in_disease');

  await makeClaim(ids.paper_radjabzadeh_2022,
    'Depression-associated bacteria involved in synthesis of glutamate, butyrate, serotonin and GABA',
    [], [ids.metab_glutamate, ids.metab_butyrate, ids.metab_serotonin, ids.metab_gaba], [], [ids.cond_depression]);

  // ===================================================================
  // Paper 7: Tillisch et al. 2013 — Gastroenterology fMRI study
  // ===================================================================
  await makeClaim(ids.paper_tillisch_2013,
    'Probiotic consumption modulates brain activity during emotional tasks as shown by fMRI',
    [], [], [ids.mech_vagus], []);

  await makeClaim(ids.paper_tillisch_2013,
    'Fermented milk with probiotics increased connectivity between periaqueductal grey and prefrontal cortex',
    [], [], [], []);

  await makeClaim(ids.paper_tillisch_2013,
    'First demonstration in humans that ingested bacteria alter brain function',
    [], [], [ids.mech_vagus, ids.mech_enteric_nervous], []);

  // ===================================================================
  // Paper 8: Kang et al. 2019 — Autism MTT study
  // ===================================================================
  await makeClaim(ids.paper_kang_2019,
    'Microbiota Transfer Therapy produced 45% reduction in core ASD symptoms at 2-year follow-up',
    [], [], [], [ids.cond_autism]);

  await makeClaim(ids.paper_kang_2019,
    'Persistent increases in Bifidobacteria and Prevotella observed 2 years post-treatment',
    [ids.bact_bifidobacterium, ids.bact_prevotella], [], [], [ids.cond_autism], 'increased_in_treatment');

  await makeClaim(ids.paper_kang_2019,
    'GI symptoms improved alongside behavioral improvements suggesting gut-brain connection in autism',
    [], [], [ids.mech_enteric_nervous], [ids.cond_autism]);

  // ===================================================================
  // Paper 9: Liu et al. 2020 — IBS comorbidity study (Shandong!)
  // ===================================================================
  await makeClaim(ids.paper_liu_2020,
    'Faecalibacterium and Eubacterium rectale depleted in IBS-D patients with depression comorbidity',
    [ids.bact_faecalibacterium, ids.bact_eubacterium_rectale], [ids.metab_butyrate], [], [ids.cond_ibs, ids.cond_depression], 'decreased_in_disease');

  await makeClaim(ids.paper_liu_2020,
    'Subdoligranulum depleted in IBS-D patients with psychiatric comorbidity',
    [ids.bact_subdoligranulum], [], [], [ids.cond_ibs, ids.cond_depression], 'decreased_in_disease');

  await makeClaim(ids.paper_liu_2020,
    'Nearly 30% of IBS patients have depression or anxiety comorbidity',
    [], [], [], [ids.cond_ibs, ids.cond_depression, ids.cond_anxiety]);

  await makeClaim(ids.paper_liu_2020,
    'Specific microbial genera and metabolites correlated with both bowel symptoms and depression/anxiety',
    [], [ids.metab_butyrate], [ids.mech_enteric_nervous], [ids.cond_ibs, ids.cond_depression, ids.cond_anxiety]);

  // ===================================================================
  // Paper 10: Valles-Colomer et al. 2019 — Nature Microbiology cohort
  // ===================================================================
  await makeClaim(ids.paper_valles_colomer_2019,
    'Faecalibacterium and Coprococcus associated with higher quality of life indicators',
    [ids.bact_faecalibacterium, ids.bact_coprococcus], [ids.metab_butyrate], [], []);

  await makeClaim(ids.paper_valles_colomer_2019,
    'Coprococcus and Dialister depleted in depression even after controlling for antidepressant use',
    [ids.bact_coprococcus, ids.bact_dialister], [], [], [ids.cond_depression], 'decreased_in_disease');

  await makeClaim(ids.paper_valles_colomer_2019,
    'Microbial synthesis of dopamine metabolite DOPAC correlated with mental quality of life',
    [], [ids.metab_dopac, ids.metab_dopamine], [], [ids.cond_depression]);

  await makeClaim(ids.paper_valles_colomer_2019,
    'GABA production potential of gut microbiota linked to depression',
    [], [ids.metab_gaba], [], [ids.cond_depression]);

  await makeClaim(ids.paper_valles_colomer_2019,
    'Findings validated across Belgian (Flemish Gut Flora Project, n=1054) and Dutch (LifeLines DEEP, n=1070) cohorts',
    [], [], [], [ids.cond_depression]);

  // ===================================================================
  // Paper 11: Pinto-Sanchez et al. 2017 — IBS probiotic trial
  // ===================================================================
  await makeClaim(ids.paper_pinto_sanchez_2017,
    'Bifidobacterium longum NCC3001 reduced depression scores in IBS patients (64% vs 32% placebo)',
    [ids.bact_b_longum], [], [], [ids.cond_ibs, ids.cond_depression]);

  await makeClaim(ids.paper_pinto_sanchez_2017,
    'fMRI showed reduced amygdala and fronto-limbic responses to negative emotional stimuli after probiotic',
    [ids.bact_b_longum], [], [ids.mech_vagus], [ids.cond_depression]);

  await makeClaim(ids.paper_pinto_sanchez_2017,
    'Brain activity changes correlated with clinical depression improvements',
    [], [], [ids.mech_vagus], [ids.cond_depression, ids.cond_ibs]);

  // ===================================================================
  // Paper 12: Messaoudi et al. 2011 — French psychobiotic trial
  // ===================================================================
  await makeClaim(ids.paper_messaoudi_2011,
    'L. helveticus R0052 and B. longum R0175 combination reduced psychological distress in healthy volunteers',
    [ids.bact_l_helveticus, ids.bact_b_longum], [], [], [ids.cond_depression, ids.cond_anxiety]);

  await makeClaim(ids.paper_messaoudi_2011,
    'Probiotic formulation reduced 24-hour urinary free cortisol levels',
    [], [ids.metab_cortisol], [ids.mech_hpa], []);

  await makeClaim(ids.paper_messaoudi_2011,
    'Reduced somatisation, depression, and anger-hostility scores on HSCL-90',
    [], [], [], [ids.cond_depression, ids.cond_anxiety]);

  // ===================================================================
  // Paper 13: Steenbergen et al. 2015 — Cognitive reactivity trial
  // ===================================================================
  await makeClaim(ids.paper_steenbergen_2015,
    'Multispecies probiotic significantly reduced cognitive reactivity to sad mood in healthy participants',
    [ids.bact_bifidobacterium, ids.bact_lactobacillus], [], [], [ids.cond_depression]);

  await makeClaim(ids.paper_steenbergen_2015,
    'Strongest probiotic effects on rumination and aggressive thoughts — key cognitive vulnerability factors for depression',
    [], [], [], [ids.cond_depression]);

  // ===================================================================
  // Paper 14: Akkasheh et al. 2016 — Iranian MDD trial
  // ===================================================================
  await makeClaim(ids.paper_akkasheh_2016,
    'L. acidophilus, L. casei, and B. bifidum combination reduced Beck Depression Inventory scores in MDD patients',
    [ids.bact_l_acidophilus, ids.bact_l_casei, ids.bact_bifidobacterium], [], [], [ids.cond_depression]);

  await makeClaim(ids.paper_akkasheh_2016,
    'Probiotic supplementation improved insulin metabolism markers alongside depression improvements',
    [], [], [], [ids.cond_depression]);

  await makeClaim(ids.paper_akkasheh_2016,
    'First study demonstrating metabolic improvements alongside mental health benefits from probiotics',
    [], [], [], [ids.cond_depression]);

  // ===================================================================
  // Paper 15: Slykerman et al. 2017 — Postnatal depression prevention
  // ===================================================================
  await makeClaim(ids.paper_slykerman_2017,
    'L. rhamnosus HN001 given during pregnancy significantly reduced postpartum depression scores',
    [ids.bact_l_rhamnosus], [], [], [ids.cond_postnatal_depression, ids.cond_depression]);

  await makeClaim(ids.paper_slykerman_2017,
    'L. rhamnosus HN001 also significantly reduced postpartum anxiety scores',
    [ids.bact_l_rhamnosus], [], [], [ids.cond_postnatal_depression, ids.cond_anxiety]);

  await makeClaim(ids.paper_slykerman_2017,
    'First large trial (n=423) showing probiotics can prevent postnatal depression when given from pregnancy',
    [], [], [], [ids.cond_postnatal_depression]);

  // ===================================================================
  // Paper 16: Dinan & Cryan 2013 — Psychobiotics conceptual paper
  // ===================================================================
  await makeClaim(ids.paper_dinan_2013,
    'Defined "psychobiotics" as live organisms that produce mental health benefits when ingested in adequate amounts',
    [], [], [], [ids.cond_depression, ids.cond_anxiety]);

  await makeClaim(ids.paper_dinan_2013,
    'Key mechanisms: vagus nerve, enteric nervous system, HPA axis, immune/cytokine pathways',
    [], [], [ids.mech_vagus, ids.mech_enteric_nervous, ids.mech_hpa, ids.mech_immune_cytokine], []);

  await makeClaim(ids.paper_dinan_2013,
    'Gut bacteria produce neuroactive substances including GABA, serotonin, and dopamine',
    [], [ids.metab_gaba, ids.metab_serotonin, ids.metab_dopamine], [], []);

  await makeClaim(ids.paper_dinan_2013,
    'Bifidobacterium infantis demonstrated antidepressant-like effects in preclinical models',
    [ids.bact_b_infantis], [], [], [ids.cond_depression]);

  // ===================================================================
  // Paper 17: Sudo et al. 2004 — Germ-free mice HPA axis (FOUNDATIONAL)
  // ===================================================================
  await makeClaim(ids.paper_sudo_2004,
    'Germ-free mice show exaggerated HPA axis stress response with elevated corticosterone and ACTH',
    [], [ids.metab_corticosterone, ids.metab_cortisol], [ids.mech_hpa], [ids.cond_anxiety]);

  await makeClaim(ids.paper_sudo_2004,
    'Germ-free mice have reduced BDNF expression in cortex and hippocampus',
    [], [ids.metab_bdnf], [], []);

  await makeClaim(ids.paper_sudo_2004,
    'Monocolonization with Bifidobacterium infantis normalizes HPA axis when administered neonatally',
    [ids.bact_b_infantis], [], [ids.mech_hpa, ids.mech_developmental_window], [ids.cond_anxiety]);

  await makeClaim(ids.paper_sudo_2004,
    'Critical developmental window: colonization at 6 weeks normalizes HPA, at 8 weeks does not',
    [], [], [ids.mech_developmental_window, ids.mech_hpa], []);

  // ===================================================================
  // Paper 18: Bravo et al. 2011 — L. rhamnosus JB-1 in mice (ANIMAL)
  // ===================================================================
  await makeClaim(ids.paper_bravo_2011,
    'L. rhamnosus JB-1 reduces anxiety and depression-like behavior in BALB/c mice',
    [ids.bact_l_rhamnosus], [], [ids.mech_vagus], [ids.cond_depression, ids.cond_anxiety], 'decreased_in_disease');

  await makeClaim(ids.paper_bravo_2011,
    'L. rhamnosus JB-1 reduces stress-induced corticosterone in mice',
    [ids.bact_l_rhamnosus], [ids.metab_corticosterone], [ids.mech_hpa], []);

  await makeClaim(ids.paper_bravo_2011,
    'L. rhamnosus JB-1 alters GABA receptor expression in multiple brain regions',
    [ids.bact_l_rhamnosus], [ids.metab_gaba], [ids.mech_vagus], []);

  await makeClaim(ids.paper_bravo_2011,
    'All behavioral and neurochemical effects completely abolished by vagotomy',
    [], [], [ids.mech_vagus], []);

  // ===================================================================
  // Paper 19: Kelly et al. 2017 — L. rhamnosus JB-1 FAILS in humans
  // ===================================================================
  await makeClaim(ids.paper_kelly_2017,
    'L. rhamnosus JB-1 does NOT reduce stress, anxiety, or cognitive measures in healthy male humans',
    [ids.bact_l_rhamnosus], [], [], [ids.cond_anxiety], 'no_effect');

  await makeClaim(ids.paper_kelly_2017,
    'L. rhamnosus JB-1 does NOT modulate cortisol response in humans',
    [ids.bact_l_rhamnosus], [ids.metab_cortisol], [ids.mech_hpa], [], 'no_effect');

  await makeClaim(ids.paper_kelly_2017,
    'L. rhamnosus JB-1 does NOT alter inflammatory cytokine levels in humans',
    [ids.bact_l_rhamnosus], [], [ids.mech_neuroinflammation], [], 'no_effect');

  // ===================================================================
  // Paper 20: Zheng et al. 2016 — FMT depression transfer (China)
  // ===================================================================
  await makeClaim(ids.paper_zheng_2016,
    'FMT from MDD patients induces depression-like behavior in germ-free mice',
    [], [], [ids.mech_fmt_transfer], [ids.cond_depression]);

  await makeClaim(ids.paper_zheng_2016,
    'Depression microbiota disrupts tryptophan and amino acid metabolism in colonized mice',
    [], [ids.metab_tryptophan, ids.metab_kynurenine], [ids.mech_kynurenine_pathway], [ids.cond_depression]);

  await makeClaim(ids.paper_zheng_2016,
    'Gut microbiome composition differs significantly between MDD patients and healthy controls',
    [], [], [], [ids.cond_depression]);

  // ===================================================================
  // Paper 21: Kelly et al. 2016 — FMT depression to rats (Ireland)
  // ===================================================================
  await makeClaim(ids.paper_kelly_2016,
    'FMT from MDD patients induces anhedonia and anxiety-like behavior in rats',
    [], [], [ids.mech_fmt_transfer], [ids.cond_depression, ids.cond_anxiety]);

  await makeClaim(ids.paper_kelly_2016,
    'Depression microbiota transfer alters kynurenine/tryptophan ratio in recipient rats',
    [], [ids.metab_tryptophan, ids.metab_kynurenine], [ids.mech_kynurenine_pathway], [ids.cond_depression]);

  await makeClaim(ids.paper_kelly_2016,
    'Depression is associated with decreased gut microbiota richness and diversity',
    [], [], [], [ids.cond_depression]);

  // ===================================================================
  // Paper 22: Nikolova et al. 2021 — JAMA Psychiatry meta-analysis
  // ===================================================================
  await makeClaim(ids.paper_nikolova_2021,
    'Faecalibacterium consistently depleted across MDD, bipolar, schizophrenia, and anxiety (transdiagnostic)',
    [ids.bact_faecalibacterium], [ids.metab_butyrate], [], [ids.cond_depression, ids.cond_bipolar, ids.cond_schizophrenia, ids.cond_anxiety], 'decreased_in_disease');

  await makeClaim(ids.paper_nikolova_2021,
    'Coprococcus consistently depleted across psychiatric disorders (transdiagnostic)',
    [ids.bact_coprococcus], [ids.metab_butyrate], [], [ids.cond_depression, ids.cond_bipolar, ids.cond_schizophrenia, ids.cond_anxiety], 'decreased_in_disease');

  await makeClaim(ids.paper_nikolova_2021,
    'Eggerthella consistently enriched across MDD, bipolar, schizophrenia, and anxiety (transdiagnostic)',
    [ids.bact_eggerthella], [], [ids.mech_neuroinflammation], [ids.cond_depression, ids.cond_bipolar, ids.cond_schizophrenia, ids.cond_anxiety], 'increased_in_disease');

  await makeClaim(ids.paper_nikolova_2021,
    'Butyrate-producing bacteria depleted as a class across psychiatric conditions',
    [ids.bact_faecalibacterium, ids.bact_coprococcus, ids.bact_eubacterium_rectale], [ids.metab_butyrate], [], [ids.cond_depression, ids.cond_anxiety, ids.cond_bipolar, ids.cond_schizophrenia], 'decreased_in_disease');

  // ===================================================================
  // Paper 23: Tian et al. 2022 — B. breve CCFM1025 RCT (China)
  // ===================================================================
  await makeClaim(ids.paper_tian_2022,
    'B. breve CCFM1025 improves depression scores vs placebo in MDD patients (n=45)',
    [ids.bact_b_breve], [], [], [ids.cond_depression], 'increased_in_treatment');

  await makeClaim(ids.paper_tian_2022,
    'B. breve CCFM1025 increases fecal tryptophan derivatives correlated with symptom improvement',
    [ids.bact_b_breve], [ids.metab_tryptophan], [ids.mech_kynurenine_pathway], [ids.cond_depression]);

  // ===================================================================
  // Paper 24: Rudzki et al. 2019 — L. plantarum 299v (Poland)
  // ===================================================================
  await makeClaim(ids.paper_rudzki_2019,
    'L. plantarum 299v decreases plasma kynurenine concentration in MDD patients',
    [ids.bact_l_plantarum], [ids.metab_kynurenine], [ids.mech_kynurenine_pathway], [ids.cond_depression], 'decreased_in_disease');

  await makeClaim(ids.paper_rudzki_2019,
    'L. plantarum 299v improves cognitive functions (attention, psychomotor speed) in MDD patients',
    [ids.bact_l_plantarum], [], [], [ids.cond_depression]);

  await makeClaim(ids.paper_rudzki_2019,
    'L. plantarum 299v does NOT significantly improve depression scores (HDRS) vs placebo',
    [ids.bact_l_plantarum], [], [], [ids.cond_depression], 'no_effect');

  await makeClaim(ids.paper_rudzki_2019,
    'No significant changes in inflammatory cytokines or cortisol from L. plantarum 299v',
    [ids.bact_l_plantarum], [ids.metab_cortisol], [ids.mech_neuroinflammation], [], 'no_effect');

  // ===================================================================
  // Paper 25: Chahwan et al. 2019 — Multi-strain probiotic null result
  // ===================================================================
  await makeClaim(ids.paper_chahwan_2019,
    'Multi-strain probiotic (Ecologic Barrier) does NOT reduce depression symptoms vs placebo',
    [ids.bact_bifidobacterium, ids.bact_l_acidophilus, ids.bact_l_casei], [], [], [ids.cond_depression], 'no_effect');

  await makeClaim(ids.paper_chahwan_2019,
    'Both probiotic and placebo groups show equal improvement in depression scores',
    [], [], [], [ids.cond_depression]);

  await makeClaim(ids.paper_chahwan_2019,
    'Ruminococcus gnavus positively correlates with depression severity',
    [ids.bact_ruminococcus_gnavus], [], [], [ids.cond_depression], 'increased_in_disease');

  // ===================================================================
  // Paper 26: Zhu et al. 2020 — Schizophrenia FMT (China, multi-country)
  // ===================================================================
  await makeClaim(ids.paper_zhu_2020,
    'FMT from schizophrenia patients induces psychomotor hyperactivity and learning impairment in mice',
    [], [], [ids.mech_fmt_transfer], [ids.cond_schizophrenia]);

  await makeClaim(ids.paper_zhu_2020,
    'Schizophrenia microbiota dysregulates kynurenine metabolism in recipient mice',
    [], [ids.metab_kynurenine, ids.metab_tryptophan], [ids.mech_kynurenine_pathway], [ids.cond_schizophrenia]);

  await makeClaim(ids.paper_zhu_2020,
    'Glutamate-GABA cycle disrupted by schizophrenia microbiota transfer',
    [], [ids.metab_gaba, ids.metab_glutamate], [], [ids.cond_schizophrenia]);

  // ===================================================================
  // Paper 27: O'Hare et al. 2025 — saNeuroGut (South Africa)
  // ===================================================================
  await makeClaim(ids.paper_ohare_2025,
    'Catenibacterium abundance positively associated with PTSD symptom severity',
    [ids.bact_catenibacterium], [], [], [ids.cond_ptsd], 'increased_in_disease');

  await makeClaim(ids.paper_ohare_2025,
    'Collinsella abundance positively associated with PTSD symptom severity',
    [ids.bact_collinsella], [], [], [ids.cond_ptsd], 'increased_in_disease');

  await makeClaim(ids.paper_ohare_2025,
    'Holdemanella abundance positively associated with PTSD symptom severity',
    [ids.bact_holdemanella], [], [], [ids.cond_ptsd], 'increased_in_disease');

  return count;
}

/**
 * Seed the full academic knowledge graph into a RhizomeDB instance.
 */
export async function seedAcademicPapers(db: RhizomeDB): Promise<{
  totalDeltas: number;
  entityIds: typeof ids;
}> {
  claimCounter = 0;

  const author = 'digestion-agent';
  const entityCount = await seedEntities(db, author);
  const relCount = await seedRelationships(db, author);
  const claimCount = await seedClaims(db, author);

  return {
    totalDeltas: entityCount + relCount + claimCount,
    entityIds: ids
  };
}

export { ids as entityIds };
