/**
 * Academic Paper Digestion Fixture
 *
 * Ingests 6 real papers from gut-microbiome-mental-health research (2022-2025)
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
import { Delta } from '../core/types';

// Stable entity IDs for cross-paper reuse
const ids = {
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
};

// Claim IDs are unique per paper-claim pair
let claimCounter = 0;
function claimId(paperId: string): string {
  return `claim:${paperId.replace('paper:', '')}:${++claimCounter}`;
}

/**
 * Seed all entity annotations (names, types, metadata).
 * Returns all deltas created.
 */
function seedEntities(db: RhizomeDB, author: string): Delta[] {
  const deltas: Delta[] = [];

  function ann(entityId: string, property: string, value: string | number | boolean, ts?: number): void {
    const delta = db.createDelta(author, [
      { role: `${property}d`, target: { id: entityId, context: property } },
      { role: property, target: value }
    ]);
    if (ts) delta.timestamp = ts;
    deltas.push(delta);
  }

  // ----- Papers -----
  ann(ids.paper_mehta_2025, 'title', 'Gut Microbiota and Mental Health: A Comprehensive Review of Gut-Brain Interactions in Mood Disorders');
  ann(ids.paper_mehta_2025, 'journal', 'Cureus');
  ann(ids.paper_mehta_2025, 'year', 2025);
  ann(ids.paper_mehta_2025, 'type', 'paper');
  ann(ids.paper_mehta_2025, 'doi', '10.7759/cureus.80323');

  ann(ids.paper_cao_2025, 'title', 'Gut microbiota variations in depression and anxiety: a systematic review');
  ann(ids.paper_cao_2025, 'journal', 'BMC Psychiatry');
  ann(ids.paper_cao_2025, 'year', 2025);
  ann(ids.paper_cao_2025, 'type', 'paper');
  ann(ids.paper_cao_2025, 'doi', '10.1186/s12888-025-06871-8');

  ann(ids.paper_rathore_2025, 'title', 'The Bidirectional Relationship Between the Gut Microbiome and Mental Health: A Comprehensive Review');
  ann(ids.paper_rathore_2025, 'journal', 'Cureus');
  ann(ids.paper_rathore_2025, 'year', 2025);
  ann(ids.paper_rathore_2025, 'type', 'paper');

  ann(ids.paper_zhang_2025, 'title', 'Gut microbiota as a novel target for treating anxiety and depression: from mechanisms to multimodal interventions');
  ann(ids.paper_zhang_2025, 'journal', 'Frontiers in Microbiology');
  ann(ids.paper_zhang_2025, 'year', 2025);
  ann(ids.paper_zhang_2025, 'type', 'paper');

  ann(ids.paper_shaikh_2025, 'title', 'Understanding the Impact of the Gut Microbiome on Mental Health: A Systematic Review');
  ann(ids.paper_shaikh_2025, 'journal', 'Cureus');
  ann(ids.paper_shaikh_2025, 'year', 2025);
  ann(ids.paper_shaikh_2025, 'type', 'paper');

  ann(ids.paper_radjabzadeh_2022, 'title', 'Gut microbiome-wide association study of depressive symptoms');
  ann(ids.paper_radjabzadeh_2022, 'journal', 'Nature Communications');
  ann(ids.paper_radjabzadeh_2022, 'year', 2022);
  ann(ids.paper_radjabzadeh_2022, 'type', 'paper');
  ann(ids.paper_radjabzadeh_2022, 'doi', '10.1038/s41467-022-34502-3');

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
    ann(id, 'name', name);
    ann(id, 'type', 'researcher');
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
    ann(id, 'name', name);
    ann(id, 'type', 'institution');
    ann(id, 'country', country);
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
    ann(id, 'name', name);
    ann(id, 'type', 'bacterium');
    ann(id, 'taxonomic_rank', rank);
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
    ann(id, 'name', name);
    ann(id, 'type', 'metabolite');
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
    ann(id, 'name', name);
    ann(id, 'type', 'mechanism');
  }

  // ----- Conditions -----
  const conditions: [string, string][] = [
    [ids.cond_depression, 'Major Depressive Disorder'],
    [ids.cond_anxiety, 'Anxiety Disorders'],
    [ids.cond_bipolar, 'Bipolar Disorder'],
    [ids.cond_schizophrenia, 'Schizophrenia'],
  ];
  for (const [id, name] of conditions) {
    ann(id, 'name', name);
    ann(id, 'type', 'condition');
  }

  return deltas;
}

/**
 * Seed relationships between entities.
 */
