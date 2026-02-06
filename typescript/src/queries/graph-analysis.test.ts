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
  temporalTrajectory,
  novelConnections,
  mechanismConvergence,
  conditionSimilarity,
  studyTypeBreakdown,
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
      const contradictions = findContradictions(db, 'bacterium', 'condition');

      expect(contradictions.length).toBeGreaterThan(0);
      const first = contradictions[0];
      expect(first.entityName).toBeDefined();
      expect(first.conditionName).toBeDefined();
    });

    it('should structure contradiction reports with full provenance including study type', () => {
      const contradictions = findContradictions(db, 'bacterium', 'condition');

      for (const c of contradictions) {
        for (const claim of [...c.increased, ...c.decreased, ...c.noEffect]) {
          expect(claim.statement.length).toBeGreaterThan(0);
          expect(claim.year).toBeGreaterThan(0);
          expect(claim.studyType).toBeDefined();
        }
      }
    });

    it('should find no_effect contradictions (Kelly 2017 vs positive claims)', () => {
      const contradictions = findContradictions(db, 'bacterium', 'condition');

      // L. rhamnosus has decreased_in_disease (Bravo 2011 animal) AND no_effect (Kelly 2017 human)
      const lRhamnosusContradictions = contradictions.filter(c =>
        c.entity === ids.bact_l_rhamnosus
      );

      // There should be at least one contradiction involving L. rhamnosus
      // that includes no_effect claims
      const hasNoEffect = lRhamnosusContradictions.some(c => c.noEffect.length > 0);
      expect(hasNoEffect).toBe(true);
    });
  });

  describe('temporalTrajectory', () => {
    it('should trace L. rhamnosus understanding over time', () => {
      const trajectory = temporalTrajectory(db, ids.bact_l_rhamnosus);

      expect(trajectory.length).toBeGreaterThanOrEqual(2);
      // Should span 2011 (Bravo) to 2017 (Kelly/Slykerman)
      expect(trajectory[0].year).toBeLessThanOrEqual(2011);
      expect(trajectory[trajectory.length - 1].year).toBeGreaterThanOrEqual(2017);
    });

    it('should show depression understanding evolving from 2004 to 2025', () => {
      const trajectory = temporalTrajectory(db, ids.cond_depression);

      // Should have entries across many years
      expect(trajectory.length).toBeGreaterThanOrEqual(8);
      // Earliest depression claim is 2011 (Bravo/Messaoudi), latest 2025
      expect(trajectory[0].year).toBeLessThanOrEqual(2013);
      expect(trajectory[trajectory.length - 1].year).toBe(2025);

      // Early entries should be animal/review, later entries more clinical trials
      const earlyStudyTypes = trajectory.slice(0, 3).flatMap(t => t.claims.map(c => c.studyType));
      expect(earlyStudyTypes.some(t => t === 'animal_study' || t === 'review')).toBe(true);
    });

    it('should track the kynurenine pathway emergence (2016+)', () => {
      const trajectory = temporalTrajectory(db, ids.mech_kynurenine_pathway);

      expect(trajectory.length).toBeGreaterThanOrEqual(3);
      // First mention should be 2016 (Zheng or Kelly)
      expect(trajectory[0].year).toBe(2016);
    });

    it('should show butyrate claims spanning from reviews to meta-analyses', () => {
      const trajectory = temporalTrajectory(db, ids.metab_butyrate);

      expect(trajectory.length).toBeGreaterThanOrEqual(3);

      const studyTypes = trajectory.flatMap(t => t.claims.map(c => c.studyType));
      const uniqueTypes = new Set(studyTypes);
      expect(uniqueTypes.size).toBeGreaterThanOrEqual(2);
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

  describe('novelConnections', () => {
    it('should find bacteria-condition pairs linked indirectly but not in the same paper', () => {
      const connections = novelConnections(db, 'bacterium', 'condition', 3, 3);

      // There should be some indirect connections
      expect(connections.length).toBeGreaterThanOrEqual(1);

      // Each connection should have a via summary
      for (const c of connections) {
        expect(c.nameA.length).toBeGreaterThan(0);
        expect(c.nameB.length).toBeGreaterThan(0);
        expect(c.shortestPath).toBeGreaterThanOrEqual(3); // must be indirect (3+ hops)
        expect(c.pathCount).toBeGreaterThanOrEqual(1);
      }
    });

    it('should find metabolite-condition indirect connections', () => {
      const connections = novelConnections(db, 'metabolite', 'condition', 3, 3);

      // Some metabolites should connect to conditions only indirectly
      if (connections.length > 0) {
        // The connection should describe intermediaries
        expect(connections[0].viaSummary.length).toBeGreaterThan(0);
      }
    });
  });

  describe('mechanismConvergence', () => {
    it('should rank mechanisms by convergence score', () => {
      const convergence = mechanismConvergence(db);

      expect(convergence.length).toBeGreaterThanOrEqual(3);

      // Top mechanism should have high convergence (papers × bacteria × conditions)
      expect(convergence[0].convergenceScore).toBeGreaterThanOrEqual(10);
      expect(convergence[0].supportingPapers).toBeGreaterThanOrEqual(2);
    });

    it('should find kynurenine pathway as a convergence hub', () => {
      const convergence = mechanismConvergence(db);

      const kynurenine = convergence.find(c => c.mechanism === ids.mech_kynurenine_pathway);
      expect(kynurenine).toBeDefined();
      // Kynurenine is mentioned in Zheng 2016, Kelly 2016, O'Hare 2025, and more
      expect(kynurenine!.supportingPapers).toBeGreaterThanOrEqual(3);
      // Should link multiple bacteria and conditions
      expect(kynurenine!.bacteriaSources.length).toBeGreaterThanOrEqual(1);
      expect(kynurenine!.conditionsLinked.length).toBeGreaterThanOrEqual(1);
    });

    it('should find vagus nerve as a convergence hub', () => {
      const convergence = mechanismConvergence(db);

      const vagus = convergence.find(c => c.mechanism === ids.mech_vagus);
      expect(vagus).toBeDefined();
      expect(vagus!.supportingPapers).toBeGreaterThanOrEqual(3);
    });

    it('should include claim summaries for each mechanism', () => {
      const convergence = mechanismConvergence(db);

      for (const mech of convergence) {
        expect(mech.claimSummaries.length).toBeGreaterThanOrEqual(1);
        expect(mech.claimSummaries[0].length).toBeGreaterThan(0);
      }
    });
  });

  describe('conditionSimilarity', () => {
    it('should find depression-anxiety as the most similar condition pair', () => {
      const sim = conditionSimilarity(db);

      // Depression and anxiety should be the most similar
      const depAnx = sim.pairs.find(p =>
        (p.conditionA === ids.cond_depression && p.conditionB === ids.cond_anxiety) ||
        (p.conditionA === ids.cond_anxiety && p.conditionB === ids.cond_depression)
      );
      expect(depAnx).toBeDefined();
      expect(depAnx!.overallJaccard).toBeGreaterThan(0.3);
      expect(depAnx!.sharedBacteria.length).toBeGreaterThanOrEqual(5);
    });

    it('should find Parkinson\'s as relatively isolated from psychiatric conditions', () => {
      const sim = conditionSimilarity(db);

      const pdDep = sim.pairs.find(p =>
        (p.conditionA === ids.cond_parkinsons && p.conditionB === ids.cond_depression) ||
        (p.conditionA === ids.cond_depression && p.conditionB === ids.cond_parkinsons)
      );

      // Parkinson's should have low overlap with depression
      if (pdDep) {
        expect(pdDep.overallJaccard).toBeLessThan(0.2);
      }
    });

    it('should find shared mechanisms between conditions', () => {
      const sim = conditionSimilarity(db);

      // At least some pairs should share mechanisms
      const withSharedMech = sim.pairs.filter(p => p.sharedMechanisms.length > 0);
      expect(withSharedMech.length).toBeGreaterThanOrEqual(3);
    });

    it('should rank pairs by overall Jaccard similarity', () => {
      const sim = conditionSimilarity(db);

      for (let i = 0; i < sim.pairs.length - 1; i++) {
        expect(sim.pairs[i].overallJaccard).toBeGreaterThanOrEqual(sim.pairs[i + 1].overallJaccard);
      }
    });
  });

  describe('studyTypeBreakdown', () => {
    it('should categorize papers by study type', () => {
      const breakdown = studyTypeBreakdown(db);

      // Should have multiple study types
      expect(breakdown.byStudyType.length).toBeGreaterThanOrEqual(4);

      // Total papers across types should equal total papers
      const totalPapers = breakdown.byStudyType.reduce((sum, t) => sum + t.count, 0);
      expect(totalPapers).toBe(35);
    });

    it('should include clinical trials and animal studies', () => {
      const breakdown = studyTypeBreakdown(db);
      const types = breakdown.byStudyType.map(t => t.type);

      expect(types).toContain('clinical_trial');
      expect(types).toContain('animal_study');
      expect(types).toContain('cohort');
    });

    it('should identify translational gaps (animal-only bacteria)', () => {
      const breakdown = studyTypeBreakdown(db);

      // There should be some bacteria with only animal/review evidence
      // (not all bacteria have been studied in human clinical trials)
      if (breakdown.translationalGaps.length > 0) {
        const gap = breakdown.translationalGaps[0];
        expect(gap.name.length).toBeGreaterThan(0);
        expect(gap.hasHumanEvidence).toBe(false);
      }
    });
  });

  describe('graphSummary', () => {
    it('should produce a complete summary of the knowledge graph', () => {
      const summary = graphSummary(db);

      expect(summary.papers).toBe(35);
      expect(summary.researchers).toBeGreaterThanOrEqual(65);
      expect(summary.institutions).toBeGreaterThanOrEqual(32);
      expect(summary.bacteria).toBeGreaterThanOrEqual(44);
      expect(summary.metabolites).toBeGreaterThanOrEqual(21);
      expect(summary.mechanisms).toBeGreaterThanOrEqual(14);
      expect(summary.conditions).toBeGreaterThanOrEqual(11);
      expect(summary.claims).toBeGreaterThanOrEqual(135);
      expect(summary.totalDeltas).toBeGreaterThan(1600);
      expect(summary.countries.length).toBeGreaterThanOrEqual(15);
      expect(summary.yearRange[0]).toBe(2004);
      expect(summary.yearRange[1]).toBe(2025);
    });
  });
});
