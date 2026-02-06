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

    it('should return empty for unrelated entities', () => {
      // Schizophrenia and butyrate have no shared claims
      const chain = evidenceChain(db, ids.metab_butyrate, ids.cond_schizophrenia);
      expect(chain.length).toBe(0);
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
});
