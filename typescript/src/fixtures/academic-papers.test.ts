/**
 * Academic Paper Knowledge Graph Tests
 *
 * Verifies that real gut-microbiome-mental-health papers (2022-2025)
 * can be digested into a queryable knowledge graph using RhizomeDB's
 * delta/HyperView model. Tests cross-paper queries, shared entities,
 * provenance tracking, claim aggregation, and graph analysis.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { RhizomeDB } from '../storage/instance';
import { seedAcademicPapers, ids } from './academic-papers.fixture';

describe('Academic Paper Knowledge Graph', () => {
  let db: RhizomeDB;

  beforeAll(async () => {
    db = new RhizomeDB({ storage: 'memory', systemId: 'academic-digestion' });
    const result = await seedAcademicPapers(db);
    // eslint-disable-next-line no-console
    console.error(`Seeded ${result.totalDeltas} deltas from 35 papers`);
  });

  describe('Basic ingestion', () => {
    it('should have ingested a substantial number of deltas', () => {
      const stats = db.getStats();
      expect(stats.totalDeltas).toBeGreaterThan(200);
    });

    it('should resolve paper metadata', () => {
      const paper = db.resolve(ids.paper_radjabzadeh_2022);
      expect(paper.title).toBe('Gut microbiome-wide association study of depressive symptoms');
      expect(paper.journal).toBe('Nature Communications');
      expect(paper.year).toBe(2022);
    });

    it('should resolve all 6 papers', () => {
      const paperIds = [
        ids.paper_mehta_2025,
        ids.paper_cao_2025,
        ids.paper_rathore_2025,
        ids.paper_zhang_2025,
        ids.paper_shaikh_2025,
        ids.paper_radjabzadeh_2022
      ];

      for (const paperId of paperIds) {
        const paper = db.resolve(paperId);
        expect(paper.title).toBeDefined();
        expect(paper.journal).toBeDefined();
        expect(paper.year).toBeDefined();
      }
    });
  });

  describe('Collection queries (entitiesOfType)', () => {
    it('should find all 35 papers', () => {
      const papers = db.entitiesOfType('paper');
      expect(papers).toHaveLength(35);
    });

    it('should find all bacteria (batch 1 + batch 2)', () => {
      const bacteria = db.entitiesOfType('bacterium');
      expect(bacteria.length).toBeGreaterThanOrEqual(28);
    });

    it('should find all metabolites', () => {
      const metabolites = db.entitiesOfType('metabolite');
      expect(metabolites.length).toBeGreaterThanOrEqual(14);
    });

    it('should find all claims (6 original + 10 new papers)', () => {
      const claims = db.entitiesOfType('claim');
      expect(claims.length).toBeGreaterThanOrEqual(70);
    });

    it('should find all researchers', () => {
      const researchers = db.entitiesOfType('researcher');
      expect(researchers.length).toBeGreaterThanOrEqual(33);
    });

    it('should find all institutions (batch 1 + batch 2)', () => {
      const institutions = db.entitiesOfType('institution');
      expect(institutions.length).toBeGreaterThanOrEqual(17);
    });
  });

  describe('Entity property discovery', () => {
    it('should discover properties of a paper', () => {
      const props = db.entityProperties(ids.paper_radjabzadeh_2022);
      expect(props).toContain('title');
      expect(props).toContain('journal');
      expect(props).toContain('year');
      expect(props).toContain('type');
      expect(props).toContain('doi');
      expect(props).toContain('authors');
      expect(props).toContain('claims');
    });

    it('should discover properties of a bacterium', () => {
      const props = db.entityProperties(ids.bact_lactobacillus);
      expect(props).toContain('name');
      expect(props).toContain('type');
      expect(props).toContain('taxonomic_rank');
      expect(props).toContain('produces');
      expect(props).toContain('claims_about');
    });

    it('should discover properties of a researcher', () => {
      // Radjabzadeh has an affiliation; Naik does not
      const props = db.entityProperties(ids.researcher_radjabzadeh);
      expect(props).toContain('name');
      expect(props).toContain('type');
      expect(props).toContain('papers');
      expect(props).toContain('affiliations');
    });
  });

  describe('Cross-paper entity reuse', () => {
    it('should find Sunil Naik as author of two different papers', () => {
      const naikPapers = db.relatedIds(ids.researcher_naik, 'papers', 'paper');
      expect(naikPapers).toHaveLength(2);
      expect(naikPapers).toContain(ids.paper_rathore_2025);
      expect(naikPapers).toContain(ids.paper_shaikh_2025);
    });

    it('should find multiple researchers at Erasmus Medical Center', () => {
      const erasmusResearchers = db.relatedIds(ids.inst_erasmus, 'researchers', 'researcher');
      expect(erasmusResearchers.length).toBeGreaterThanOrEqual(3);
      expect(erasmusResearchers).toContain(ids.researcher_radjabzadeh);
      expect(erasmusResearchers).toContain(ids.researcher_kraaij);
      expect(erasmusResearchers).toContain(ids.researcher_amin);
    });

    it('should find multiple researchers at Guangxi University', () => {
      const guangxiResearchers = db.relatedIds(ids.inst_guangxi, 'researchers', 'researcher');
      expect(guangxiResearchers.length).toBeGreaterThanOrEqual(3);
    });

    it('should find Shandong has Cao and Meng', () => {
      const shandongResearchers = db.relatedIds(ids.inst_shandong, 'researchers', 'researcher');
      expect(shandongResearchers).toContain(ids.researcher_cao);
      expect(shandongResearchers).toContain(ids.researcher_meng);
    });
  });

  describe('Bacterium → Metabolite production graph', () => {
    it('should know what Lactobacillus produces', () => {
      const products = db.relatedIds(ids.bact_lactobacillus, 'produces', 'product');
      expect(products).toContain(ids.metab_gaba);
      expect(products).toContain(ids.metab_serotonin);
    });

    it('should know what produces GABA', () => {
      const producers = db.relatedIds(ids.metab_gaba, 'produced_by', 'producer');
      expect(producers).toContain(ids.bact_lactobacillus);
      expect(producers).toContain(ids.bact_bifidobacterium);
      expect(producers).toContain(ids.bact_bacteroides);
    });

    it('should know what produces butyrate', () => {
      const producers = db.relatedIds(ids.metab_butyrate, 'produced_by', 'producer');
      expect(producers).toContain(ids.bact_faecalibacterium);
      expect(producers).toContain(ids.bact_coprococcus);
      expect(producers).toContain(ids.bact_ruminococcaceae);
    });

    it('should know Enterococcus produces both serotonin and dopamine', () => {
      const products = db.relatedIds(ids.bact_enterococcus, 'produces', 'product');
      expect(products).toContain(ids.metab_serotonin);
      expect(products).toContain(ids.metab_dopamine);
    });
  });

  describe('Claim provenance and aggregation', () => {
    it('should find claims made by each paper', () => {
      const mehtaClaims = db.relatedIds(ids.paper_mehta_2025, 'claims', 'claim');
      expect(mehtaClaims.length).toBeGreaterThanOrEqual(5);

      const radjabzadehClaims = db.relatedIds(ids.paper_radjabzadeh_2022, 'claims', 'claim');
      expect(radjabzadehClaims.length).toBeGreaterThanOrEqual(4);
    });

    it('should trace a claim back to its source paper', () => {
      const caoClaims = db.relatedIds(ids.paper_cao_2025, 'claims', 'claim');
      expect(caoClaims.length).toBeGreaterThan(0);

      const firstClaim = caoClaims[0];
      const sourcePaper = db.relatedIds(firstClaim, 'source_paper', 'source');
      expect(sourcePaper).toContain(ids.paper_cao_2025);
    });

    it('should find claims about Eggerthella from multiple papers', () => {
      const eggerthellaClaims = db.relatedIds(ids.bact_eggerthella, 'claims_about', 'claim');
      expect(eggerthellaClaims.length).toBeGreaterThanOrEqual(2);

      const sourcePapers = new Set<string>();
      for (const claimEntityId of eggerthellaClaims) {
        const papers = db.relatedIds(claimEntityId, 'source_paper', 'source');
        for (const p of papers) sourcePapers.add(p);
      }

      expect(sourcePapers.has(ids.paper_cao_2025)).toBe(true);
      expect(sourcePapers.has(ids.paper_radjabzadeh_2022)).toBe(true);
    });

    it('should find claims about depression from many papers', () => {
      const depressionClaims = db.relatedIds(ids.cond_depression, 'claims_about', 'claim');
      expect(depressionClaims.length).toBeGreaterThanOrEqual(10);

      const sourcePapers = new Set<string>();
      for (const claimEntityId of depressionClaims) {
        const papers = db.relatedIds(claimEntityId, 'source_paper', 'source');
        for (const p of papers) sourcePapers.add(p);
      }

      expect(sourcePapers.size).toBeGreaterThanOrEqual(5);
    });

    it('should find claims involving the vagus nerve mechanism', () => {
      const vagusClaims = db.relatedIds(ids.mech_vagus, 'claims_about', 'claim');
      expect(vagusClaims.length).toBeGreaterThanOrEqual(3);

      const sourcePapers = new Set<string>();
      for (const claimEntityId of vagusClaims) {
        const papers = db.relatedIds(claimEntityId, 'source_paper', 'source');
        for (const p of papers) sourcePapers.add(p);
      }
      expect(sourcePapers.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Multi-hop knowledge graph traversal', () => {
    it('should traverse: institution → researchers → papers → claims → bacteria', () => {
      const researchers = db.relatedIds(ids.inst_erasmus, 'researchers', 'researcher');
      expect(researchers.length).toBeGreaterThan(0);

      const papers = new Set<string>();
      for (const researcher of researchers) {
        const researcherPapers = db.relatedIds(researcher, 'papers', 'paper');
        for (const p of researcherPapers) papers.add(p);
      }
      expect(papers.size).toBeGreaterThanOrEqual(1);
      expect(papers.has(ids.paper_radjabzadeh_2022)).toBe(true);

      const claims = new Set<string>();
      for (const paper of papers) {
        const paperClaims = db.relatedIds(paper, 'claims', 'claim');
        for (const c of paperClaims) claims.add(c);
      }
      expect(claims.size).toBeGreaterThan(0);

      const bacteria = new Set<string>();
      for (const claim of claims) {
        const claimBacteria = db.relatedIds(claim, 'bacteria', 'subject');
        for (const b of claimBacteria) bacteria.add(b);
      }

      expect(bacteria.has(ids.bact_eggerthella)).toBe(true);
      expect(bacteria.has(ids.bact_coprococcus)).toBe(true);
    });

    it('should traverse: condition → claims → bacteria to find all bacteria linked to depression', () => {
      const depressionClaims = db.relatedIds(ids.cond_depression, 'claims_about', 'claim');

      const bacteriaLinkedToDepression = new Set<string>();
      for (const claim of depressionClaims) {
        const claimBacteria = db.relatedIds(claim, 'bacteria', 'subject');
        for (const b of claimBacteria) bacteriaLinkedToDepression.add(b);
      }

      expect(bacteriaLinkedToDepression.size).toBeGreaterThanOrEqual(5);

      expect(bacteriaLinkedToDepression.has(ids.bact_eggerthella)).toBe(true);
      expect(bacteriaLinkedToDepression.has(ids.bact_alistipes)).toBe(true);
      expect(bacteriaLinkedToDepression.has(ids.bact_proteobacteria)).toBe(true);
    });

    it('should traverse: bacterium → metabolite → claims to connect Faecalibacterium to depression via butyrate', () => {
      const products = db.relatedIds(ids.bact_faecalibacterium, 'produces', 'product');
      expect(products).toContain(ids.metab_butyrate);

      const butyrateClaims = db.relatedIds(ids.metab_butyrate, 'claims_about', 'claim');
      expect(butyrateClaims.length).toBeGreaterThan(0);

      let linksToDepression = false;
      for (const claim of butyrateClaims) {
        const conditions = db.relatedIds(claim, 'conditions', 'subject');
        if (conditions.includes(ids.cond_depression)) {
          linksToDepression = true;
          break;
        }
      }
      expect(linksToDepression).toBe(true);
    });
  });

  describe('Conflict and consensus detection', () => {
    it('should find multiple papers making claims about Proteobacteria in disease', () => {
      const proteobacteriaClaims = db.relatedIds(ids.bact_proteobacteria, 'claims_about', 'claim');
      expect(proteobacteriaClaims.length).toBeGreaterThanOrEqual(2);

      const papers = new Set<string>();
      for (const claim of proteobacteriaClaims) {
        const claimPapers = db.relatedIds(claim, 'source_paper', 'source');
        for (const p of claimPapers) papers.add(p);
      }
      expect(papers.size).toBeGreaterThanOrEqual(2);
    });

    it('should find the HPA axis mechanism cited across multiple papers', () => {
      const hpaClaims = db.relatedIds(ids.mech_hpa, 'claims_about', 'claim');
      expect(hpaClaims.length).toBeGreaterThanOrEqual(2);

      const papers = new Set<string>();
      for (const claim of hpaClaims) {
        const claimPapers = db.relatedIds(claim, 'source_paper', 'source');
        for (const p of claimPapers) papers.add(p);
      }
      expect(papers.size).toBeGreaterThanOrEqual(3);
    });

    it('should resolve claim statements to inspect what papers actually say', () => {
      const lactoClaims = db.relatedIds(ids.bact_lactobacillus, 'claims_about', 'claim');
      expect(lactoClaims.length).toBeGreaterThanOrEqual(2);

      const statements: string[] = [];
      for (const claim of lactoClaims) {
        const resolved = db.resolve(claim);
        if (resolved.statement) {
          statements.push(resolved.statement as string);
        }
      }

      expect(statements.length).toBeGreaterThanOrEqual(2);
      const mentionsGABA = statements.some(s => s.toLowerCase().includes('gaba'));
      const mentionsSerotonin = statements.some(s =>
        s.toLowerCase().includes('serotonin') || s.toLowerCase().includes('tryptophan')
      );
      expect(mentionsGABA || mentionsSerotonin).toBe(true);
    });

    it('should find claims with direction annotations for consensus analysis', () => {
      // Find all claims about depression
      const depressionClaims = db.relatedIds(ids.cond_depression, 'claims_about', 'claim');

      const increased: string[] = [];
      const decreased: string[] = [];
      for (const claimEntityId of depressionClaims) {
        const resolved = db.resolve(claimEntityId);
        if (resolved.direction === 'increased_in_disease') {
          increased.push(claimEntityId);
        } else if (resolved.direction === 'decreased_in_disease') {
          decreased.push(claimEntityId);
        }
      }

      // Multiple claims in each direction
      expect(increased.length).toBeGreaterThanOrEqual(2);
      expect(decreased.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Provenance queries', () => {
    it('should answer: "who funded/authored the claim that Eggerthella is linked to depression?"', () => {
      const eggerthellaClaims = db.relatedIds(ids.bact_eggerthella, 'claims_about', 'claim');

      for (const claim of eggerthellaClaims) {
        const papers = db.relatedIds(claim, 'source_paper', 'source');
        for (const paper of papers) {
          const authors = db.relatedIds(paper, 'authors', 'author');
          expect(authors.length).toBeGreaterThan(0);

          let hasInstitution = false;
          for (const authorId of authors) {
            const affiliations = db.relatedIds(authorId, 'affiliations', 'member');
            if (affiliations.length > 0) hasInstitution = true;
          }
          expect(hasInstitution).toBe(true);
        }
      }
    });

    it('should answer: "what journal published claims about the vagus nerve?"', () => {
      const vagusClaims = db.relatedIds(ids.mech_vagus, 'claims_about', 'claim');

      const journals = new Set<string>();
      for (const claim of vagusClaims) {
        const papers = db.relatedIds(claim, 'source_paper', 'source');
        for (const paper of papers) {
          const resolved = db.resolve(paper);
          if (resolved.journal) journals.add(resolved.journal as string);
        }
      }

      expect(journals.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Graph-wide analysis', () => {
    it('should rank bacteria by number of associated claims', () => {
      const allBacteria = db.entitiesOfType('bacterium');

      const rankings: { id: string; name: string; claimCount: number }[] = [];
      for (const bacteriumId of allBacteria) {
        const claims = db.relatedIds(bacteriumId, 'claims_about', 'claim');
        if (claims.length > 0) {
          const resolved = db.resolve(bacteriumId);
          rankings.push({
            id: bacteriumId,
            name: resolved.name as string,
            claimCount: claims.length
          });
        }
      }

      rankings.sort((a, b) => b.claimCount - a.claimCount);

      // The most-studied bacteria should be at the top
      expect(rankings.length).toBeGreaterThanOrEqual(10);
      // Lactobacillus, Proteobacteria, and Eggerthella are heavily cited
      const top5Names = rankings.slice(0, 5).map(r => r.name);
      expect(
        top5Names.includes('Lactobacillus') ||
        top5Names.includes('Proteobacteria') ||
        top5Names.includes('Eggerthella')
      ).toBe(true);
    });

    it('should rank mechanisms by number of independent paper citations', () => {
      const allMechanisms = db.entitiesOfType('mechanism');

      const rankings: { name: string; paperCount: number }[] = [];
      for (const mechId of allMechanisms) {
        const claims = db.relatedIds(mechId, 'claims_about', 'claim');
        const papers = new Set<string>();
        for (const claim of claims) {
          const claimPapers = db.relatedIds(claim, 'source_paper', 'source');
          for (const p of claimPapers) papers.add(p);
        }
        const resolved = db.resolve(mechId);
        rankings.push({ name: resolved.name as string, paperCount: papers.size });
      }

      rankings.sort((a, b) => b.paperCount - a.paperCount);

      // HPA axis and vagus nerve should be near the top
      expect(rankings[0].paperCount).toBeGreaterThanOrEqual(3);
      const topNames = rankings.slice(0, 3).map(r => r.name);
      expect(topNames).toContain('Hypothalamic-pituitary-adrenal (HPA) axis');
    });

    it('should find metabolites that appear in both production links AND claims', () => {
      const allMetabolites = db.entitiesOfType('metabolite');

      const dualRole: string[] = [];
      for (const metabId of allMetabolites) {
        const producers = db.relatedIds(metabId, 'produced_by', 'producer');
        const claims = db.relatedIds(metabId, 'claims_about', 'claim');
        if (producers.length > 0 && claims.length > 0) {
          dualRole.push(metabId);
        }
      }

      // GABA, serotonin, butyrate, dopamine should all have both
      expect(dualRole.length).toBeGreaterThanOrEqual(3);
      expect(dualRole).toContain(ids.metab_gaba);
      expect(dualRole).toContain(ids.metab_butyrate);
    });

    it('should map the geographic distribution of research', () => {
      const allInstitutions = db.entitiesOfType('institution');

      const countryCounts: Record<string, number> = {};
      for (const instId of allInstitutions) {
        const resolved = db.resolve(instId);
        const country = resolved.country as string;
        if (country) {
          countryCounts[country] = (countryCounts[country] || 0) + 1;
        }
      }

      // India, China, and Netherlands should all be represented
      expect(Object.keys(countryCounts).length).toBeGreaterThanOrEqual(3);
      expect(countryCounts['India']).toBeGreaterThanOrEqual(1);
      expect(countryCounts['China']).toBeGreaterThanOrEqual(1);
      expect(countryCounts['Netherlands']).toBeGreaterThanOrEqual(1);
    });

    it('should span 2004-2025 across all papers', () => {
      const allPapers = db.entitiesOfType('paper');
      const years = allPapers.map(p => db.resolve(p).year as number).sort();
      expect(years[0]).toBe(2004);
      expect(years[years.length - 1]).toBe(2025);
    });

    it('should find IBS comorbidity: papers linking IBS to depression', () => {
      // IBS is a new condition in batch 2
      const ibsClaims = db.relatedIds(ids.cond_ibs, 'claims_about', 'claim');
      expect(ibsClaims.length).toBeGreaterThanOrEqual(3);

      // Find papers that link IBS to depression
      const depressionClaims = db.relatedIds(ids.cond_depression, 'claims_about', 'claim');
      const ibsDepressionOverlap = ibsClaims.filter(c => depressionClaims.includes(c));
      expect(ibsDepressionOverlap.length).toBeGreaterThanOrEqual(2);
    });

    it('should find clinical trials vs reviews vs cohort studies', () => {
      const allPapers = db.entitiesOfType('paper');
      const studyTypes: Record<string, number> = {};
      for (const paperId of allPapers) {
        const resolved = db.resolve(paperId);
        const st = (resolved.study_type as string) || 'unspecified';
        studyTypes[st] = (studyTypes[st] || 0) + 1;
      }
      // Batch 2 added study_type annotations; should have clinical_trial entries
      expect(studyTypes['clinical_trial']).toBeGreaterThanOrEqual(5);
    });

    it('should find Coprococcus linked to depression by two independent research groups', () => {
      // Radjabzadeh 2022 (Erasmus, NL) and Valles-Colomer 2019 (KU Leuven, BE) both found Coprococcus
      const coprococcusClaims = db.relatedIds(ids.bact_coprococcus, 'claims_about', 'claim');
      const papers = new Set<string>();
      for (const claim of coprococcusClaims) {
        const claimPapers = db.relatedIds(claim, 'source_paper', 'source');
        for (const p of claimPapers) papers.add(p);
      }
      expect(papers.has(ids.paper_radjabzadeh_2022)).toBe(true);
      expect(papers.has(ids.paper_valles_colomer_2019)).toBe(true);
    });

    it('should find the Shandong University research network across batch 1 and batch 2', () => {
      // Cao 2025 is at Shandong, Liu 2020 is at Qilu Hospital/Shandong
      // Both are from the Shandong system
      const shandongResearchers = db.relatedIds(ids.inst_shandong, 'researchers', 'researcher');
      const qiluResearchers = db.relatedIds(ids.inst_qilu_shandong, 'researchers', 'researcher');
      expect(shandongResearchers.length).toBeGreaterThanOrEqual(2);
      expect(qiluResearchers.length).toBeGreaterThanOrEqual(1);
    });

    it('should map research by geographic region across all papers', () => {
      const allInstitutions = db.entitiesOfType('institution');
      const countryCounts: Record<string, number> = {};
      for (const instId of allInstitutions) {
        const resolved = db.resolve(instId);
        const country = resolved.country as string;
        if (country) countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
      // Should now have 12+ countries (batch 3 adds Japan, Poland, Australia, South Africa, UK)
      expect(Object.keys(countryCounts).length).toBeGreaterThanOrEqual(12);
      expect(countryCounts['United States']).toBeGreaterThanOrEqual(2);
      expect(countryCounts['Ireland']).toBeGreaterThanOrEqual(1);
      expect(countryCounts['Japan']).toBeGreaterThanOrEqual(1);
      expect(countryCounts['Poland']).toBeGreaterThanOrEqual(1);
      expect(countryCounts['South Africa']).toBeGreaterThanOrEqual(1);
    });

    it('should find vagus nerve cited across many papers now', () => {
      const vagusClaims = db.relatedIds(ids.mech_vagus, 'claims_about', 'claim');
      const papers = new Set<string>();
      for (const claim of vagusClaims) {
        const claimPapers = db.relatedIds(claim, 'source_paper', 'source');
        for (const p of claimPapers) papers.add(p);
      }
      // Mehta, Cao, Zhang (batch 1) + Tillisch, Pinto-Sanchez, Dinan (batch 2) = 6+
      expect(papers.size).toBeGreaterThanOrEqual(5);
    });

    it('should find conditions with the most independent sources', () => {
      const allConditions = db.entitiesOfType('condition');

      const conditionSources: { name: string; paperCount: number }[] = [];
      for (const condId of allConditions) {
        const claims = db.relatedIds(condId, 'claims_about', 'claim');
        const papers = new Set<string>();
        for (const claim of claims) {
          const claimPapers = db.relatedIds(claim, 'source_paper', 'source');
          for (const p of claimPapers) papers.add(p);
        }
        const resolved = db.resolve(condId);
        conditionSources.push({ name: resolved.name as string, paperCount: papers.size });
      }

      conditionSources.sort((a, b) => b.paperCount - a.paperCount);

      // Depression is the most studied condition
      expect(conditionSources[0].name).toBe('Major Depressive Disorder');
      expect(conditionSources[0].paperCount).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Batch 3: Translational gaps and contradictions', () => {
    it('should capture the Bravo-Kelly contradiction: L. rhamnosus works in mice, fails in humans', () => {
      // Bravo 2011 claims L. rhamnosus decreases anxiety (animal study)
      const bravoClaims = db.relatedIds(ids.bact_l_rhamnosus, 'claims_about', 'claim');
      const bravo2011Claims = bravoClaims.filter(c => {
        const papers = db.relatedIds(c, 'source_paper', 'source');
        return papers.includes(ids.paper_bravo_2011);
      });
      expect(bravo2011Claims.length).toBeGreaterThanOrEqual(1);

      // Kelly 2017 claims L. rhamnosus has no effect (human trial)
      const kelly2017Claims = bravoClaims.filter(c => {
        const papers = db.relatedIds(c, 'source_paper', 'source');
        return papers.includes(ids.paper_kelly_2017);
      });
      expect(kelly2017Claims.length).toBeGreaterThanOrEqual(1);

      // Check that Kelly 2017 claims have no_effect direction
      const kellyDirections = kelly2017Claims.map(c => db.resolve(c).direction);
      expect(kellyDirections).toContain('no_effect');
    });

    it('should find the kynurenine pathway as a convergence point across multiple papers', () => {
      const kynClaims = db.relatedIds(ids.mech_kynurenine_pathway, 'claims_about', 'claim');
      const papers = new Set<string>();
      for (const claim of kynClaims) {
        const claimPapers = db.relatedIds(claim, 'source_paper', 'source');
        for (const p of claimPapers) papers.add(p);
      }
      // Zheng 2016, Kelly 2016, Tian 2022, Rudzki 2019, Zhu 2020
      expect(papers.size).toBeGreaterThanOrEqual(4);
    });

    it('should find FMT evidence for behavior transfer across depression and schizophrenia', () => {
      const fmtClaims = db.relatedIds(ids.mech_fmt_transfer, 'claims_about', 'claim');
      expect(fmtClaims.length).toBeGreaterThanOrEqual(3);

      // Should link to both depression and schizophrenia
      const conditions = new Set<string>();
      for (const claim of fmtClaims) {
        const condList = db.relatedIds(claim, 'conditions', 'subject');
        for (const c of condList) conditions.add(c);
      }
      expect(conditions.has(ids.cond_depression)).toBe(true);
      expect(conditions.has(ids.cond_schizophrenia)).toBe(true);
    });

    it('should find UCC Cork as the most prolific research hub', () => {
      const uccResearchers = db.relatedIds(ids.inst_ucc_cork, 'researchers', 'researcher');
      // Dinan, Cryan, Kelly, Clarke, Bravo
      expect(uccResearchers.length).toBeGreaterThanOrEqual(4);

      // They should be on many papers
      const allPapers = new Set<string>();
      for (const researcher of uccResearchers) {
        const papers = db.relatedIds(researcher, 'papers', 'paper');
        for (const p of papers) allPapers.add(p);
      }
      // Dinan&Cryan review, Bravo 2011, Kelly 2017, Kelly 2016 = 4+
      expect(allPapers.size).toBeGreaterThanOrEqual(4);
    });

    it('should find PTSD as a newly represented condition from South Africa', () => {
      const ptsdClaims = db.relatedIds(ids.cond_ptsd, 'claims_about', 'claim');
      expect(ptsdClaims.length).toBeGreaterThanOrEqual(3);

      // All PTSD claims should be from O'Hare 2025
      const papers = new Set<string>();
      for (const claim of ptsdClaims) {
        const claimPapers = db.relatedIds(claim, 'source_paper', 'source');
        for (const p of claimPapers) papers.add(p);
      }
      expect(papers.has(ids.paper_ohare_2025)).toBe(true);
    });

    it('should find Nikolova 2021 transdiagnostic claims linking bacteria to ALL major conditions', () => {
      // Nikolova's claims about Faecalibacterium link to 4 conditions
      const faecalClaims = db.relatedIds(ids.bact_faecalibacterium, 'claims_about', 'claim');
      const nikolovaClaims = faecalClaims.filter(c => {
        const papers = db.relatedIds(c, 'source_paper', 'source');
        return papers.includes(ids.paper_nikolova_2021);
      });

      // Should have at least one Nikolova claim
      expect(nikolovaClaims.length).toBeGreaterThanOrEqual(1);

      // That claim should mention multiple conditions
      const conditions = new Set<string>();
      for (const claim of nikolovaClaims) {
        const condList = db.relatedIds(claim, 'conditions', 'subject');
        for (const c of condList) conditions.add(c);
      }
      expect(conditions.size).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Taxonomic hierarchy traversal', () => {
    it('should link Lactobacillus species to the genus', () => {
      const species = db.relatedIds(ids.bact_lactobacillus, 'species', 'species');
      expect(species).toContain(ids.bact_l_rhamnosus);
      expect(species).toContain(ids.bact_l_helveticus);
      expect(species).toContain(ids.bact_l_acidophilus);
      expect(species).toContain(ids.bact_l_casei);
      expect(species).toContain(ids.bact_l_plantarum); // batch 3
      expect(species).toContain(ids.bact_l_reuteri); // batch 4
    });

    it('should link Bifidobacterium species to the genus', () => {
      const species = db.relatedIds(ids.bact_bifidobacterium, 'species', 'species');
      expect(species).toContain(ids.bact_b_longum);
      expect(species).toContain(ids.bact_b_infantis);
      expect(species).toContain(ids.bact_b_breve); // batch 3
    });

    it('should find ALL claims about Lactobacillus (genus + all species)', () => {
      // Direct genus-level claims
      const genusClaims = db.relatedIds(ids.bact_lactobacillus, 'claims_about', 'claim');

      // Species-level claims (traverse genus → species → claims)
      const species = db.relatedIds(ids.bact_lactobacillus, 'species', 'species');
      const allSpeciesClaims = new Set<string>();
      for (const sp of species) {
        const spClaims = db.relatedIds(sp, 'claims_about', 'claim');
        for (const c of spClaims) allSpeciesClaims.add(c);
      }

      // Combined: genus-level + all species-level claims
      const totalClaims = new Set([...genusClaims, ...allSpeciesClaims]);

      // Should be more than just genus-level (species add claims from Slykerman, Messaoudi, Akkasheh, etc.)
      expect(totalClaims.size).toBeGreaterThan(genusClaims.length);
      expect(totalClaims.size).toBeGreaterThanOrEqual(6);
    });

    it('should find Bifidobacterium longum cited by multiple papers through species traversal', () => {
      const blongumClaims = db.relatedIds(ids.bact_b_longum, 'claims_about', 'claim');
      const papers = new Set<string>();
      for (const claim of blongumClaims) {
        const claimPapers = db.relatedIds(claim, 'source_paper', 'source');
        for (const p of claimPapers) papers.add(p);
      }
      // Pinto-Sanchez 2017 and Messaoudi 2011 both use B. longum
      expect(papers.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Evidence quality analysis', () => {
    it('should score claims by study type of source paper', () => {
      const evidenceWeights: Record<string, number> = {
        'clinical_trial': 3,
        'cohort': 2,
        'review': 1,
        'unspecified': 1,
      };

      // Find all depression claims and score by evidence quality
      const depressionClaims = db.relatedIds(ids.cond_depression, 'claims_about', 'claim');

      let totalScore = 0;
      let clinicalTrialClaims = 0;

      for (const claimEntityId of depressionClaims) {
        const papers = db.relatedIds(claimEntityId, 'source_paper', 'source');
        for (const paperId of papers) {
          const paper = db.resolve(paperId);
          const studyType = (paper.study_type as string) || 'unspecified';
          const weight = evidenceWeights[studyType] || 1;
          totalScore += weight;
          if (studyType === 'clinical_trial') clinicalTrialClaims++;
        }
      }

      // Should have multiple clinical trial-backed claims about depression
      expect(clinicalTrialClaims).toBeGreaterThanOrEqual(3);
      expect(totalScore).toBeGreaterThan(depressionClaims.length); // weighted > count
    });

    it('should find bacteria with clinical trial evidence vs review-only evidence', () => {
      const allBacteria = db.entitiesOfType('bacterium');

      const clinicalTrialBacteria: string[] = [];
      const reviewOnlyBacteria: string[] = [];

      for (const bacteriumId of allBacteria) {
        const claims = db.relatedIds(bacteriumId, 'claims_about', 'claim');
        if (claims.length === 0) continue;

        let hasClinicalTrial = false;
        let hasAnyEvidence = false;

        for (const claim of claims) {
          const papers = db.relatedIds(claim, 'source_paper', 'source');
          for (const paperId of papers) {
            const paper = db.resolve(paperId);
            hasAnyEvidence = true;
            if (paper.study_type === 'clinical_trial') hasClinicalTrial = true;
          }
        }

        if (!hasAnyEvidence) continue;
        if (hasClinicalTrial) {
          clinicalTrialBacteria.push(bacteriumId);
        } else {
          reviewOnlyBacteria.push(bacteriumId);
        }
      }

      // Some bacteria (B. longum, L. rhamnosus) have clinical trial backing
      expect(clinicalTrialBacteria.length).toBeGreaterThanOrEqual(3);
      // Some bacteria only appear in reviews
      expect(reviewOnlyBacteria.length).toBeGreaterThanOrEqual(3);
    });

    it('should answer: "what is the strongest evidence for the butyrate-depression connection?"', () => {
      const butyrateClaims = db.relatedIds(ids.metab_butyrate, 'claims_about', 'claim');

      const evidenceChain: {
        statement: string;
        paper: string;
        journal: string;
        studyType: string;
        year: number;
      }[] = [];

      for (const claim of butyrateClaims) {
        const claimResolved = db.resolve(claim);
        const papers = db.relatedIds(claim, 'source_paper', 'source');
        for (const paperId of papers) {
          const paper = db.resolve(paperId);
          evidenceChain.push({
            statement: (claimResolved.statement as string) || '',
            paper: paper.title as string,
            journal: paper.journal as string,
            studyType: (paper.study_type as string) || 'unspecified',
            year: paper.year as number,
          });
        }
      }

      // Should have evidence from multiple study types
      const types = new Set(evidenceChain.map(e => e.studyType));
      expect(types.size).toBeGreaterThanOrEqual(2);

      // Should span multiple years
      const years = evidenceChain.map(e => e.year);
      expect(Math.max(...years) - Math.min(...years)).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Batch 4: New domains and causal evidence', () => {
    it('should find Parkinson\'s disease as a new neurological condition', () => {
      const pdClaims = db.relatedIds(ids.cond_parkinsons, 'claims_about', 'claim');
      expect(pdClaims.length).toBeGreaterThanOrEqual(2);

      // Prevotellaceae decreased, Enterobacteriaceae increased
      const bacteria = new Set<string>();
      for (const claim of pdClaims) {
        for (const b of db.relatedIds(claim, 'bacteria', 'subject')) bacteria.add(b);
      }
      expect(bacteria.has(ids.bact_prevotellaceae)).toBe(true);
      expect(bacteria.has(ids.bact_enterobacteriaceae)).toBe(true);
    });

    it('should find ASD causal evidence from Sharon 2019 (FMT → behavior)', () => {
      const fmtClaims = db.relatedIds(ids.mech_fmt_transfer, 'claims_about', 'claim');
      const asdFmtClaims = fmtClaims.filter(c => {
        const papers = db.relatedIds(c, 'source_paper', 'source');
        return papers.includes(ids.paper_sharon_2019);
      });
      expect(asdFmtClaims.length).toBeGreaterThanOrEqual(1);
    });

    it('should find Ecuador as the first Latin American geography', () => {
      const allInstitutions = db.entitiesOfType('institution');
      const countries = new Set<string>();
      for (const instId of allInstitutions) {
        const resolved = db.resolve(instId);
        if (resolved.country) countries.add(resolved.country as string);
      }
      expect(countries.has('Ecuador')).toBe(true);
    });

    it('should find the alpha diversity paradox: infant vs elderly', () => {
      // Carlson 2018: higher diversity → lower cognitive scores in infants
      const carlsonClaims = db.relatedIds(ids.cond_cognitive_decline, 'claims_about', 'claim');
      const infantClaims = carlsonClaims.filter(c => {
        const papers = db.relatedIds(c, 'source_paper', 'source');
        return papers.includes(ids.paper_carlson_2018);
      });
      expect(infantClaims.length).toBeGreaterThanOrEqual(1);

      // Claesson 2012: diversity loss → frailty in elderly
      const frailtyClaims = db.relatedIds(ids.cond_frailty, 'claims_about', 'claim');
      const claessonClaims = frailtyClaims.filter(c => {
        const papers = db.relatedIds(c, 'source_paper', 'source');
        return papers.includes(ids.paper_claesson_2012);
      });
      expect(claessonClaims.length).toBeGreaterThanOrEqual(3);
    });

    it('should find diet-microbiome modulation as a mechanism across elderly studies', () => {
      const dietClaims = db.relatedIds(ids.mech_diet_microbiome, 'claims_about', 'claim');
      const papers = new Set<string>();
      for (const claim of dietClaims) {
        const claimPapers = db.relatedIds(claim, 'source_paper', 'source');
        for (const p of claimPapers) papers.add(p);
      }
      // Ghosh 2020 + Claesson 2012
      expect(papers.has(ids.paper_ghosh_2020)).toBe(true);
      expect(papers.has(ids.paper_claesson_2012)).toBe(true);
    });

    it('should find prebiotic specificity: B-GOS works, FOS doesn\'t', () => {
      // Schmidt 2015 has both a positive result and a no_effect result
      const schmidtClaims = db.entitiesOfType('claim').filter(c => {
        const papers = db.relatedIds(c, 'source_paper', 'source');
        return papers.includes(ids.paper_schmidt_2015);
      });
      expect(schmidtClaims.length).toBeGreaterThanOrEqual(2);

      const directions = schmidtClaims.map(c => db.resolve(c).direction).filter(Boolean);
      expect(directions).toContain('decreased_in_disease');
      expect(directions).toContain('no_effect');
    });

    it('should find Liu 2019 meta-analysis covering both depression and anxiety', () => {
      const liuClaims = db.entitiesOfType('claim').filter(c => {
        const papers = db.relatedIds(c, 'source_paper', 'source');
        return papers.includes(ids.paper_liu_2019);
      });
      expect(liuClaims.length).toBeGreaterThanOrEqual(3);

      // Should cover both depression and anxiety
      const conditions = new Set<string>();
      for (const claim of liuClaims) {
        for (const c of db.relatedIds(claim, 'conditions', 'subject')) conditions.add(c);
      }
      expect(conditions.has(ids.cond_depression)).toBe(true);
      expect(conditions.has(ids.cond_anxiety)).toBe(true);
    });

    it('should find UCC Cork growing as a research hub with Ghosh and Claesson', () => {
      const uccResearchers = db.relatedIds(ids.inst_ucc_cork, 'researchers', 'researcher');
      // Dinan, Cryan, Kelly, Clarke, Bravo + Ghosh, O'Toole, Claesson
      expect(uccResearchers.length).toBeGreaterThanOrEqual(7);
    });

    it('should now span 2004-2025 across 35 papers with 15+ countries', () => {
      const allPapers = db.entitiesOfType('paper');
      expect(allPapers.length).toBe(35);

      const years = allPapers.map(p => db.resolve(p).year as number).sort();
      expect(years[0]).toBe(2004);
      expect(years[years.length - 1]).toBe(2025);

      const allInstitutions = db.entitiesOfType('institution');
      const countries = new Set<string>();
      for (const instId of allInstitutions) {
        const resolved = db.resolve(instId);
        if (resolved.country) countries.add(resolved.country as string);
      }
      expect(countries.size).toBeGreaterThanOrEqual(15);
    });
  });
});