function seedRelationships(db: RhizomeDB, author: string): Delta[] {
  const deltas: Delta[] = [];

  function rel(roleA: string, a: string, ctxA: string, roleB: string, b: string, ctxB: string): void {
    deltas.push(db.createDelta(author, [
      { role: roleA, target: { id: a, context: ctxA } },
      { role: roleB, target: { id: b, context: ctxB } }
    ]));
  }

  // ===== Paper → Researcher (authored_by) =====

  // Paper 1: Mehta et al.
  rel('paper', ids.paper_mehta_2025, 'authors', 'author', ids.researcher_mehta, 'papers');
  rel('paper', ids.paper_mehta_2025, 'authors', 'author', ids.researcher_juneja, 'papers');

  // Paper 2: Cao et al.
  rel('paper', ids.paper_cao_2025, 'authors', 'author', ids.researcher_cao, 'papers');
  rel('paper', ids.paper_cao_2025, 'authors', 'author', ids.researcher_meng, 'papers');

  // Paper 3: Rathore et al. — includes Sunil Naik (shared with paper 5)
  rel('paper', ids.paper_rathore_2025, 'authors', 'author', ids.researcher_rathore, 'papers');
  rel('paper', ids.paper_rathore_2025, 'authors', 'author', ids.researcher_shukla, 'papers');
  rel('paper', ids.paper_rathore_2025, 'authors', 'author', ids.researcher_naik, 'papers');

  // Paper 4: Zhang et al.
  rel('paper', ids.paper_zhang_2025, 'authors', 'author', ids.researcher_zhang, 'papers');
  rel('paper', ids.paper_zhang_2025, 'authors', 'author', ids.researcher_jiang, 'papers');
  rel('paper', ids.paper_zhang_2025, 'authors', 'author', ids.researcher_song, 'papers');

  // Paper 5: Shaikh et al. — includes Sunil Naik (shared with paper 3)
  rel('paper', ids.paper_shaikh_2025, 'authors', 'author', ids.researcher_shaikh, 'papers');
  rel('paper', ids.paper_shaikh_2025, 'authors', 'author', ids.researcher_dey, 'papers');
  rel('paper', ids.paper_shaikh_2025, 'authors', 'author', ids.researcher_naik, 'papers');
  rel('paper', ids.paper_shaikh_2025, 'authors', 'author', ids.researcher_hasan, 'papers');

  // Paper 6: Radjabzadeh et al.
  rel('paper', ids.paper_radjabzadeh_2022, 'authors', 'author', ids.researcher_radjabzadeh, 'papers');
  rel('paper', ids.paper_radjabzadeh_2022, 'authors', 'author', ids.researcher_kraaij, 'papers');
  rel('paper', ids.paper_radjabzadeh_2022, 'authors', 'author', ids.researcher_amin, 'papers');
  rel('paper', ids.paper_radjabzadeh_2022, 'authors', 'author', ids.researcher_van_duijn, 'papers');

  // ===== Researcher → Institution =====
  rel('researcher', ids.researcher_mehta, 'affiliations', 'member', ids.inst_maharaja, 'researchers');
  rel('researcher', ids.researcher_cao, 'affiliations', 'member', ids.inst_shandong, 'researchers');
  rel('researcher', ids.researcher_meng, 'affiliations', 'member', ids.inst_shandong, 'researchers');
  rel('researcher', ids.researcher_zhang, 'affiliations', 'member', ids.inst_guangxi, 'researchers');
  rel('researcher', ids.researcher_jiang, 'affiliations', 'member', ids.inst_guangxi, 'researchers');
  rel('researcher', ids.researcher_song, 'affiliations', 'member', ids.inst_guangxi, 'researchers');
  rel('researcher', ids.researcher_shaikh, 'affiliations', 'member', ids.inst_mgm_indore, 'researchers');
  rel('researcher', ids.researcher_dey, 'affiliations', 'member', ids.inst_brainware, 'researchers');
  rel('researcher', ids.researcher_hasan, 'affiliations', 'member', ids.inst_aligarh, 'researchers');
  rel('researcher', ids.researcher_radjabzadeh, 'affiliations', 'member', ids.inst_erasmus, 'researchers');
  rel('researcher', ids.researcher_kraaij, 'affiliations', 'member', ids.inst_erasmus, 'researchers');
  rel('researcher', ids.researcher_amin, 'affiliations', 'member', ids.inst_erasmus, 'researchers');
  rel('researcher', ids.researcher_van_duijn, 'affiliations', 'member', ids.inst_erasmus, 'researchers');

  // ===== Bacterium → produces → Metabolite =====
  // These are facts asserted across multiple papers
  rel('producer', ids.bact_lactobacillus, 'produces', 'product', ids.metab_gaba, 'produced_by');
  rel('producer', ids.bact_lactobacillus, 'produces', 'product', ids.metab_serotonin, 'produced_by');
  rel('producer', ids.bact_bifidobacterium, 'produces', 'product', ids.metab_gaba, 'produced_by');
  rel('producer', ids.bact_bacteroides, 'produces', 'product', ids.metab_gaba, 'produced_by');
  rel('producer', ids.bact_enterococcus, 'produces', 'product', ids.metab_serotonin, 'produced_by');
  rel('producer', ids.bact_enterococcus, 'produces', 'product', ids.metab_dopamine, 'produced_by');
  rel('producer', ids.bact_bacillus, 'produces', 'product', ids.metab_dopamine, 'produced_by');
  rel('producer', ids.bact_streptococcus, 'produces', 'product', ids.metab_serotonin, 'produced_by');
  rel('producer', ids.bact_faecalibacterium, 'produces', 'product', ids.metab_butyrate, 'produced_by');
  rel('producer', ids.bact_coprococcus, 'produces', 'product', ids.metab_butyrate, 'produced_by');
  rel('producer', ids.bact_ruminococcaceae, 'produces', 'product', ids.metab_butyrate, 'produced_by');

  return deltas;
}

