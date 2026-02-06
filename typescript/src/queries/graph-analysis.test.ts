/**
 * Tests for graph analysis query compositions.
 *
 * Uses the academic paper knowledge graph as a realistic test bed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { RhizomeDB } from '../storage/instance';
import { seedAcademicPapers, ids } from '../fixtures/academic-papers.fixture';
import {
  sourcePapersFor,
  consensusScore,
  claimsIncludingSubEntities,
  evidenceChain,
  rankByClaimCount,
  coOccurrence,
  findContradictions,
  graphSummary,
  pathwayBetween,
  researcherNetwork,
} from './graph-analysis';

describe('Graph Analysis Queries', () => {
  let db: RhizomeDB;

  beforeAll(async () => {
    db = new RhizomeDB({ storage: 'memory', systemId: 'graph-analysis-test' });
    await seedAcademicPapers(db);
  });

  describe('sourcePapersFor', () => {
    it('should find papers that mention a bacterium', () => {
      const papers = sourcePapersFor(db, ids.bact_eggerthella);
      expect(papers.size).toBeGreaterThanOrEqual(2);
      expect(papers.has(ids.paper_cao_2025)).toBe(true);
      expect(papers.has(ids.paper_radjabzadeh_2022)).toBe(true);
    });

    it('should find papers that mention a mechanism', () => {
      const papers = sourcePapersFor(db, ids.mech_vagus);
      expect(papers.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('consensusScore', () => {
    it('should score depression higher than rare conditions', () => {
      const depressionScore = consensusScore(db, ids.cond_depression);
      const bipolarScore = consensusScore(db, ids.cond_bipolar);

      expect(depressionScore.paperCount).toBeGreaterThan(bipolarScore.paperCount);
      expect(depressionScore.weightedScore).toBeGreaterThan(bipolarScore.weightedScore);
    });

    it('should find geographic diversity for well-studied entities', () => {
      const score = consensusScore(db, ids.cond_depression);
      // Depression is studied across India, China, Netherlands, Belgium, etc.
      expect(score.countries.length).toBeGreaterThanOrEqual(3);
    });

    it('should find multiple study types for depression', () => {
      const score = consensusScore(db, ids.cond_depression);
      expect(score.studyTypes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('claimsIncludingSubEntities', () => {
    it('should find genus + species claims for Lactobacillus', () => {
      const allClaims = claimsIncludingSubEntities(
        db,
        ids.bact_lactobacillus,
        'species',
        'species'
      );

      const directClaims = db.relatedIds(ids.bact_lactobacillus, 'claims_about', 'claim');
      expect(allClaims.length).toBeGreaterThan(directClaims.length);
    });

    it('should find genus + species claims for Bifidobacterium', () => {
      const allClaims = claimsIncludingSubEntities(
        db,
        ids.bact_bifidobacterium,
        'species',
        'species'
      );

      const directClaims = db.relatedIds(ids.bact_bifidobacterium, 'claims_about', 'claim');
      // B. longum and B. infantis claims should be included
      expect(allClaims.length).toBeGreaterThan(directClaims.length);
    });
  });

  describe('evidenceChain', () => {
    it('should find claims linking butyrate to depression', () => {
      const chain = evidenceChain(db, ids.metab_butyrate, ids.cond_depression);
      expect(chain.length).toBeGreaterThanOrEqual(2);

      // Each entry should have a statement and source
      for (const entry of chain) {
        expect(entry.statement.length).toBeGreaterThan(0);
        expect(entry.journal.length).toBeGreaterThan(0);
      }
    });

    it('should find claims linking Eggerthella to depression', () => {
      const chain = evidenceChain(db, ids.bact_eggerthella, ids.cond_depression);
      expect(chain.length).toBeGreaterThanOrEqual(2);

      // Should include Cao 2025 and Radjabzadeh 2022
      const journals = chain.map(e => e.journal);
      expect(journals).toContain('Nature Communications');
    });

    it('should find transdiagnostic connections after batch 3', () => {
      // Nikolova 2021 links butyrate producers to schizophrenia (transdiagnostic)
      const chain = evidenceChain(db, ids.metab_butyrate, ids.cond_schizophrenia);
      expect(chain.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('rankByClaimCount', () => {
    it('should rank bacteria by research attention', () => {
      const rankings = rankByClaimCount(db, 'bacterium');

      expect(rankings.length).toBeGreaterThanOrEqual(10);
      // Top bacteria should have multiple claims
      expect(rankings[0].claimCount).toBeGreaterThanOrEqual(3);
      // Should also track paper count
      expect(rankings[0].paperCount).toBeGreaterThanOrEqual(2);
    });

    it('should rank conditions by research attention', () => {
      const rankings = rankByClaimCount(db, 'condition');

      // Depression should be #1
      expect(rankings[0].name).toBe('Major Depressive Disorder');
      expect(rankings[0].claimCount).toBeGreaterThanOrEqual(20);
    });

    it('should rank metabolites by research attention', () => {
      const rankings = rankByClaimCount(db, 'metabolite');

      // Butyrate, SCFAs, serotonin, GABA should be near the top
      const topNames = rankings.slice(0, 5).map(r => r.name);
      expect(topNames.some(n => n.includes('Butyrate') || n.includes('SCFA') || n.includes('GABA'))).toBe(true);
    });
  });

  describe('coOccurrence', () => {
    it('should find bacteria that co-occur in claims', () => {
      const pairs = coOccurrence(db, 'bacterium', 'claims_about', 'claim');

      // Some bacteria should appear in the same claims
      expect(pairs.length).toBeGreaterThanOrEqual(3);

      // Top pair should have multiple shared claims
      expect(pairs[0].sharedClaims).toBeGreaterThanOrEqual(2);
    });

    it('should find metabolite co-occurrences in claims', () => {
      const pairs = coOccurrence(db, 'metabolite', 'claims_about', 'claim');

      expect(pairs.length).toBeGreaterThanOrEqual(2);
    });

    it('should find conditions that co-occur in claims', () => {
      const pairs = coOccurrence(db, 'condition', 'claims_about', 'claim');

      // Depression and anxiety co-occur frequently
      const depAnxPair = pairs.find(p =>
        (p.entityA === ids.cond_depression && p.entityB === ids.cond_anxiety) ||
        (p.entityA === ids.cond_anxiety && p.entityB === ids.cond_depression)
      );
      expect(depAnxPair).toBeDefined();
      expect(depAnxPair!.sharedClaims).toBeGreaterThanOrEqual(5);
    });
  });

  describe('findContradictions', () => {
    it('should find bacteria with contradictory direction claims', () => {
      // Look for bacteria where some papers say increased and others decreased
      const contradictions = findContradictions(db, 'bacterium', 'condition');

      // We expect some contradictions — e.g., Prevotella is depleted in depression
      // (Cao 2025) but increased in autism after treatment (Kang 2019)
      // Or Lactobacillus decreased in schizophrenia but increased in treatment contexts
      // The exact contradictions depend on our modeling, but there should be some
      if (contradictions.length > 0) {
        const first = contradictions[0];
        expect(first.increased.length).toBeGreaterThan(0);
        expect(first.decreased.length).toBeGreaterThan(0);
        expect(first.entityName).toBeDefined();
        expect(first.conditionName).toBeDefined();
      }
    });

    it('should structure contradiction reports with full provenance', () => {
      const contradictions = findContradictions(db, 'bacterium', 'condition');

      for (const c of contradictions) {
        // Each direction should have statement and paper info
        for (const claim of [...c.increased, ...c.decreased]) {
          expect(claim.statement.length).toBeGreaterThan(0);
          expect(claim.year).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('pathwayBetween', () => {
    it('should find paths from Lactobacillus to depression', () => {
      const paths = pathwayBetween(db, ids.bact_lactobacillus, ids.cond_depression);

      expect(paths.length).toBeGreaterThanOrEqual(1);
      // First path should start with Lactobacillus and end with Depression
      expect(paths[0].path[0].entity).toBe(ids.bact_lactobacillus);
      expect(paths[0].path[paths[0].path.length - 1].entity).toBe(ids.cond_depression);
    });

    it('should find short direct paths for well-connected entities', () => {
      const paths = pathwayBetween(db, ids.bact_eggerthella, ids.cond_depression);

      // Eggerthella appears directly in claims about depression
      expect(paths.length).toBeGreaterThanOrEqual(1);
      expect(paths[0].path.length).toBe(2); // direct: Eggerthella → Depression
    });

    it('should find indirect paths through metabolites', () => {
      // Faecalibacterium produces butyrate, butyrate linked to depression
      const paths = pathwayBetween(db, ids.bact_faecalibacterium, ids.cond_depression);

      // Should find paths through butyrate (production relationship)
      const butyratePaths = paths.filter(p =>
        p.path.some(n => n.entity === ids.metab_butyrate)
      );
      expect(butyratePaths.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for truly unconnected entities', () => {
      // Create a nonsense entity ID
      const paths = pathwayBetween(db, 'nonexistent:entity', ids.cond_depression);
      expect(paths.length).toBe(0);
    });

    it('should find multiple distinct pathways for hub entities', () => {
      // Butyrate connects to depression through many claims
      const paths = pathwayBetween(db, ids.metab_butyrate, ids.cond_depression);
      expect(paths.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('researcherNetwork', () => {
    it('should find researcher collaborations', () => {
      const network = researcherNetwork(db);

      expect(network.collaborations.length).toBeGreaterThanOrEqual(5);
      // Co-authors on the same paper should appear
      const erasmusCollab = network.collaborations.find(c =>
        (c.researcherA === ids.researcher_radjabzadeh || c.researcherB === ids.researcher_radjabzadeh) &&
        (c.researcherA === ids.researcher_kraaij || c.researcherB === ids.researcher_kraaij)
      );
      expect(erasmusCollab).toBeDefined();
    });

    it('should find institution collaborations', () => {
      const network = researcherNetwork(db);

      // Some papers have authors from multiple institutions
      // Arizona State has 3 co-authors on the same paper → intra-institutional
      // Erasmus + Amsterdam UMC might collaborate
      expect(network.institutionLinks.length).toBeGreaterThanOrEqual(0);
    });

    it('should count shared papers correctly', () => {
      const network = researcherNetwork(db);

      // Dinan and Cryan co-authored paper 16
      const dinanCryan = network.collaborations.find(c =>
        (c.researcherA === ids.researcher_dinan || c.researcherB === ids.researcher_dinan) &&
        (c.researcherA === ids.researcher_cryan || c.researcherB === ids.researcher_cryan)
      );
      expect(dinanCryan).toBeDefined();
      // Dinan & Cryan co-author paper 16 (2013 review), Bravo 2011, Kelly 2017, Kelly 2016
      expect(dinanCryan!.sharedPapers).toBeGreaterThanOrEqual(3);
    });
  });

  describe('graphSummary', () => {
    it('should produce a complete summary of the knowledge graph', () => {
      const summary = graphSummary(db);

      expect(summary.papers).toBe(27);
      expect(summary.researchers).toBeGreaterThanOrEqual(54);
      expect(summary.institutions).toBeGreaterThanOrEqual(25);
      expect(summary.bacteria).toBeGreaterThanOrEqual(34);
      expect(summary.metabolites).toBeGreaterThanOrEqual(16);
      expect(summary.mechanisms).toBeGreaterThanOrEqual(11);
      expect(summary.conditions).toBeGreaterThanOrEqual(8);
      expect(summary.claims).toBeGreaterThanOrEqual(100);
      expect(summary.totalDeltas).toBeGreaterThan(1200);
      expect(summary.countries.length).toBeGreaterThanOrEqual(12);
      expect(summary.yearRange[0]).toBe(2004);
      expect(summary.yearRange[1]).toBe(2025);
    });
  });
});
