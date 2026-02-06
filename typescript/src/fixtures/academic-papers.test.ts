/**
 * Academic Paper Knowledge Graph Tests
 *
 * Verifies that 6 real gut-microbiome-mental-health papers (2022-2025)
 * can be digested into a queryable knowledge graph using RhizomeDB's
 * delta/HyperView model. Tests cross-paper queries, shared entities,
 * provenance tracking, and claim aggregation.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { RhizomeDB } from '../storage/instance';
import { seedAcademicPapers, entityIds as ids } from './academic-papers.fixture';
import { Delta } from '../core/types';

describe('Academic Paper Knowledge Graph', () => {
  let db: RhizomeDB;

  beforeAll(async () => {
    db = new RhizomeDB({ storage: 'memory', systemId: 'academic-digestion' });
    const result = await seedAcademicPapers(db);
    // eslint-disable-next-line no-console
    console.error(`Seeded ${result.totalDeltas} deltas from 6 papers`);
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

  describe('Cross-paper entity reuse', () => {
    it('should find Sunil Naik as author of two different papers', () => {
      // Naik is shared across papers 3 (Rathore) and 5 (Shaikh)
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
      // Get claims from Cao paper
      const caoClaims = db.relatedIds(ids.paper_cao_2025, 'claims', 'claim');
      expect(caoClaims.length).toBeGreaterThan(0);

      // Pick first claim, trace it back
      const firstClaim = caoClaims[0];
      const sourcePaper = db.relatedIds(firstClaim, 'source_paper', 'source');
      expect(sourcePaper).toContain(ids.paper_cao_2025);
    });

    it('should find claims about Eggerthella from multiple papers', () => {
      // Eggerthella is mentioned in both Cao 2025 and Radjabzadeh 2022
      const eggerthellaClaims = db.relatedIds(ids.bact_eggerthella, 'claims_about', 'claim');
      expect(eggerthellaClaims.length).toBeGreaterThanOrEqual(2);

      // Trace claims back to source papers
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
      // Depression is mentioned across most papers
      expect(depressionClaims.length).toBeGreaterThanOrEqual(10);

      // Trace back to unique source papers
      const sourcePapers = new Set<string>();
      for (const claimEntityId of depressionClaims) {
        const papers = db.relatedIds(claimEntityId, 'source_paper', 'source');
        for (const p of papers) sourcePapers.add(p);
      }

      // Depression should be claimed about by at least 5 of 6 papers
      expect(sourcePapers.size).toBeGreaterThanOrEqual(5);
    });

    it('should find claims involving the vagus nerve mechanism', () => {
      const vagusClaims = db.relatedIds(ids.mech_vagus, 'claims_about', 'claim');
      expect(vagusClaims.length).toBeGreaterThanOrEqual(3);

      // At least Mehta, Cao, and Zhang mention vagus nerve
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
      // Start at Erasmus Medical Center
      const researchers = db.relatedIds(ids.inst_erasmus, 'researchers', 'researcher');
      expect(researchers.length).toBeGreaterThan(0);

      // Find all papers by Erasmus researchers
      const papers = new Set<string>();
      for (const researcher of researchers) {
        const researcherPapers = db.relatedIds(researcher, 'papers', 'paper');
        for (const p of researcherPapers) papers.add(p);
      }
      expect(papers.size).toBeGreaterThanOrEqual(1);
      expect(papers.has(ids.paper_radjabzadeh_2022)).toBe(true);

      // Find all claims from those papers
      const claims = new Set<string>();
      for (const paper of papers) {
        const paperClaims = db.relatedIds(paper, 'claims', 'claim');
        for (const c of paperClaims) claims.add(c);
      }
      expect(claims.size).toBeGreaterThan(0);

      // Find all bacteria mentioned in those claims
      const bacteria = new Set<string>();
      for (const claim of claims) {
        const claimBacteria = db.relatedIds(claim, 'bacteria', 'subject');
        for (const b of claimBacteria) bacteria.add(b);
      }

      // Erasmus (Radjabzadeh) paper mentions Eggerthella, Coprococcus, etc.
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

      // Multiple bacteria should be linked to depression across papers
      expect(bacteriaLinkedToDepression.size).toBeGreaterThanOrEqual(5);

      // Some specific ones we know from the papers
      expect(bacteriaLinkedToDepression.has(ids.bact_eggerthella)).toBe(true);
      expect(bacteriaLinkedToDepression.has(ids.bact_alistipes)).toBe(true);
      expect(bacteriaLinkedToDepression.has(ids.bact_proteobacteria)).toBe(true);
    });

    it('should traverse: bacterium → metabolite → claims to connect Faecalibacterium to depression via butyrate', () => {
      // Faecalibacterium produces butyrate
      const products = db.relatedIds(ids.bact_faecalibacterium, 'produces', 'product');
      expect(products).toContain(ids.metab_butyrate);

      // Butyrate is mentioned in claims
      const butyrateClaims = db.relatedIds(ids.metab_butyrate, 'claims_about', 'claim');
      expect(butyrateClaims.length).toBeGreaterThan(0);

      // Some of those claims are about depression
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

      // Check these come from different papers
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
      // HPA axis mentioned by Mehta, Cao, and Zhang
      expect(papers.size).toBeGreaterThanOrEqual(3);
    });

    it('should resolve claim statements to inspect what papers actually say', () => {
      // Find claims about Lactobacillus
      const lactoClaims = db.relatedIds(ids.bact_lactobacillus, 'claims_about', 'claim');
      expect(lactoClaims.length).toBeGreaterThanOrEqual(2);

      // Read each claim's statement
      const statements: string[] = [];
      for (const claim of lactoClaims) {
        const resolved = db.resolve(claim);
        if (resolved.statement) {
          statements.push(resolved.statement as string);
        }
      }

      expect(statements.length).toBeGreaterThanOrEqual(2);
      // Different papers say different (but compatible) things about Lactobacillus
      const mentionsGABA = statements.some(s => s.toLowerCase().includes('gaba'));
      const mentionsSerotonin = statements.some(s =>
        s.toLowerCase().includes('serotonin') || s.toLowerCase().includes('tryptophan')
      );
      expect(mentionsGABA || mentionsSerotonin).toBe(true);
    });
  });

  describe('Provenance queries', () => {
    it('should answer: "who funded/authored the claim that Eggerthella is linked to depression?"', () => {
      const eggerthellaClaims = db.relatedIds(ids.bact_eggerthella, 'claims_about', 'claim');

      for (const claim of eggerthellaClaims) {
        // Trace claim → paper → authors → institutions
        const papers = db.relatedIds(claim, 'source_paper', 'source');
        for (const paper of papers) {
          const authors = db.relatedIds(paper, 'authors', 'author');
          expect(authors.length).toBeGreaterThan(0);

          // At least one author should have an institution
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
      // Multiple journals publish on this topic
    });
  });
});