/**
 * Seed claims — the specific assertions each paper makes.
 * Each claim is a first-class entity linked to its paper and the concepts it references.
 */
function seedClaims(db: RhizomeDB, author: string): Delta[] {
  const deltas: Delta[] = [];

  function ann(entityId: string, property: string, value: string | number | boolean): void {
    deltas.push(db.createDelta(author, [
      { role: `${property}d`, target: { id: entityId, context: property } },
      { role: property, target: value }
    ]));
  }

  function rel(roleA: string, a: string, ctxA: string, roleB: string, b: string, ctxB: string): void {
    deltas.push(db.createDelta(author, [
      { role: roleA, target: { id: a, context: ctxA } },
      { role: roleB, target: { id: b, context: ctxB } }
    ]));
  }

  function makeClaim(
    paperId: string,
    statement: string,
    bacteria: string[],
    metabolites: string[],
    mechanisms: string[],
    conditions: string[],
    direction?: string
  ): string {
    const cid = claimId(paperId);
    ann(cid, 'type', 'claim');
    ann(cid, 'statement', statement);
    if (direction) ann(cid, 'direction', direction);

    rel('source', paperId, 'claims', 'claim', cid, 'source_paper');
    for (const b of bacteria) rel('claim', cid, 'bacteria', 'subject', b, 'claims_about');
    for (const m of metabolites) rel('claim', cid, 'metabolites', 'subject', m, 'claims_about');
    for (const mech of mechanisms) rel('claim', cid, 'mechanisms', 'subject', mech, 'claims_about');
    for (const c of conditions) rel('claim', cid, 'conditions', 'subject', c, 'claims_about');
    return cid;
  }

  // ===================================================================
  // Paper 1: Mehta et al. 2025 — Cureus mood disorders review
  // ===================================================================
  makeClaim(ids.paper_mehta_2025,
    'Lactobacilli and Bifidobacterium produce acetylcholine and GABA',
    [ids.bact_lactobacillus, ids.bact_bifidobacterium], [ids.metab_gaba], [], []);

  makeClaim(ids.paper_mehta_2025,
    'Candida, Streptococcus, Escherichia, and Enterococcus secrete serotonin',
    [ids.bact_streptococcus, ids.bact_enterococcus], [ids.metab_serotonin], [], []);

  makeClaim(ids.paper_mehta_2025,
    'Bacillus and Serratia produce dopamine',
    [ids.bact_bacillus], [ids.metab_dopamine], [], []);

  makeClaim(ids.paper_mehta_2025,
    'SCFAs cross the blood-brain barrier through monocarboxylate transporters and reduce neuroinflammation',
    [], [ids.metab_scfa], [ids.mech_bbb, ids.mech_neuroinflammation], []);

  makeClaim(ids.paper_mehta_2025,
    'Low SCFA levels correlate with major depressive disorder',
    [], [ids.metab_scfa], [], [ids.cond_depression], 'decreased_in_disease');

  makeClaim(ids.paper_mehta_2025,
    'Flavonifractor degrades quercetin and is associated with elevated oxidative stress in bipolar disorder',
    [ids.bact_flavonifractor], [], [], [ids.cond_bipolar], 'increased_in_disease');

  makeClaim(ids.paper_mehta_2025,
    'Vagus nerve transmits gut signals to brainstem affecting mood',
    [], [], [ids.mech_vagus], [ids.cond_depression, ids.cond_anxiety]);

  makeClaim(ids.paper_mehta_2025,
    'HPA axis dysregulation in depression linked to gut dysbiosis',
    [], [ids.metab_cortisol], [ids.mech_hpa], [ids.cond_depression]);

  // ===================================================================
  // Paper 2: Cao et al. 2025 — BMC Psychiatry systematic review
  // ===================================================================
  makeClaim(ids.paper_cao_2025,
    'Alistipes enriched in depression across 7 studies',
    [ids.bact_alistipes], [], [], [ids.cond_depression], 'increased_in_disease');

  makeClaim(ids.paper_cao_2025,
    'Eggerthella enriched in depression',
    [ids.bact_eggerthella], [], [], [ids.cond_depression], 'increased_in_disease');

  makeClaim(ids.paper_cao_2025,
    'Prevotella and Faecalibacterium depleted in depression',
    [ids.bact_prevotella, ids.bact_faecalibacterium], [ids.metab_butyrate], [], [ids.cond_depression], 'decreased_in_disease');

  makeClaim(ids.paper_cao_2025,
    'Actinobacteria and Proteobacteria enriched at phylum level in depression',
    [ids.bact_actinobacteria, ids.bact_proteobacteria], [], [], [ids.cond_depression], 'increased_in_disease');

  makeClaim(ids.paper_cao_2025,
    'Lachnospira and Faecalibacterium decreased in anxiety',
    [ids.bact_lachnospira, ids.bact_faecalibacterium], [], [], [ids.cond_anxiety], 'decreased_in_disease');

  makeClaim(ids.paper_cao_2025,
    'Gut microbiota influence mental health through neural, immune, and chemical signal networks including vagus nerve and HPA axis',
    [], [ids.metab_butyrate], [ids.mech_vagus, ids.mech_hpa], [ids.cond_depression, ids.cond_anxiety]);

  // ===================================================================
  // Paper 3: Rathore et al. 2025 — Cureus bidirectional review
  // ===================================================================
  makeClaim(ids.paper_rathore_2025,
    'Lactobacillus and Bifidobacterium increase tryptophan availability for serotonin synthesis',
    [ids.bact_lactobacillus, ids.bact_bifidobacterium], [ids.metab_tryptophan, ids.metab_serotonin], [], []);

  makeClaim(ids.paper_rathore_2025,
    'Enterococcus and Bacillus contribute to dopamine production; disruptions linked to anhedonia',
    [ids.bact_enterococcus, ids.bact_bacillus], [ids.metab_dopamine], [], [ids.cond_depression]);

  makeClaim(ids.paper_rathore_2025,
    'Bacteroides and Lactobacillus synthesize GABA, reducing neuronal excitability',
    [ids.bact_bacteroides, ids.bact_lactobacillus], [ids.metab_gaba], [], []);

  makeClaim(ids.paper_rathore_2025,
    'Proteobacteria pathogenic overrepresentation associated with psychiatric disorders',
    [ids.bact_proteobacteria], [], [], [ids.cond_depression, ids.cond_anxiety, ids.cond_schizophrenia], 'increased_in_disease');

  makeClaim(ids.paper_rathore_2025,
    'Butyrate increases brain-derived neurotrophic factor synthesis',
    [], [ids.metab_butyrate, ids.metab_bdnf], [], []);

  makeClaim(ids.paper_rathore_2025,
    'Approximately 90% of body serotonin produced by enterochromaffin cells in response to microbial metabolites',
    [], [ids.metab_serotonin], [], []);

  makeClaim(ids.paper_rathore_2025,
    'Dysbiosis increases neuroinflammation via LPS translocation through leaky gut',
    [], [ids.metab_lps], [ids.mech_neuroinflammation, ids.mech_leaky_gut], [ids.cond_depression]);

  // ===================================================================
  // Paper 4: Zhang et al. 2025 — Frontiers multimodal interventions
  // ===================================================================
  makeClaim(ids.paper_zhang_2025,
    'Vagus nerve stimulation produces anxiolytic effects through noradrenergic pathways and AMPAR-mediated neurotransmission',
    [], [], [ids.mech_vagus], [ids.cond_anxiety]);

  makeClaim(ids.paper_zhang_2025,
    'Gut dysbiosis disrupts HPA signaling, elevating cortisol and worsening anxiety/depression',
    [], [ids.metab_cortisol], [ids.mech_hpa], [ids.cond_depression, ids.cond_anxiety]);

  makeClaim(ids.paper_zhang_2025,
    'Dysbiosis increases intestinal permeability allowing LPS to trigger pro-inflammatory cytokines (IL-6, IL-1β, TNF-α)',
    [], [ids.metab_lps], [ids.mech_leaky_gut, ids.mech_neuroinflammation], [ids.cond_depression, ids.cond_anxiety]);

  makeClaim(ids.paper_zhang_2025,
    'SCFAs cross blood-brain barrier and reduce neuroinflammation by inhibiting histone deacetylase activity',
    [], [ids.metab_scfa], [ids.mech_bbb, ids.mech_neuroinflammation], []);

  makeClaim(ids.paper_zhang_2025,
    'Reduced butyrate availability disrupts mental health through altered BDNF expression',
    [], [ids.metab_butyrate, ids.metab_bdnf], [], [ids.cond_depression], 'decreased_in_disease');

  makeClaim(ids.paper_zhang_2025,
    'Approximately 3.15% of global population suffers from MDD while 4.80% experience anxiety disorders',
    [], [], [], [ids.cond_depression, ids.cond_anxiety]);

  // ===================================================================
  // Paper 5: Shaikh et al. 2025 — Cureus systematic review
  // ===================================================================
  makeClaim(ids.paper_shaikh_2025,
    'Depression associated with reduced bacterial diversity and elevated Firmicutes levels',
    [ids.bact_firmicutes], [], [], [ids.cond_depression], 'increased_in_disease');

  makeClaim(ids.paper_shaikh_2025,
    'Anxiety characterized by low SCFA-producing bacteria and increased Proteobacteria',
    [ids.bact_proteobacteria], [ids.metab_scfa], [], [ids.cond_anxiety], 'increased_in_disease');

  makeClaim(ids.paper_shaikh_2025,
    'Schizophrenia linked to endotoxemia and decreased Lactobacillus populations',
    [ids.bact_lactobacillus], [ids.metab_lps], [], [ids.cond_schizophrenia], 'decreased_in_disease');

  makeClaim(ids.paper_shaikh_2025,
    'Bipolar disorder shows altered Firmicutes/Bacteroidetes ratios',
    [ids.bact_firmicutes, ids.bact_bacteroides], [], [], [ids.cond_bipolar]);

  makeClaim(ids.paper_shaikh_2025,
    'Probiotics and dietary changes were as effective as drug treatment in alleviating symptoms',
    [], [], [], [ids.cond_depression, ids.cond_anxiety]);

  // ===================================================================
  // Paper 6: Radjabzadeh et al. 2022 — Nature Communications MWAS
  // ===================================================================
  makeClaim(ids.paper_radjabzadeh_2022,
    'Eggerthella associated with depressive symptoms in cohort of 1054 participants, replicated in 1539',
    [ids.bact_eggerthella], [], [], [ids.cond_depression], 'increased_in_disease');

  makeClaim(ids.paper_radjabzadeh_2022,
    'Coprococcus associated with depressive symptoms',
    [ids.bact_coprococcus], [], [], [ids.cond_depression]);

  makeClaim(ids.paper_radjabzadeh_2022,
    'Subdoligranulum and Sellimonas associated with depressive symptoms',
    [ids.bact_subdoligranulum, ids.bact_sellimonas], [], [], [ids.cond_depression]);

  makeClaim(ids.paper_radjabzadeh_2022,
    'Hungatella and Ruminococcaceae associated with depressive symptoms',
    [ids.bact_hungatella, ids.bact_ruminococcaceae], [], [], [ids.cond_depression]);

  makeClaim(ids.paper_radjabzadeh_2022,
    'Depression-associated bacteria involved in synthesis of glutamate, butyrate, serotonin and GABA',
    [], [ids.metab_glutamate, ids.metab_butyrate, ids.metab_serotonin, ids.metab_gaba], [], [ids.cond_depression]);

  return deltas;
}

/**
 * Seed the full academic knowledge graph into a RhizomeDB instance.
 */
export async function seedAcademicPapers(db: RhizomeDB): Promise<{
  totalDeltas: number;
  entityIds: typeof ids;
}> {
  const author = 'digestion-agent';
  claimCounter = 0;

  const entityDeltas = seedEntities(db, author);
  const relationshipDeltas = seedRelationships(db, author);
  const claimDeltas = seedClaims(db, author);

  const allDeltas = [...entityDeltas, ...relationshipDeltas, ...claimDeltas];
  await db.persistDeltas(allDeltas);

  return {
    totalDeltas: allDeltas.length,
    entityIds: ids
  };
}

export { ids as entityIds };
