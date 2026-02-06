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
    console.error(`Seeded ${result.totalDeltas} deltas from 16 papers`);
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
    it('should find all 16 papers', () => {
      const papers = db.entitiesOfType('paper');
      expect(papers).toHaveLength(16);
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

    it('should span 2011-2025 across 16 papers', () => {
      const allPapers = db.entitiesOfType('paper');
      const years = allPapers.map(p => db.resolve(p).year as number).sort();
      expect(years[0]).toBe(2011);
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

    it('should map research by geographic region across all 16 papers', () => {
      const allInstitutions = db.entitiesOfType('institution');
      const countryCounts: Record<string, number> = {};
      for (const instId of allInstitutions) {
        const resolved = db.resolve(instId);
        const country = resolved.country as string;
        if (country) countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
      // Should now have 7+ countries
      expect(Object.keys(countryCounts).length).toBeGreaterThanOrEqual(7);
      expect(countryCounts['United States']).toBeGreaterThanOrEqual(2);
      expect(countryCounts['Ireland']).toBeGreaterThanOrEqual(1);
      expect(countryCounts['Belgium']).toBeGreaterThanOrEqual(1);
      expect(countryCounts['New Zealand']).toBeGreaterThanOrEqual(1);
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
      expect(conditionSources[0].paperCount).toBeGreaterThanOrEqual(5);
    });
  });
});
