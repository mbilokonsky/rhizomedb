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

  // === Batch 4: Papers 28-36 ===

  // Papers
  paper_carlson_2018: 'paper:carlson-2018-biolpsych-infant-cognitive',
  paper_schmidt_2015: 'paper:schmidt-2015-psychopharm-prebiotic',
  paper_zurita_2020: 'paper:zurita-2020-gutmicrobes-asd-ecuador',
  paper_sharon_2019: 'paper:sharon-2019-cell-asd-fmt',
  paper_liu_2019: 'paper:liu-2019-neubiorev-psychobiotic-meta',
  paper_scheperjans_2015: 'paper:scheperjans-2015-movdis-parkinsons',
  paper_ghosh_2020: 'paper:ghosh-2020-gut-meddiet-elderly',
  paper_claesson_2012: 'paper:claesson-2012-nature-elderly-diet',

  // New researchers (batch 4)
  researcher_carlson: 'researcher:alexander-carlson',
  researcher_schmidt: 'researcher:kristin-schmidt',
  researcher_burnet: 'researcher:philip-burnet',
  researcher_zurita: 'researcher:maria-fernanda-zurita',
  researcher_sharon: 'researcher:gil-sharon',
  researcher_mazmanian: 'researcher:sarkis-mazmanian',
  researcher_liu_rt: 'researcher:richard-t-liu',
  researcher_scheperjans: 'researcher:filip-scheperjans',
  researcher_ghosh: 'researcher:tarini-shankar-ghosh',
  researcher_claesson: 'researcher:marcus-j-claesson',
  researcher_paul_otoole: 'researcher:paul-w-otoole',

  // New institutions (batch 4)
  inst_umn: 'inst:university-of-minnesota',
  inst_oxford: 'inst:university-of-oxford',
  inst_ute_quito: 'inst:universidad-tecnologica-equinoccial-quito',
  inst_caltech: 'inst:california-institute-of-technology',
  inst_mgh_harvard: 'inst:massachusetts-general-hospital-harvard',
  inst_helsinki: 'inst:helsinki-university-hospital',
  inst_teagasc: 'inst:teagasc-food-research-centre',

  // New bacteria (batch 4)
  bact_l_reuteri: 'bacterium:lactobacillus-reuteri',
  bact_bacteroides_ovatus: 'bacterium:bacteroides-ovatus',
  bact_roseburia: 'bacterium:roseburia',
  bact_eubacterium: 'bacterium:eubacterium',
  bact_prevotellaceae: 'bacterium:prevotellaceae',
  bact_enterobacteriaceae: 'bacterium:enterobacteriaceae',
  bact_oscillibacter: 'bacterium:oscillibacter',
  bact_ruminococcus_torques: 'bacterium:ruminococcus-torques',
  bact_akkermansia: 'bacterium:akkermansia',
  bact_clostridium_ramosum: 'bacterium:clostridium-ramosum',

  // New metabolites (batch 4)
  metab_5av: 'metabolite:5-aminovaleric-acid',
  metab_taurine: 'metabolite:taurine',
  metab_p_cresol: 'metabolite:p-cresol',
  metab_secondary_bile_acids: 'metabolite:secondary-bile-acids',
  metab_crp: 'metabolite:c-reactive-protein',

  // New mechanisms (batch 4)
  mech_alternative_splicing: 'mechanism:alternative-splicing-asd-genes',
  mech_diet_microbiome: 'mechanism:diet-driven-microbiome-modulation',
  mech_diversity_frailty: 'mechanism:microbiota-diversity-frailty-axis',

  // New conditions (batch 4)
  cond_parkinsons: 'condition:parkinsons-disease',
  cond_frailty: 'condition:age-related-frailty',
  cond_cognitive_decline: 'condition:cognitive-decline',

  // === Batch 5: Papers 36-42 (evidence gap filling) ===

  // Papers
  paper_sampson_2016: 'paper:sampson-2016-cell-parkinsons-microbiota',
  paper_keshavarzian_2015: 'paper:keshavarzian-2015-movdis-parkinsons-mucosal',
  paper_unger_2016: 'paper:unger-2016-parkreldis-scfa-parkinsons',
  paper_aarts_2017: 'paper:aarts-2017-plosone-adhd-microbiome',
  paper_tengeler_2020: 'paper:tengeler-2020-microbiome-adhd-fmt',
  paper_bos_2022: 'paper:bos-2022-natcomms-helius-multiethnic',
  paper_jacka_2017: 'paper:jacka-2017-bmcmed-smiles-diet',

  // New researchers (batch 5)
  researcher_sampson: 'researcher:timothy-sampson',
  researcher_keshavarzian: 'researcher:ali-keshavarzian',
  researcher_unger: 'researcher:marcus-unger',
  researcher_aarts: 'researcher:esther-aarts',
  researcher_tenje: 'researcher:maria-tenje',
  researcher_tengeler: 'researcher:alejandro-arias-vasquez',
  researcher_bosch: 'researcher:jos-bosch',
  researcher_lok: 'researcher:anja-lok',
  researcher_jacka: 'researcher:felice-jacka',
  researcher_berk: 'researcher:michael-berk',

  // New institutions (batch 5)
  inst_rush_chicago: 'inst:rush-university-chicago',
  inst_philipps_marburg: 'inst:philipps-university-marburg',
  inst_radboud: 'inst:radboud-university-nijmegen',
  inst_amsterdam_umc: 'inst:amsterdam-university-medical-centre',
  inst_deakin: 'inst:deakin-university',

  // New bacteria (batch 5)
  bact_lachnospiraceae: 'bacterium:lachnospiraceae',
  bact_christensenellaceae: 'bacterium:christensenellaceae',
  bact_blautia: 'bacterium:blautia',
  bact_dorea: 'bacterium:dorea',

  // New mechanisms (batch 5)
  mech_alpha_synuclein: 'mechanism:alpha-synuclein-aggregation',
  mech_mucosal_inflammation: 'mechanism:intestinal-mucosal-inflammation',
  mech_scfa_neuroprotection: 'mechanism:scfa-neuroprotection',
  mech_dopamine_synthesis: 'mechanism:dopamine-synthesis-pathway',

  // New conditions (batch 5)
  cond_adhd: 'condition:attention-deficit-hyperactivity-disorder',

  // === Batch 6: Papers 43-52 (evidence gap closure) ===

  // Papers
  paper_coello_2019: 'paper:coello-2019-bbi-bipolar-microbiome',
  paper_tang_2025: 'paper:tang-2025-bmcmed-bipolar-fmt',
  paper_hemmings_2017: 'paper:hemmings-2017-psychosom-ptsd',
  paper_tomova_2015: 'paper:tomova-2015-physbeh-asd-slovakia',
  paper_zhang_m_2018: 'paper:zhang-m-2018-scirep-asd-china',
  paper_painold_2019: 'paper:painold-2019-bipoldis-depressive',
  paper_berding_2023: 'paper:berding-2023-molpsych-psychobiotic-diet',
  paper_tamana_2021: 'paper:tamana-2021-gutmicrobes-infant',
  paper_gao_2019: 'paper:gao-2019-psychopharm-infant-fmri',
  paper_freijy_2023: 'paper:freijy-2023-frontneurosci-prebiotic-diet',

  // New researchers (batch 6)
  researcher_coello: 'researcher:klara-coello',
  researcher_vinberg: 'researcher:morten-vinberg',
  researcher_tang_a: 'researcher:aiming-tang',
  researcher_tomova: 'researcher:anna-tomova',
  researcher_ostatnikova: 'researcher:daniela-ostatnikova',
  researcher_zhang_m: 'researcher:meng-zhang',
  researcher_painold: 'researcher:annamaria-painold',
  researcher_reininghaus: 'researcher:eva-reininghaus',
  researcher_berding: 'researcher:kirsten-berding',
  researcher_tamana: 'researcher:sukhpreet-tamana',
  researcher_kozyrskyj: 'researcher:anita-kozyrskyj',
  researcher_gao_wei: 'researcher:wei-gao',
  researcher_knickmeyer: 'researcher:rebecca-knickmeyer',
  researcher_freijy: 'researcher:tamsyn-freijy',
  researcher_sarris: 'researcher:jerome-sarris',

  // New institutions (batch 6)
  inst_rigshospitalet: 'inst:rigshospitalet-copenhagen',
  inst_zhejiang: 'inst:zhejiang-university',
  inst_comenius: 'inst:comenius-university-bratislava',
  inst_graz: 'inst:medical-university-graz',
  inst_ualberta: 'inst:university-of-alberta',
  inst_unc: 'inst:university-of-north-carolina',
  inst_umelbourne: 'inst:university-of-melbourne',

  // New bacteria (batch 6)
  bact_desulfovibrio: 'bacterium:desulfovibrio',
  bact_sutterella: 'bacterium:sutterella',
  bact_odoribacter: 'bacterium:odoribacter',
  bact_butyricimonas: 'bacterium:butyricimonas',
  bact_veillonella: 'bacterium:veillonella',
  bact_lentisphaerae: 'bacterium:lentisphaerae',
  bact_verrucomicrobia: 'bacterium:verrucomicrobia',
  bact_coriobacteriia: 'bacterium:coriobacteriia',

  // New mechanisms (batch 6)
  mech_synaptic_plasticity: 'mechanism:synaptic-plasticity',
  mech_microbial_stability: 'mechanism:microbial-stability',
  mech_amygdala_connectivity: 'mechanism:amygdala-functional-connectivity',
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

  // ============ Batch 4: Papers 28-35 ============

  // ----- Papers -----
  await ann(ids.paper_carlson_2018, 'title', 'Infant Gut Microbiome Associated With Cognitive Development');
  await ann(ids.paper_carlson_2018, 'journal', 'Biological Psychiatry');
  await ann(ids.paper_carlson_2018, 'year', 2018);
  await ann(ids.paper_carlson_2018, 'type', 'paper');
  await ann(ids.paper_carlson_2018, 'doi', '10.1016/j.biopsych.2017.06.021');
  await ann(ids.paper_carlson_2018, 'study_type', 'cohort');

  await ann(ids.paper_schmidt_2015, 'title', 'Prebiotic intake reduces the waking cortisol response and alters emotional bias in healthy volunteers');
  await ann(ids.paper_schmidt_2015, 'journal', 'Psychopharmacology');
  await ann(ids.paper_schmidt_2015, 'year', 2015);
  await ann(ids.paper_schmidt_2015, 'type', 'paper');
  await ann(ids.paper_schmidt_2015, 'doi', '10.1007/s00213-014-3810-0');
  await ann(ids.paper_schmidt_2015, 'study_type', 'clinical_trial');

  await ann(ids.paper_zurita_2020, 'title', 'Analysis of gut microbiome, nutrition and immune status in autism spectrum disorder');
  await ann(ids.paper_zurita_2020, 'journal', 'Gut Microbes');
  await ann(ids.paper_zurita_2020, 'year', 2020);
  await ann(ids.paper_zurita_2020, 'type', 'paper');
  await ann(ids.paper_zurita_2020, 'doi', '10.1080/19490976.2019.1662260');
  await ann(ids.paper_zurita_2020, 'study_type', 'case_control');

  await ann(ids.paper_sharon_2019, 'title', 'Human Gut Microbiota from Autism Spectrum Disorder Promote Behavioral Symptoms in Mice');
  await ann(ids.paper_sharon_2019, 'journal', 'Cell');
  await ann(ids.paper_sharon_2019, 'year', 2019);
  await ann(ids.paper_sharon_2019, 'type', 'paper');
  await ann(ids.paper_sharon_2019, 'doi', '10.1016/j.cell.2019.05.004');
  await ann(ids.paper_sharon_2019, 'study_type', 'animal_study');

  await ann(ids.paper_liu_2019, 'title', 'Prebiotics and probiotics for depression and anxiety: A systematic review and meta-analysis of controlled clinical trials');
  await ann(ids.paper_liu_2019, 'journal', 'Neuroscience & Biobehavioral Reviews');
  await ann(ids.paper_liu_2019, 'year', 2019);
  await ann(ids.paper_liu_2019, 'type', 'paper');
  await ann(ids.paper_liu_2019, 'doi', '10.1016/j.neubiorev.2019.03.023');
  await ann(ids.paper_liu_2019, 'study_type', 'meta_analysis');

  await ann(ids.paper_scheperjans_2015, 'title', 'Gut microbiota are related to Parkinson\'s disease and clinical phenotype');
  await ann(ids.paper_scheperjans_2015, 'journal', 'Movement Disorders');
  await ann(ids.paper_scheperjans_2015, 'year', 2015);
  await ann(ids.paper_scheperjans_2015, 'type', 'paper');
  await ann(ids.paper_scheperjans_2015, 'doi', '10.1002/mds.26069');
  await ann(ids.paper_scheperjans_2015, 'study_type', 'case_control');

  await ann(ids.paper_ghosh_2020, 'title', 'Mediterranean diet intervention alters the gut microbiome in older people reducing frailty and improving health status');
  await ann(ids.paper_ghosh_2020, 'journal', 'Gut');
  await ann(ids.paper_ghosh_2020, 'year', 2020);
  await ann(ids.paper_ghosh_2020, 'type', 'paper');
  await ann(ids.paper_ghosh_2020, 'doi', '10.1136/gutjnl-2019-319654');
  await ann(ids.paper_ghosh_2020, 'study_type', 'clinical_trial');

  await ann(ids.paper_claesson_2012, 'title', 'Gut microbiota composition correlates with diet and health in the elderly');
  await ann(ids.paper_claesson_2012, 'journal', 'Nature');
  await ann(ids.paper_claesson_2012, 'year', 2012);
  await ann(ids.paper_claesson_2012, 'type', 'paper');
  await ann(ids.paper_claesson_2012, 'doi', '10.1038/nature11319');
  await ann(ids.paper_claesson_2012, 'study_type', 'cohort');

  // Batch 4 researchers
  const researchers4: [string, string][] = [
    [ids.researcher_carlson, 'Alexander L Carlson'],
    [ids.researcher_schmidt, 'Kristin Schmidt'],
    [ids.researcher_burnet, 'Philip W J Burnet'],
    [ids.researcher_zurita, 'Maria Fernanda Zurita'],
    [ids.researcher_sharon, 'Gil Sharon'],
    [ids.researcher_mazmanian, 'Sarkis K Mazmanian'],
    [ids.researcher_liu_rt, 'Richard T Liu'],
    [ids.researcher_scheperjans, 'Filip Scheperjans'],
    [ids.researcher_ghosh, 'Tarini Shankar Ghosh'],
    [ids.researcher_claesson, 'Marcus J Claesson'],
    [ids.researcher_paul_otoole, 'Paul W O\'Toole'],
  ];
  for (const [id, name] of researchers4) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'researcher');
  }

  // Batch 4 institutions
  const institutions4: [string, string, string][] = [
    [ids.inst_umn, 'University of Minnesota', 'United States'],
    [ids.inst_oxford, 'University of Oxford', 'United Kingdom'],
    [ids.inst_ute_quito, 'Universidad Tecnologica Equinoccial', 'Ecuador'],
    [ids.inst_caltech, 'California Institute of Technology', 'United States'],
    [ids.inst_mgh_harvard, 'Massachusetts General Hospital / Harvard', 'United States'],
    [ids.inst_helsinki, 'Helsinki University Hospital', 'Finland'],
    [ids.inst_teagasc, 'Teagasc Food Research Centre', 'Ireland'],
  ];
  for (const [id, name, country] of institutions4) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'institution');
    await ann(id, 'country', country);
  }

  // Batch 4 new bacteria
  const bacteria4: [string, string, string][] = [
    [ids.bact_l_reuteri, 'Lactobacillus reuteri', 'species'],
    [ids.bact_bacteroides_ovatus, 'Bacteroides ovatus', 'species'],
    [ids.bact_roseburia, 'Roseburia', 'genus'],
    [ids.bact_eubacterium, 'Eubacterium', 'genus'],
    [ids.bact_prevotellaceae, 'Prevotellaceae', 'family'],
    [ids.bact_enterobacteriaceae, 'Enterobacteriaceae', 'family'],
    [ids.bact_oscillibacter, 'Oscillibacter', 'genus'],
    [ids.bact_ruminococcus_torques, 'Ruminococcus torques', 'species'],
    [ids.bact_akkermansia, 'Akkermansia', 'genus'],
    [ids.bact_clostridium_ramosum, 'Clostridium ramosum', 'species'],
  ];
  for (const [id, name, rank] of bacteria4) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'bacterium');
    await ann(id, 'taxonomic_rank', rank);
  }

  // Batch 4 new metabolites
  await ann(ids.metab_5av, 'name', '5-Aminovaleric acid');
  await ann(ids.metab_5av, 'type', 'metabolite');
  await ann(ids.metab_taurine, 'name', 'Taurine');
  await ann(ids.metab_taurine, 'type', 'metabolite');
  await ann(ids.metab_p_cresol, 'name', 'p-Cresol');
  await ann(ids.metab_p_cresol, 'type', 'metabolite');
  await ann(ids.metab_secondary_bile_acids, 'name', 'Secondary bile acids');
  await ann(ids.metab_secondary_bile_acids, 'type', 'metabolite');
  await ann(ids.metab_crp, 'name', 'C-reactive protein (CRP)');
  await ann(ids.metab_crp, 'type', 'metabolite');

  // Batch 4 new mechanisms
  await ann(ids.mech_alternative_splicing, 'name', 'Alternative splicing of ASD-relevant genes');
  await ann(ids.mech_alternative_splicing, 'type', 'mechanism');
  await ann(ids.mech_diet_microbiome, 'name', 'Diet-driven microbiome modulation');
  await ann(ids.mech_diet_microbiome, 'type', 'mechanism');
  await ann(ids.mech_diversity_frailty, 'name', 'Microbiota diversity-frailty axis');
  await ann(ids.mech_diversity_frailty, 'type', 'mechanism');

  // Batch 4 new conditions
  await ann(ids.cond_parkinsons, 'name', 'Parkinson\'s Disease');
  await ann(ids.cond_parkinsons, 'type', 'condition');
  await ann(ids.cond_frailty, 'name', 'Age-related Frailty');
  await ann(ids.cond_frailty, 'type', 'condition');
  await ann(ids.cond_cognitive_decline, 'name', 'Cognitive Decline');
  await ann(ids.cond_cognitive_decline, 'type', 'condition');

  // ===== Batch 5: Evidence gap filling (papers 36-42) =====

  // Batch 5 papers
  await ann(ids.paper_sampson_2016, 'title', 'Gut Microbiota Regulate Motor Deficits and Neuroinflammation in a Model of Parkinson\'s Disease');
  await ann(ids.paper_sampson_2016, 'journal', 'Cell');
  await ann(ids.paper_sampson_2016, 'year', 2016);
  await ann(ids.paper_sampson_2016, 'type', 'paper');
  await ann(ids.paper_sampson_2016, 'doi', '10.1016/j.cell.2016.11.018');
  await ann(ids.paper_sampson_2016, 'study_type', 'animal_study');

  await ann(ids.paper_keshavarzian_2015, 'title', 'Colonic bacterial composition in Parkinson\'s disease');
  await ann(ids.paper_keshavarzian_2015, 'journal', 'Movement Disorders');
  await ann(ids.paper_keshavarzian_2015, 'year', 2015);
  await ann(ids.paper_keshavarzian_2015, 'type', 'paper');
  await ann(ids.paper_keshavarzian_2015, 'doi', '10.1002/mds.26307');
  await ann(ids.paper_keshavarzian_2015, 'study_type', 'case_control');

  await ann(ids.paper_unger_2016, 'title', 'Short chain fatty acids and gut microbiota differ between patients with Parkinson\'s disease and age-matched controls');
  await ann(ids.paper_unger_2016, 'journal', 'Parkinsonism & Related Disorders');
  await ann(ids.paper_unger_2016, 'year', 2016);
  await ann(ids.paper_unger_2016, 'type', 'paper');
  await ann(ids.paper_unger_2016, 'doi', '10.1016/j.parkreldis.2016.08.019');
  await ann(ids.paper_unger_2016, 'study_type', 'case_control');

  await ann(ids.paper_aarts_2017, 'title', 'Gut microbiota and ADHD: Neural reward anticipation is associated with the genus Bifidobacterium');
  await ann(ids.paper_aarts_2017, 'journal', 'PLoS ONE');
  await ann(ids.paper_aarts_2017, 'year', 2017);
  await ann(ids.paper_aarts_2017, 'type', 'paper');
  await ann(ids.paper_aarts_2017, 'doi', '10.1371/journal.pone.0183509');
  await ann(ids.paper_aarts_2017, 'study_type', 'case_control');

  await ann(ids.paper_tengeler_2020, 'title', 'Gut microbiota from persons with attention-deficit/hyperactivity disorder affects the brain in mice');
  await ann(ids.paper_tengeler_2020, 'journal', 'Microbiome');
  await ann(ids.paper_tengeler_2020, 'year', 2020);
  await ann(ids.paper_tengeler_2020, 'type', 'paper');
  await ann(ids.paper_tengeler_2020, 'doi', '10.1186/s40168-020-00816-x');
  await ann(ids.paper_tengeler_2020, 'study_type', 'fecal_transplant');

  await ann(ids.paper_bos_2022, 'title', 'Gut microbiota composition is associated with depressive symptoms across ethnicities (HELIUS)');
  await ann(ids.paper_bos_2022, 'journal', 'Nature Communications');
  await ann(ids.paper_bos_2022, 'year', 2022);
  await ann(ids.paper_bos_2022, 'type', 'paper');
  await ann(ids.paper_bos_2022, 'doi', '10.1038/s41467-022-34504-1');
  await ann(ids.paper_bos_2022, 'study_type', 'cohort');

  await ann(ids.paper_jacka_2017, 'title', 'A randomised controlled trial of dietary improvement for adults with major depression (the SMILES trial)');
  await ann(ids.paper_jacka_2017, 'journal', 'BMC Medicine');
  await ann(ids.paper_jacka_2017, 'year', 2017);
  await ann(ids.paper_jacka_2017, 'type', 'paper');
  await ann(ids.paper_jacka_2017, 'doi', '10.1186/s12916-017-0791-y');
  await ann(ids.paper_jacka_2017, 'study_type', 'clinical_trial');

  // Batch 5 researchers
  const researchers5: [string, string][] = [
    [ids.researcher_sampson, 'Timothy R Sampson'],
    [ids.researcher_keshavarzian, 'Ali Keshavarzian'],
    [ids.researcher_unger, 'Marcus M Unger'],
    [ids.researcher_aarts, 'Esther Aarts'],
    [ids.researcher_tengeler, 'Alejandro Arias-Vasquez'],
    [ids.researcher_bosch, 'Jos A Bosch'],
    [ids.researcher_lok, 'Anja Lok'],
    [ids.researcher_jacka, 'Felice N Jacka'],
    [ids.researcher_berk, 'Michael Berk'],
  ];
  for (const [id, name] of researchers5) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'researcher');
  }

  // Batch 5 institutions
  const institutions5: [string, string, string][] = [
    [ids.inst_rush_chicago, 'Rush University Medical Center', 'United States'],
    [ids.inst_philipps_marburg, 'Philipps-University Marburg', 'Germany'],
    [ids.inst_radboud, 'Radboud University Nijmegen', 'Netherlands'],
    [ids.inst_amsterdam_umc, 'Amsterdam University Medical Centre', 'Netherlands'],
    [ids.inst_deakin, 'Deakin University', 'Australia'],
  ];
  for (const [id, name, country] of institutions5) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'institution');
    await ann(id, 'country', country);
  }

  // Batch 5 new bacteria
  const bacteria5: [string, string, string][] = [
    [ids.bact_lachnospiraceae, 'Lachnospiraceae', 'family'],
    [ids.bact_christensenellaceae, 'Christensenellaceae', 'family'],
    [ids.bact_blautia, 'Blautia', 'genus'],
    [ids.bact_dorea, 'Dorea', 'genus'],
  ];
  for (const [id, name, rank] of bacteria5) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'bacterium');
    await ann(id, 'taxonomic_rank', rank);
  }

  // Batch 5 new mechanisms
  await ann(ids.mech_alpha_synuclein, 'name', 'Alpha-synuclein aggregation');
  await ann(ids.mech_alpha_synuclein, 'type', 'mechanism');
  await ann(ids.mech_mucosal_inflammation, 'name', 'Intestinal mucosal inflammation');
  await ann(ids.mech_mucosal_inflammation, 'type', 'mechanism');
  await ann(ids.mech_scfa_neuroprotection, 'name', 'SCFA-mediated neuroprotection');
  await ann(ids.mech_scfa_neuroprotection, 'type', 'mechanism');
  await ann(ids.mech_dopamine_synthesis, 'name', 'Dopamine synthesis pathway');
  await ann(ids.mech_dopamine_synthesis, 'type', 'mechanism');

  // Batch 5 new conditions
  await ann(ids.cond_adhd, 'name', 'Attention-Deficit/Hyperactivity Disorder');
  await ann(ids.cond_adhd, 'type', 'condition');

  // ===== Batch 6: Evidence gap closure (papers 43-52) =====

  // Batch 6 papers
  await ann(ids.paper_coello_2019, 'title', 'Gut microbiota composition in patients with newly diagnosed bipolar disorder and their unaffected first-degree relatives');
  await ann(ids.paper_coello_2019, 'journal', 'Brain, Behavior, and Immunity');
  await ann(ids.paper_coello_2019, 'year', 2019);
  await ann(ids.paper_coello_2019, 'type', 'paper');
  await ann(ids.paper_coello_2019, 'doi', '10.1016/j.bbi.2018.09.026');
  await ann(ids.paper_coello_2019, 'study_type', 'case_control');

  await ann(ids.paper_tang_2025, 'title', 'Gut microbiota links to cognitive impairment in bipolar disorder via modulating synaptic plasticity');
  await ann(ids.paper_tang_2025, 'journal', 'BMC Medicine');
  await ann(ids.paper_tang_2025, 'year', 2025);
  await ann(ids.paper_tang_2025, 'type', 'paper');
  await ann(ids.paper_tang_2025, 'doi', '10.1186/s12916-025-04313-6');
  await ann(ids.paper_tang_2025, 'study_type', 'fecal_transplant');

  await ann(ids.paper_hemmings_2017, 'title', 'The microbiome in posttraumatic stress disorder and trauma-exposed controls: an exploratory study');
  await ann(ids.paper_hemmings_2017, 'journal', 'Psychosomatic Medicine');
  await ann(ids.paper_hemmings_2017, 'year', 2017);
  await ann(ids.paper_hemmings_2017, 'type', 'paper');
  await ann(ids.paper_hemmings_2017, 'doi', '10.1097/PSY.0000000000000512');
  await ann(ids.paper_hemmings_2017, 'study_type', 'case_control');

  await ann(ids.paper_tomova_2015, 'title', 'Gastrointestinal microbiota in children with autism in Slovakia');
  await ann(ids.paper_tomova_2015, 'journal', 'Physiology & Behavior');
  await ann(ids.paper_tomova_2015, 'year', 2015);
  await ann(ids.paper_tomova_2015, 'type', 'paper');
  await ann(ids.paper_tomova_2015, 'doi', '10.1016/j.physbeh.2014.10.033');
  await ann(ids.paper_tomova_2015, 'study_type', 'case_control');

  await ann(ids.paper_zhang_m_2018, 'title', 'Analysis of gut microbiota profiles and microbe-disease associations in children with autism spectrum disorders in China');
  await ann(ids.paper_zhang_m_2018, 'journal', 'Scientific Reports');
  await ann(ids.paper_zhang_m_2018, 'year', 2018);
  await ann(ids.paper_zhang_m_2018, 'type', 'paper');
  await ann(ids.paper_zhang_m_2018, 'doi', '10.1038/s41598-018-32219-2');
  await ann(ids.paper_zhang_m_2018, 'study_type', 'case_control');

  await ann(ids.paper_painold_2019, 'title', 'A step ahead: Exploring the gut microbiota in inpatients with bipolar disorder during a depressive episode');
  await ann(ids.paper_painold_2019, 'journal', 'Bipolar Disorders');
  await ann(ids.paper_painold_2019, 'year', 2019);
  await ann(ids.paper_painold_2019, 'type', 'paper');
  await ann(ids.paper_painold_2019, 'doi', '10.1111/bdi.12682');
  await ann(ids.paper_painold_2019, 'study_type', 'case_control');

  await ann(ids.paper_berding_2023, 'title', 'Feed your microbes to deal with stress: a psychobiotic diet impacts microbial stability and perceived stress in a healthy adult population');
  await ann(ids.paper_berding_2023, 'journal', 'Molecular Psychiatry');
  await ann(ids.paper_berding_2023, 'year', 2023);
  await ann(ids.paper_berding_2023, 'type', 'paper');
  await ann(ids.paper_berding_2023, 'doi', '10.1038/s41380-022-01817-y');
  await ann(ids.paper_berding_2023, 'study_type', 'clinical_trial');

  await ann(ids.paper_tamana_2021, 'title', 'Bacteroides-dominant gut microbiome of late infancy is associated with enhanced neurodevelopment');
  await ann(ids.paper_tamana_2021, 'journal', 'Gut Microbes');
  await ann(ids.paper_tamana_2021, 'year', 2021);
  await ann(ids.paper_tamana_2021, 'type', 'paper');
  await ann(ids.paper_tamana_2021, 'doi', '10.1080/19490976.2021.1930875');
  await ann(ids.paper_tamana_2021, 'study_type', 'cohort');

  await ann(ids.paper_gao_2019, 'title', 'Gut microbiome and brain functional connectivity in infants — a preliminary study focusing on the amygdala');
  await ann(ids.paper_gao_2019, 'journal', 'Psychopharmacology');
  await ann(ids.paper_gao_2019, 'year', 2019);
  await ann(ids.paper_gao_2019, 'type', 'paper');
  await ann(ids.paper_gao_2019, 'doi', '10.1007/s00213-018-5161-8');
  await ann(ids.paper_gao_2019, 'study_type', 'cohort');

  await ann(ids.paper_freijy_2023, 'title', 'Effects of a high-prebiotic diet versus probiotic supplements versus synbiotics on adult mental health: The Gut Feelings randomised controlled trial');
  await ann(ids.paper_freijy_2023, 'journal', 'Frontiers in Neuroscience');
  await ann(ids.paper_freijy_2023, 'year', 2023);
  await ann(ids.paper_freijy_2023, 'type', 'paper');
  await ann(ids.paper_freijy_2023, 'doi', '10.3389/fnins.2022.1097278');
  await ann(ids.paper_freijy_2023, 'study_type', 'clinical_trial');

  // Batch 6 researchers
  const researchers6: [string, string][] = [
    [ids.researcher_coello, 'Klara Coello'],
    [ids.researcher_vinberg, 'Morten Vinberg'],
    [ids.researcher_tang_a, 'Aiming Tang'],
    [ids.researcher_tomova, 'Anna Tomova'],
    [ids.researcher_ostatnikova, 'Daniela Ostatnikova'],
    [ids.researcher_zhang_m, 'Meng Zhang'],
    [ids.researcher_painold, 'Annamaria Painold'],
    [ids.researcher_reininghaus, 'Eva Z Reininghaus'],
    [ids.researcher_berding, 'Kirsten Berding'],
    [ids.researcher_tamana, 'Sukhpreet K Tamana'],
    [ids.researcher_kozyrskyj, 'Anita L Kozyrskyj'],
    [ids.researcher_gao_wei, 'Wei Gao'],
    [ids.researcher_knickmeyer, 'Rebecca C Knickmeyer'],
    [ids.researcher_freijy, 'Tamsyn M Freijy'],
    [ids.researcher_sarris, 'Jerome Sarris'],
  ];
  for (const [id, name] of researchers6) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'researcher');
  }

  // Batch 6 institutions
  const institutions6: [string, string, string][] = [
    [ids.inst_rigshospitalet, 'Rigshospitalet / Copenhagen Affective Disorders Research Centre', 'Denmark'],
    [ids.inst_zhejiang, 'Zhejiang University School of Medicine', 'China'],
    [ids.inst_comenius, 'Comenius University Bratislava', 'Slovakia'],
    [ids.inst_graz, 'Medical University of Graz', 'Austria'],
    [ids.inst_ualberta, 'University of Alberta', 'Canada'],
    [ids.inst_unc, 'University of North Carolina', 'United States'],
    [ids.inst_umelbourne, 'University of Melbourne', 'Australia'],
  ];
  for (const [id, name, country] of institutions6) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'institution');
    await ann(id, 'country', country);
  }

  // Batch 6 new bacteria
  const bacteria6: [string, string, string][] = [
    [ids.bact_desulfovibrio, 'Desulfovibrio', 'genus'],
    [ids.bact_sutterella, 'Sutterella', 'genus'],
    [ids.bact_odoribacter, 'Odoribacter', 'genus'],
    [ids.bact_butyricimonas, 'Butyricimonas', 'genus'],
    [ids.bact_veillonella, 'Veillonella', 'genus'],
    [ids.bact_lentisphaerae, 'Lentisphaerae', 'phylum'],
    [ids.bact_verrucomicrobia, 'Verrucomicrobia', 'phylum'],
    [ids.bact_coriobacteriia, 'Coriobacteriia', 'class'],
  ];
  for (const [id, name, rank] of bacteria6) {
    await ann(id, 'name', name);
    await ann(id, 'type', 'bacterium');
    await ann(id, 'taxonomic_rank', rank);
  }

  // Batch 6 new mechanisms
  await ann(ids.mech_synaptic_plasticity, 'name', 'Synaptic plasticity (PSD-95 / dendritic complexity)');
  await ann(ids.mech_synaptic_plasticity, 'type', 'mechanism');
  await ann(ids.mech_microbial_stability, 'name', 'Microbial stability (resilience to perturbation)');
  await ann(ids.mech_microbial_stability, 'type', 'mechanism');
  await ann(ids.mech_amygdala_connectivity, 'name', 'Amygdala functional connectivity');
  await ann(ids.mech_amygdala_connectivity, 'type', 'mechanism');

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

  // ===== Batch 4: Authorship =====

  // Paper 28: Carlson et al. 2018
  await rel('paper', ids.paper_carlson_2018, 'authors', 'author', ids.researcher_carlson, 'papers');

  // Paper 29: Schmidt et al. 2015
  await rel('paper', ids.paper_schmidt_2015, 'authors', 'author', ids.researcher_schmidt, 'papers');
  await rel('paper', ids.paper_schmidt_2015, 'authors', 'author', ids.researcher_burnet, 'papers');

  // Paper 30: Zurita et al. 2020
  await rel('paper', ids.paper_zurita_2020, 'authors', 'author', ids.researcher_zurita, 'papers');

  // Paper 31: Sharon et al. 2019
  await rel('paper', ids.paper_sharon_2019, 'authors', 'author', ids.researcher_sharon, 'papers');
  await rel('paper', ids.paper_sharon_2019, 'authors', 'author', ids.researcher_mazmanian, 'papers');

  // Paper 32: Liu et al. 2019
  await rel('paper', ids.paper_liu_2019, 'authors', 'author', ids.researcher_liu_rt, 'papers');

  // Paper 33: Scheperjans et al. 2015
  await rel('paper', ids.paper_scheperjans_2015, 'authors', 'author', ids.researcher_scheperjans, 'papers');

  // Paper 34: Ghosh et al. 2020 — UCC Cork + Teagasc (overlaps with Dinan/Cryan institution)
  await rel('paper', ids.paper_ghosh_2020, 'authors', 'author', ids.researcher_ghosh, 'papers');
  await rel('paper', ids.paper_ghosh_2020, 'authors', 'author', ids.researcher_paul_otoole, 'papers');

  // Paper 35: Claesson et al. 2012 — UCC Cork
  await rel('paper', ids.paper_claesson_2012, 'authors', 'author', ids.researcher_claesson, 'papers');
  await rel('paper', ids.paper_claesson_2012, 'authors', 'author', ids.researcher_paul_otoole, 'papers');

  // ===== Batch 4: Affiliations =====
  await rel('researcher', ids.researcher_carlson, 'affiliations', 'member', ids.inst_umn, 'researchers');
  await rel('researcher', ids.researcher_schmidt, 'affiliations', 'member', ids.inst_oxford, 'researchers');
  await rel('researcher', ids.researcher_burnet, 'affiliations', 'member', ids.inst_oxford, 'researchers');
  await rel('researcher', ids.researcher_zurita, 'affiliations', 'member', ids.inst_ute_quito, 'researchers');
  await rel('researcher', ids.researcher_sharon, 'affiliations', 'member', ids.inst_caltech, 'researchers');
  await rel('researcher', ids.researcher_mazmanian, 'affiliations', 'member', ids.inst_caltech, 'researchers');
  await rel('researcher', ids.researcher_liu_rt, 'affiliations', 'member', ids.inst_mgh_harvard, 'researchers');
  await rel('researcher', ids.researcher_scheperjans, 'affiliations', 'member', ids.inst_helsinki, 'researchers');
  await rel('researcher', ids.researcher_ghosh, 'affiliations', 'member', ids.inst_ucc_cork, 'researchers');
  await rel('researcher', ids.researcher_paul_otoole, 'affiliations', 'member', ids.inst_ucc_cork, 'researchers');
  await rel('researcher', ids.researcher_claesson, 'affiliations', 'member', ids.inst_ucc_cork, 'researchers');
  await rel('researcher', ids.researcher_paul_otoole, 'affiliations', 'member', ids.inst_teagasc, 'researchers');
  await rel('researcher', ids.researcher_claesson, 'affiliations', 'member', ids.inst_teagasc, 'researchers');

  // ===== Batch 4: Production relationships =====
  await rel('producer', ids.bact_roseburia, 'produces', 'product', ids.metab_butyrate, 'produced_by');
  await rel('producer', ids.bact_eubacterium, 'produces', 'product', ids.metab_butyrate, 'produced_by');

  // ===== Batch 4: Taxonomic hierarchy =====
  await rel('species', ids.bact_l_reuteri, 'genus', 'genus', ids.bact_lactobacillus, 'species');
  await rel('species', ids.bact_bacteroides_ovatus, 'genus', 'genus', ids.bact_bacteroides, 'species');
  await rel('species', ids.bact_ruminococcus_torques, 'genus', 'genus', ids.bact_ruminococcaceae, 'species');
  await rel('species', ids.bact_clostridium_ramosum, 'genus', 'genus', ids.bact_firmicutes, 'species');

  // ===== Batch 5: Paper → Researcher =====

  // Sampson 2016 (Caltech — Mazmanian already exists)
  await rel('paper', ids.paper_sampson_2016, 'authors', 'author', ids.researcher_sampson, 'papers');
  await rel('paper', ids.paper_sampson_2016, 'authors', 'author', ids.researcher_mazmanian, 'papers');

  // Keshavarzian 2015
  await rel('paper', ids.paper_keshavarzian_2015, 'authors', 'author', ids.researcher_keshavarzian, 'papers');

  // Unger 2016
  await rel('paper', ids.paper_unger_2016, 'authors', 'author', ids.researcher_unger, 'papers');

  // Aarts 2017
  await rel('paper', ids.paper_aarts_2017, 'authors', 'author', ids.researcher_aarts, 'papers');

  // Tengeler 2020 (Arias-Vasquez)
  await rel('paper', ids.paper_tengeler_2020, 'authors', 'author', ids.researcher_tengeler, 'papers');

  // Bos 2022 (HELIUS)
  await rel('paper', ids.paper_bos_2022, 'authors', 'author', ids.researcher_bosch, 'papers');
  await rel('paper', ids.paper_bos_2022, 'authors', 'author', ids.researcher_lok, 'papers');

  // Jacka 2017 (SMILES)
  await rel('paper', ids.paper_jacka_2017, 'authors', 'author', ids.researcher_jacka, 'papers');
  await rel('paper', ids.paper_jacka_2017, 'authors', 'author', ids.researcher_berk, 'papers');

  // ===== Batch 5: Researcher → Institution =====
  await rel('researcher', ids.researcher_sampson, 'affiliations', 'member', ids.inst_caltech, 'researchers');
  await rel('researcher', ids.researcher_keshavarzian, 'affiliations', 'member', ids.inst_rush_chicago, 'researchers');
  await rel('researcher', ids.researcher_unger, 'affiliations', 'member', ids.inst_philipps_marburg, 'researchers');
  await rel('researcher', ids.researcher_aarts, 'affiliations', 'member', ids.inst_radboud, 'researchers');
  await rel('researcher', ids.researcher_tengeler, 'affiliations', 'member', ids.inst_radboud, 'researchers');
  await rel('researcher', ids.researcher_bosch, 'affiliations', 'member', ids.inst_amsterdam_umc, 'researchers');
  await rel('researcher', ids.researcher_lok, 'affiliations', 'member', ids.inst_amsterdam_umc, 'researchers');
  await rel('researcher', ids.researcher_jacka, 'affiliations', 'member', ids.inst_deakin, 'researchers');
  await rel('researcher', ids.researcher_berk, 'affiliations', 'member', ids.inst_deakin, 'researchers');

  // ===== Batch 5: Taxonomic hierarchy =====
  await rel('species', ids.bact_blautia, 'genus', 'genus', ids.bact_lachnospiraceae, 'species');
  await rel('species', ids.bact_dorea, 'genus', 'genus', ids.bact_lachnospiraceae, 'species');

  // ===== Batch 6: Paper → Researcher =====

  // Paper 43: Coello et al. 2019
  await rel('paper', ids.paper_coello_2019, 'authors', 'author', ids.researcher_coello, 'papers');
  await rel('paper', ids.paper_coello_2019, 'authors', 'author', ids.researcher_vinberg, 'papers');

  // Paper 44: Tang et al. 2025
  await rel('paper', ids.paper_tang_2025, 'authors', 'author', ids.researcher_tang_a, 'papers');

  // Paper 45: Hemmings et al. 2017 (Hemmings already exists from O'Hare 2025!)
  await rel('paper', ids.paper_hemmings_2017, 'authors', 'author', ids.researcher_hemmings, 'papers');

  // Paper 46: Tomova et al. 2015
  await rel('paper', ids.paper_tomova_2015, 'authors', 'author', ids.researcher_tomova, 'papers');
  await rel('paper', ids.paper_tomova_2015, 'authors', 'author', ids.researcher_ostatnikova, 'papers');

  // Paper 47: Zhang M et al. 2018
  await rel('paper', ids.paper_zhang_m_2018, 'authors', 'author', ids.researcher_zhang_m, 'papers');

  // Paper 48: Painold et al. 2019
  await rel('paper', ids.paper_painold_2019, 'authors', 'author', ids.researcher_painold, 'papers');
  await rel('paper', ids.paper_painold_2019, 'authors', 'author', ids.researcher_reininghaus, 'papers');

  // Paper 49: Berding et al. 2023 (Cryan lab — Cryan & Dinan already exist)
  await rel('paper', ids.paper_berding_2023, 'authors', 'author', ids.researcher_berding, 'papers');
  await rel('paper', ids.paper_berding_2023, 'authors', 'author', ids.researcher_cryan, 'papers');
  await rel('paper', ids.paper_berding_2023, 'authors', 'author', ids.researcher_dinan, 'papers');

  // Paper 50: Tamana et al. 2021
  await rel('paper', ids.paper_tamana_2021, 'authors', 'author', ids.researcher_tamana, 'papers');
  await rel('paper', ids.paper_tamana_2021, 'authors', 'author', ids.researcher_kozyrskyj, 'papers');

  // Paper 51: Gao et al. 2019
  await rel('paper', ids.paper_gao_2019, 'authors', 'author', ids.researcher_gao_wei, 'papers');
  await rel('paper', ids.paper_gao_2019, 'authors', 'author', ids.researcher_knickmeyer, 'papers');

  // Paper 52: Freijy et al. 2023 (Jacka already exists from SMILES!)
  await rel('paper', ids.paper_freijy_2023, 'authors', 'author', ids.researcher_freijy, 'papers');
  await rel('paper', ids.paper_freijy_2023, 'authors', 'author', ids.researcher_sarris, 'papers');
  await rel('paper', ids.paper_freijy_2023, 'authors', 'author', ids.researcher_jacka, 'papers');

  // ===== Batch 6: Researcher → Institution =====
  await rel('researcher', ids.researcher_coello, 'affiliations', 'member', ids.inst_rigshospitalet, 'researchers');
  await rel('researcher', ids.researcher_vinberg, 'affiliations', 'member', ids.inst_rigshospitalet, 'researchers');
  await rel('researcher', ids.researcher_tang_a, 'affiliations', 'member', ids.inst_zhejiang, 'researchers');
  await rel('researcher', ids.researcher_tomova, 'affiliations', 'member', ids.inst_comenius, 'researchers');
  await rel('researcher', ids.researcher_ostatnikova, 'affiliations', 'member', ids.inst_comenius, 'researchers');
  await rel('researcher', ids.researcher_zhang_m, 'affiliations', 'member', ids.inst_zhejiang, 'researchers');
  await rel('researcher', ids.researcher_painold, 'affiliations', 'member', ids.inst_graz, 'researchers');
  await rel('researcher', ids.researcher_reininghaus, 'affiliations', 'member', ids.inst_graz, 'researchers');
  await rel('researcher', ids.researcher_berding, 'affiliations', 'member', ids.inst_ucc_cork, 'researchers');
  await rel('researcher', ids.researcher_tamana, 'affiliations', 'member', ids.inst_ualberta, 'researchers');
  await rel('researcher', ids.researcher_kozyrskyj, 'affiliations', 'member', ids.inst_ualberta, 'researchers');
  await rel('researcher', ids.researcher_gao_wei, 'affiliations', 'member', ids.inst_unc, 'researchers');
  await rel('researcher', ids.researcher_knickmeyer, 'affiliations', 'member', ids.inst_unc, 'researchers');
  await rel('researcher', ids.researcher_freijy, 'affiliations', 'member', ids.inst_umelbourne, 'researchers');
  await rel('researcher', ids.researcher_sarris, 'affiliations', 'member', ids.inst_umelbourne, 'researchers');

  // ===== Batch 6: Bacterium → produces → Metabolite =====
  await rel('producer', ids.bact_desulfovibrio, 'produces', 'product', ids.metab_propionate, 'produced_by');

  // ===== Batch 6: Taxonomic hierarchy =====
  // Desulfovibrio, Sutterella, Odoribacter, Butyricimonas, Veillonella are genera (no species-level entries yet)
  // Coriobacteriia is a class within Actinobacteria
  await rel('species', ids.bact_coriobacteriia, 'genus', 'genus', ids.bact_actinobacteria, 'species');

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

  // ===================================================================
  // Paper 28: Carlson et al. 2018 — Infant gut microbiome + cognition
  // ===================================================================
  await makeClaim(ids.paper_carlson_2018,
    'Higher alpha diversity in infant gut microbiome at 1 year associated with LOWER cognitive scores at 2 years',
    [], [], [ids.mech_developmental_window], [ids.cond_cognitive_decline]);

  await makeClaim(ids.paper_carlson_2018,
    'Bacteroides-dominant gut microbiome cluster in infancy associated with enhanced neurodevelopment',
    [ids.bact_bacteroides], [], [ids.mech_developmental_window], []);

  await makeClaim(ids.paper_carlson_2018,
    'Prevotella-dominant gut microbiome in infancy associated with lower cognitive scores',
    [ids.bact_prevotella], [], [ids.mech_developmental_window], [ids.cond_cognitive_decline]);

  // ===================================================================
  // Paper 29: Schmidt et al. 2015 — B-GOS prebiotic reduces cortisol
  // ===================================================================
  await makeClaim(ids.paper_schmidt_2015,
    'Bifidobacterium-targeted GOS prebiotic reduces waking cortisol response in healthy volunteers',
    [ids.bact_bifidobacterium], [ids.metab_cortisol], [ids.mech_hpa], [ids.cond_anxiety], 'decreased_in_disease');

  await makeClaim(ids.paper_schmidt_2015,
    'B-GOS prebiotic attenuates attentional bias to negative stimuli (emotional dot-probe task)',
    [], [], [], [ids.cond_anxiety, ids.cond_depression]);

  await makeClaim(ids.paper_schmidt_2015,
    'FOS prebiotic has NO effect on cortisol or emotional processing',
    [], [ids.metab_cortisol], [], [ids.cond_anxiety], 'no_effect');

  // ===================================================================
  // Paper 30: Zurita et al. 2020 — ASD gut microbiome in Ecuador
  // ===================================================================
  await makeClaim(ids.paper_zurita_2020,
    'Bacteroides abundance increased in Ecuadorian children with ASD vs controls',
    [ids.bact_bacteroides], [], [], [ids.cond_autism], 'increased_in_disease');

  await makeClaim(ids.paper_zurita_2020,
    'Ruminococcaceae abundance increased in ASD (Ecuador cohort)',
    [ids.bact_ruminococcaceae], [], [], [ids.cond_autism], 'increased_in_disease');

  await makeClaim(ids.paper_zurita_2020,
    'Akkermansia abundance increased in ASD children (Ecuador)',
    [ids.bact_akkermansia], [], [], [ids.cond_autism], 'increased_in_disease');

  await makeClaim(ids.paper_zurita_2020,
    'ASD children have higher prevalence of GI symptoms and abnormal food habits',
    [], [], [ids.mech_leaky_gut], [ids.cond_autism]);

  // ===================================================================
  // Paper 31: Sharon et al. 2019 — ASD microbiota causes behavior in mice
  // ===================================================================
  await makeClaim(ids.paper_sharon_2019,
    'FMT from ASD human donors to germ-free mice induces autistic-like behaviors (reduced sociability, repetitive behaviors)',
    [], [], [ids.mech_fmt_transfer], [ids.cond_autism]);

  await makeClaim(ids.paper_sharon_2019,
    '5-aminovaleric acid depleted in ASD-colonized mice; treatment reduces ASD-like behaviors',
    [], [ids.metab_5av, ids.metab_gaba], [], [ids.cond_autism], 'decreased_in_disease');

  await makeClaim(ids.paper_sharon_2019,
    'Taurine depleted in ASD-colonized mice; treatment reduces ASD-like behaviors',
    [], [ids.metab_taurine], [], [ids.cond_autism], 'decreased_in_disease');

  await makeClaim(ids.paper_sharon_2019,
    'ASD microbiota induces alternative splicing of ASD-relevant genes in mouse brains',
    [], [], [ids.mech_alternative_splicing], [ids.cond_autism]);

  await makeClaim(ids.paper_sharon_2019,
    'Bacteroides ovatus differentially abundant in ASD donor transplants',
    [ids.bact_bacteroides_ovatus], [], [], [ids.cond_autism]);

  // ===================================================================
  // Paper 32: Liu et al. 2019 — Psychobiotic meta-analysis (34 trials)
  // ===================================================================
  await makeClaim(ids.paper_liu_2019,
    'Probiotics yield small but significant effects for depression (d=-0.24) across 34 controlled trials',
    [ids.bact_lactobacillus, ids.bact_bifidobacterium], [], [], [ids.cond_depression], 'increased_in_treatment');

  await makeClaim(ids.paper_liu_2019,
    'Probiotics yield small but significant effects for anxiety (d=-0.10)',
    [ids.bact_lactobacillus, ids.bact_bifidobacterium], [], [], [ids.cond_anxiety], 'increased_in_treatment');

  await makeClaim(ids.paper_liu_2019,
    'Probiotic effects are larger in clinical/psychiatric samples (d=-0.73) than community samples',
    [], [], [], [ids.cond_depression, ids.cond_anxiety]);

  await makeClaim(ids.paper_liu_2019,
    'Prebiotics do NOT differ from placebo for depression or anxiety',
    [], [], [], [ids.cond_depression, ids.cond_anxiety], 'no_effect');

  // ===================================================================
  // Paper 33: Scheperjans et al. 2015 — Parkinson's disease microbiome
  // ===================================================================
  await makeClaim(ids.paper_scheperjans_2015,
    'Prevotellaceae abundance reduced by 77.6% in Parkinson\'s disease patients vs controls',
    [ids.bact_prevotellaceae], [], [], [ids.cond_parkinsons], 'decreased_in_disease');

  await makeClaim(ids.paper_scheperjans_2015,
    'Enterobacteriaceae abundance positively associated with postural instability and gait difficulty severity',
    [ids.bact_enterobacteriaceae], [], [], [ids.cond_parkinsons], 'increased_in_disease');

  await makeClaim(ids.paper_scheperjans_2015,
    'Classifier using four bacterial families achieves 90.3% specificity for PD identification',
    [], [], [], [ids.cond_parkinsons]);

  // ===================================================================
  // Paper 34: Ghosh et al. 2020 — Mediterranean diet + elderly microbiome
  // ===================================================================
  await makeClaim(ids.paper_ghosh_2020,
    'Mediterranean diet enriches anti-inflammatory SCFA-producing bacteria (F. prausnitzii, Roseburia, Eubacterium) in elderly',
    [ids.bact_faecalibacterium, ids.bact_roseburia, ids.bact_eubacterium], [ids.metab_scfa], [ids.mech_diet_microbiome], [ids.cond_frailty], 'increased_in_treatment');

  await makeClaim(ids.paper_ghosh_2020,
    'MedDiet reduces R. torques, Collinsella, C. ramosum — bacteria associated with age-related disease',
    [ids.bact_ruminococcus_torques, ids.bact_collinsella, ids.bact_clostridium_ramosum], [], [ids.mech_diet_microbiome], [ids.cond_frailty], 'decreased_in_disease');

  await makeClaim(ids.paper_ghosh_2020,
    'MedDiet reduces inflammatory markers (CRP, IL-17) correlated with microbiome changes',
    [], [ids.metab_crp], [ids.mech_neuroinflammation], [ids.cond_frailty]);

  await makeClaim(ids.paper_ghosh_2020,
    'MedDiet reduces secondary bile acids and p-cresol (deleterious metabolites)',
    [], [ids.metab_secondary_bile_acids, ids.metab_p_cresol], [ids.mech_diet_microbiome], [ids.cond_cognitive_decline]);

  await makeClaim(ids.paper_ghosh_2020,
    'Microbiome-diet response is consistent across 5 European countries despite baseline differences',
    [], [], [ids.mech_diet_microbiome], []);

  // ===================================================================
  // Paper 35: Claesson et al. 2012 — Elderly diet-microbiome-health
  // ===================================================================
  await makeClaim(ids.paper_claesson_2012,
    'Long-term care residents have significantly less diverse gut microbiota than community-dwelling elderly',
    [], [], [ids.mech_diversity_frailty], [ids.cond_frailty]);

  await makeClaim(ids.paper_claesson_2012,
    'Microbiota diversity loss correlates with increased frailty, co-morbidity, and inflammatory markers in elderly',
    [], [ids.metab_crp], [ids.mech_diversity_frailty], [ids.cond_frailty, ids.cond_cognitive_decline]);

  await makeClaim(ids.paper_claesson_2012,
    'Animal-product-heavy diet enriches Bacteroides and Alistipes in institutionalized elderly',
    [ids.bact_bacteroides, ids.bact_alistipes], [], [ids.mech_diet_microbiome], [ids.cond_frailty], 'increased_in_disease');

  await makeClaim(ids.paper_claesson_2012,
    'Prevotella dominance in community-dwelling elderly associated with healthier outcomes',
    [ids.bact_prevotella], [], [ids.mech_diet_microbiome], [ids.cond_frailty], 'decreased_in_disease');

  await makeClaim(ids.paper_claesson_2012,
    'Oscillibacter increased in long-stay institutional care residents',
    [ids.bact_oscillibacter], [], [ids.mech_diversity_frailty], [ids.cond_frailty], 'increased_in_disease');

  // ===================================================================
  // Batch 5: Evidence gap-filling papers (36-42)
  // ===================================================================

  // Paper 36: Sampson et al. 2016 — PD causal evidence (Cell)
  await makeClaim(ids.paper_sampson_2016,
    'Gut microbiota required for motor deficits and neuroinflammation in alpha-synuclein-overexpressing mice',
    [], [], [ids.mech_alpha_synuclein, ids.mech_neuroinflammation], [ids.cond_parkinsons]);

  await makeClaim(ids.paper_sampson_2016,
    'Germ-free conditions ameliorate PD pathology; recolonization restores motor deficits',
    [], [], [ids.mech_alpha_synuclein], [ids.cond_parkinsons]);

  await makeClaim(ids.paper_sampson_2016,
    'SCFAs promote alpha-synuclein aggregation and neuroinflammation in germ-free ASO mice',
    [], [ids.metab_scfa], [ids.mech_alpha_synuclein, ids.mech_neuroinflammation], [ids.cond_parkinsons], 'increased_in_disease');

  await makeClaim(ids.paper_sampson_2016,
    'Fecal transplant from PD patients into germ-free mice causes enhanced motor dysfunction',
    [], [], [ids.mech_alpha_synuclein], [ids.cond_parkinsons]);

  // Paper 37: Keshavarzian et al. 2015 — PD mucosal microbiome
  await makeClaim(ids.paper_keshavarzian_2015,
    'Colonic mucosal-associated Blautia, Coprococcus, and Roseburia depleted in PD patients',
    [ids.bact_blautia, ids.bact_coprococcus, ids.bact_roseburia], [ids.metab_butyrate], [ids.mech_mucosal_inflammation], [ids.cond_parkinsons], 'decreased_in_disease');

  await makeClaim(ids.paper_keshavarzian_2015,
    'Faecalibacterium reduced in sigmoid mucosa of PD patients (anti-inflammatory SCFA producer)',
    [ids.bact_faecalibacterium], [ids.metab_butyrate], [ids.mech_mucosal_inflammation], [ids.cond_parkinsons], 'decreased_in_disease');

  await makeClaim(ids.paper_keshavarzian_2015,
    'Intestinal mucosal inflammation precedes PD motor symptoms — gut-first pathogenesis',
    [], [], [ids.mech_mucosal_inflammation, ids.mech_alpha_synuclein], [ids.cond_parkinsons]);

  // Paper 38: Unger et al. 2016 — SCFA depletion in PD
  await makeClaim(ids.paper_unger_2016,
    'Fecal SCFA concentrations (acetate, propionate, butyrate) significantly reduced in PD patients',
    [], [ids.metab_acetate, ids.metab_propionate, ids.metab_butyrate], [ids.mech_scfa_neuroprotection], [ids.cond_parkinsons], 'decreased_in_disease');

  await makeClaim(ids.paper_unger_2016,
    'Prevotellaceae reduced in PD fecal samples vs controls',
    [ids.bact_prevotellaceae], [], [], [ids.cond_parkinsons], 'decreased_in_disease');

  await makeClaim(ids.paper_unger_2016,
    'Enterobacteriaceae increased in PD fecal samples',
    [ids.bact_enterobacteriaceae], [], [], [ids.cond_parkinsons], 'increased_in_disease');

  // Paper 39: Aarts et al. 2017 — ADHD microbiome (first study)
  await makeClaim(ids.paper_aarts_2017,
    'Bifidobacterium genus increased in ADHD patients compared to controls',
    [ids.bact_bifidobacterium], [], [], [ids.cond_adhd], 'increased_in_disease');

  await makeClaim(ids.paper_aarts_2017,
    'Predicted cyclohexadienyl dehydratase (dopamine precursor pathway) increased in ADHD microbiome',
    [ids.bact_bifidobacterium], [ids.metab_dopamine], [ids.mech_dopamine_synthesis], [ids.cond_adhd], 'increased_in_disease');

  await makeClaim(ids.paper_aarts_2017,
    'Neural reward anticipation (fMRI ventral striatum) associated with Bifidobacterium abundance in ADHD',
    [ids.bact_bifidobacterium], [], [ids.mech_dopamine_synthesis], [ids.cond_adhd]);

  // Paper 40: Tengeler et al. 2020 — ADHD FMT causal evidence
  await makeClaim(ids.paper_tengeler_2020,
    'Fecal transplant from ADHD patients into germ-free mice produces anxiety-like behavior and structural brain changes',
    [], [], [], [ids.cond_adhd, ids.cond_anxiety]);

  await makeClaim(ids.paper_tengeler_2020,
    'ADHD microbiota transplant alters brain structure (thalamus, hippocampus) in recipient mice',
    [], [], [], [ids.cond_adhd]);

  await makeClaim(ids.paper_tengeler_2020,
    'ADHD-associated microbiota shifts Lachnospiraceae and Ruminococcaceae abundance in recipient mice',
    [ids.bact_lachnospiraceae, ids.bact_ruminococcaceae], [], [], [ids.cond_adhd]);

  // Paper 41: Bos et al. 2022 — HELIUS multi-ethnic depression cohort
  await makeClaim(ids.paper_bos_2022,
    'Alpha-diversity and beta-diversity both predict depressive symptoms across 6 ethnic groups (N=3211)',
    [], [], [], [ids.cond_depression]);

  await makeClaim(ids.paper_bos_2022,
    'Christensenellaceae, Lachnospiraceae, Ruminococcaceae associated with depressive symptoms across ethnicities',
    [ids.bact_christensenellaceae, ids.bact_lachnospiraceae, ids.bact_ruminococcaceae], [], [], [ids.cond_depression], 'increased_in_disease');

  await makeClaim(ids.paper_bos_2022,
    'Microbiota-depression associations do NOT differ between ethnic groups — cross-ethnic invariance',
    [], [], [], [ids.cond_depression]);

  await makeClaim(ids.paper_bos_2022,
    'Beta-diversity explains 29-18% of ethnic differences in depressive symptoms',
    [], [], [], [ids.cond_depression]);

  // Paper 42: Jacka et al. 2017 — SMILES diet intervention RCT
  await makeClaim(ids.paper_jacka_2017,
    'Mediterranean diet intervention reduces depression symptoms (MADRS) vs social support control (d=-1.16)',
    [], [], [ids.mech_diet_microbiome], [ids.cond_depression], 'increased_in_treatment');

  await makeClaim(ids.paper_jacka_2017,
    'Dietary improvement achieves 32.3% remission rate vs 8% control (NNT=4.1) in clinically diagnosed MDD',
    [], [], [ids.mech_diet_microbiome], [ids.cond_depression], 'increased_in_treatment');

  await makeClaim(ids.paper_jacka_2017,
    'Effects remain significant after controlling for physical activity, BMI, smoking, and medication changes',
    [], [], [ids.mech_diet_microbiome], [ids.cond_depression]);

  // ===================================================================
  // Batch 6: Evidence gap closure papers (43-52)
  // ===================================================================

  // Paper 43: Coello et al. 2019 — Bipolar disorder case-control (Denmark)
  await makeClaim(ids.paper_coello_2019,
    'Flavonifractor present in 61% of BD patients vs 39% of controls (OR=2.9, P=5.8e-4)',
    [ids.bact_flavonifractor], [], [], [ids.cond_bipolar], 'increased_in_disease');

  await makeClaim(ids.paper_coello_2019,
    'Unaffected first-degree relatives do NOT differ from controls — microbiome changes are state-related, not familial',
    [], [], [], [ids.cond_bipolar]);

  await makeClaim(ids.paper_coello_2019,
    'Flavonifractor-BD association weakens after adjusting for smoking (confound)',
    [ids.bact_flavonifractor], [], [], [ids.cond_bipolar]);

  // Paper 44: Tang et al. 2025 — Bipolar FMT causal evidence (China)
  await makeClaim(ids.paper_tang_2025,
    'FMT from BD patients with cognitive impairment induces depression-like behavior and working memory deficits in mice',
    [], [], [ids.mech_fmt_transfer, ids.mech_synaptic_plasticity], [ids.cond_bipolar]);

  await makeClaim(ids.paper_tang_2025,
    'BD-CI recipient mice show reduced dendritic complexity and decreased PSD-95 (synaptic plasticity marker)',
    [], [], [ids.mech_synaptic_plasticity], [ids.cond_bipolar]);

  await makeClaim(ids.paper_tang_2025,
    'Healthy donor microbiota supplementation partially reverses behavioral and neuroplasticity deficits',
    [], [], [ids.mech_fmt_transfer, ids.mech_synaptic_plasticity], [ids.cond_bipolar]);

  await makeClaim(ids.paper_tang_2025,
    'Prevotella, Faecalibacterium, and Roseburia correlate with cognitive impairment in BD',
    [ids.bact_prevotella, ids.bact_faecalibacterium, ids.bact_roseburia], [], [], [ids.cond_bipolar, ids.cond_cognitive_decline]);

  // Paper 45: Hemmings et al. 2017 — PTSD gut microbiome (South Africa)
  await makeClaim(ids.paper_hemmings_2017,
    'Actinobacteria, Lentisphaerae, and Verrucomicrobia depleted in PTSD vs trauma-exposed controls',
    [ids.bact_actinobacteria, ids.bact_lentisphaerae, ids.bact_verrucomicrobia], [], [], [ids.cond_ptsd], 'decreased_in_disease');

  await makeClaim(ids.paper_hemmings_2017,
    'Decreased total abundance of three phyla associated with higher PTSD severity (CAPS scores; r=-0.387)',
    [ids.bact_actinobacteria, ids.bact_lentisphaerae, ids.bact_verrucomicrobia], [], [], [ids.cond_ptsd], 'decreased_in_disease');

  await makeClaim(ids.paper_hemmings_2017,
    'No differences in alpha or beta diversity between PTSD and trauma-exposed controls',
    [], [], [], [ids.cond_ptsd]);

  // Paper 46: Tomova et al. 2015 — ASD gut microbiota (Slovakia)
  await makeClaim(ids.paper_tomova_2015,
    'Decreased Bacteroidetes/Firmicutes ratio in ASD children vs controls',
    [ids.bact_bacteroides, ids.bact_firmicutes], [], [], [ids.cond_autism]);

  await makeClaim(ids.paper_tomova_2015,
    'Desulfovibrio abundance positively correlates with autism severity (ADI restricted/repetitive behavior)',
    [ids.bact_desulfovibrio], [], [], [ids.cond_autism], 'increased_in_disease');

  await makeClaim(ids.paper_tomova_2015,
    'Probiotic supplementation normalizes Bacteroidetes/Firmicutes ratio, Desulfovibrio, and Bifidobacterium levels in ASD',
    [ids.bact_desulfovibrio, ids.bact_bifidobacterium], [], [], [ids.cond_autism], 'increased_in_treatment');

  await makeClaim(ids.paper_tomova_2015,
    'Strong positive correlation between autism severity and GI dysfunction severity',
    [], [], [ids.mech_leaky_gut], [ids.cond_autism]);

  // Paper 47: Zhang M et al. 2018 — ASD gut microbiota (China)
  await makeClaim(ids.paper_zhang_m_2018,
    'Increased Bacteroidetes/Firmicutes ratio in ASD group (opposite direction from Tomova 2015)',
    [ids.bact_bacteroides, ids.bact_firmicutes], [], [], [ids.cond_autism]);

  await makeClaim(ids.paper_zhang_m_2018,
    'Sutterella, Odoribacter, and Butyricimonas significantly enriched in ASD',
    [ids.bact_sutterella, ids.bact_odoribacter, ids.bact_butyricimonas], [], [], [ids.cond_autism], 'increased_in_disease');

  await makeClaim(ids.paper_zhang_m_2018,
    'Veillonella and Streptococcus significantly depleted in ASD',
    [ids.bact_veillonella, ids.bact_streptococcus], [], [], [ids.cond_autism], 'decreased_in_disease');

  await makeClaim(ids.paper_zhang_m_2018,
    'Butyrate and lactate producers less abundant in ASD group',
    [], [ids.metab_butyrate], [], [ids.cond_autism], 'decreased_in_disease');

  // Paper 48: Painold et al. 2019 — BD during depressive episode (Austria)
  await makeClaim(ids.paper_painold_2019,
    'Ruminococcaceae and Faecalibacterium depleted in BD inpatients during depressive episode',
    [ids.bact_ruminococcaceae, ids.bact_faecalibacterium], [ids.metab_butyrate], [], [ids.cond_bipolar], 'decreased_in_disease');

  await makeClaim(ids.paper_painold_2019,
    'Actinobacteria and Coriobacteriia more abundant in BD during depressive episode',
    [ids.bact_actinobacteria, ids.bact_coriobacteriia], [], [], [ids.cond_bipolar], 'increased_in_disease');

  await makeClaim(ids.paper_painold_2019,
    'Microbial alpha diversity negatively correlates with BD illness duration (R=-0.408, longer illness = less diverse)',
    [], [], [], [ids.cond_bipolar]);

  // Paper 49: Berding et al. 2023 — Psychobiotic diet RCT (Ireland)
  await makeClaim(ids.paper_berding_2023,
    'Psychobiotic diet reduces perceived stress by 32% vs 17% in controls (dose-dependent)',
    [], [], [ids.mech_diet_microbiome], [ids.cond_anxiety], 'increased_in_treatment');

  await makeClaim(ids.paper_berding_2023,
    'Microbial stability (not composition) predicts stress reduction — paradigm-level finding',
    [], [], [ids.mech_microbial_stability, ids.mech_diet_microbiome], [ids.cond_anxiety]);

  await makeClaim(ids.paper_berding_2023,
    'Psychobiotic diet alters 40 specific fecal lipids and urinary tryptophan metabolites',
    [], [ids.metab_tryptophan], [ids.mech_diet_microbiome], []);

  // Paper 50: Tamana et al. 2021 — Infant gut microbiome + neurodevelopment (Canada)
  await makeClaim(ids.paper_tamana_2021,
    'Bacteroidetes-dominant cluster at 12 months associated with higher cognitive (+4.8), language (+4.2), and motor (+3.1) development at age 2',
    [ids.bact_bacteroides], [], [ids.mech_developmental_window], []);

  await makeClaim(ids.paper_tamana_2021,
    'Neurodevelopment-microbiome association is sex-specific: found in males, not females',
    [], [], [ids.mech_developmental_window], []);

  await makeClaim(ids.paper_tamana_2021,
    'No significant microbiome-outcome associations at 4-month timepoint — 12-month window is critical',
    [], [], [ids.mech_developmental_window], []);

  await makeClaim(ids.paper_tamana_2021,
    'Proteobacteria-dominant cluster associated with poorer neurodevelopmental outcomes',
    [ids.bact_proteobacteria], [], [ids.mech_developmental_window], [ids.cond_cognitive_decline]);

  // Paper 51: Gao et al. 2019 — Infant gut microbiome + brain connectivity (USA)
  await makeClaim(ids.paper_gao_2019,
    'Gut microbial alpha diversity associated with amygdala-thalamus functional connectivity in 1-year-olds',
    [], [], [ids.mech_amygdala_connectivity, ids.mech_developmental_window], []);

  await makeClaim(ids.paper_gao_2019,
    'Alpha diversity associated with anterior cingulate-anterior insula connectivity (threat processing regions)',
    [], [], [ids.mech_amygdala_connectivity], [ids.cond_anxiety]);

  await makeClaim(ids.paper_gao_2019,
    'First study demonstrating direct link between infant gut microbiome and brain functional connectivity via fMRI',
    [], [], [ids.mech_amygdala_connectivity, ids.mech_developmental_window], []);

  // Paper 52: Freijy et al. 2023 — Prebiotic diet RCT (Australia)
  await makeClaim(ids.paper_freijy_2023,
    'High-prebiotic diet reduces total mood disturbance vs placebo (d=-0.60, P=0.039)',
    [], [], [ids.mech_diet_microbiome], [ids.cond_depression, ids.cond_anxiety], 'increased_in_treatment');

  await makeClaim(ids.paper_freijy_2023,
    'Probiotic supplements alone show NO benefit for mood (d=-0.19, P=0.51)',
    [ids.bact_lactobacillus, ids.bact_bifidobacterium], [], [], [ids.cond_depression, ids.cond_anxiety], 'no_effect');

  await makeClaim(ids.paper_freijy_2023,
    'Synbiotic (diet + probiotic) shows NO benefit — diet alone outperforms combination',
    [], [], [ids.mech_diet_microbiome], [ids.cond_depression, ids.cond_anxiety], 'no_effect');

  await makeClaim(ids.paper_freijy_2023,
    'Prebiotic diet specifically improves anxiety, stress, and sleep',
    [], [], [ids.mech_diet_microbiome], [ids.cond_anxiety], 'increased_in_treatment');

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
