/**
 * Scenario 11: Decentralized Scientific Replication Registry
 *
 * A network of biology labs sharing raw experimental data and replication
 * attempts. Labs publish findings as deltas, others attempt replication.
 * Append-only means you can't quietly delete a failed replication.
 *
 * Tests: replication tracking, multiple labs asserting about same finding,
 * retraction via negation, view resolution for replication status,
 * provenance of scientific claims.
 */

import {
  RhizomeDB,
  Delta,
  annotate,
  relate,
  resolveEntity,
  resolveEntityWith,
  allValuesFor,
  relatedIds,
  buildHyperView,
  resolveHyperView,
  mostRecent,
  allValues,
  enableTimeTravel,
  getNegatedDeltaIds
} from './helpers';

describe('Scenario 11: Decentralized Scientific Replication', () => {
  let db: RhizomeDB;
  const labMIT = 'lab-mit';
  const labStanford = 'lab-stanford';
  const labOxford = 'lab-oxford';
  const labTokyo = 'lab-tokyo';
  const labBerlin = 'lab-berlin';

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory', systemId: 'replication-registry' });
  });

  it('should track a finding and its replication attempts', async () => {
    // MIT publishes original finding
    await db.persistDelta(annotate(db, 'finding-001', 'title',
      'Novel protein folding pathway in SARS-CoV-2 spike protein', labMIT));
    await db.persistDelta(annotate(db, 'finding-001', 'method',
      'Cryo-EM at 2.8A resolution', labMIT));
    await db.persistDelta(annotate(db, 'finding-001', 'result',
      'Identified novel intermediate folding state', labMIT));
    await db.persistDelta(annotate(db, 'finding-001', 'status', 'published', labMIT));

    // Stanford replicates: success
    await db.persistDelta(annotate(db, 'replication-001', 'result', 'replicated', labStanford));
    await db.persistDelta(annotate(db, 'replication-001', 'method',
      'Cryo-EM at 3.1A resolution', labStanford));
    await db.persistDelta(annotate(db, 'replication-001', 'notes',
      'Confirmed intermediate state at slightly different resolution', labStanford));
    await db.persistDelta(relate(db,
      'replication', 'replication-001', 'replicates',
      'finding', 'finding-001', 'replications',
      labStanford
    ));

    // Oxford replicates: failure
    await db.persistDelta(annotate(db, 'replication-002', 'result', 'failed', labOxford));
    await db.persistDelta(annotate(db, 'replication-002', 'method',
      'Cryo-EM at 4.0A resolution', labOxford));
    await db.persistDelta(annotate(db, 'replication-002', 'notes',
      'Could not resolve intermediate state; may be resolution-dependent', labOxford));
    await db.persistDelta(relate(db,
      'replication', 'replication-002', 'replicates',
      'finding', 'finding-001', 'replications',
      labOxford
    ));

    // Tokyo replicates: success
    await db.persistDelta(annotate(db, 'replication-003', 'result', 'replicated', labTokyo));
    await db.persistDelta(relate(db,
      'replication', 'replication-003', 'replicates',
      'finding', 'finding-001', 'replications',
      labTokyo
    ));

    // Query: how many replications for this finding?
    const replications = relatedIds(db, 'finding-001', 'replications', 'replication');
    expect(replications).toHaveLength(3);

    // Check individual results
    const rep1 = resolveEntity(db, 'replication-001');
    expect(rep1.result).toBe('replicated');

    const rep2 = resolveEntity(db, 'replication-002');
    expect(rep2.result).toBe('failed');

    const rep3 = resolveEntity(db, 'replication-003');
    expect(rep3.result).toBe('replicated');
  });

  it('should support formal retraction while preserving the record', async () => {
    // Berlin publishes a finding
    const findingDelta = annotate(db, 'finding-002', 'title',
      'CRISPR efficiency breakthrough in human T-cells', labBerlin, 1000);
    await db.persistDelta(findingDelta);
    await db.persistDelta(annotate(db, 'finding-002', 'result',
      '95% editing efficiency achieved', labBerlin, 1000));
    await db.persistDelta(annotate(db, 'finding-002', 'status', 'published', labBerlin, 1000));

    // Later: Berlin discovers a statistical error and retracts
    const retraction = db.negateDelta(labBerlin, findingDelta.id,
      'Statistical analysis contained a systematic error; actual efficiency was 23%');
    retraction.timestamp = 2000;
    await db.persistDelta(retraction);
    await db.persistDelta(annotate(db, 'finding-002', 'status', 'retracted', labBerlin, 2000));

    // Current view shows retraction
    const currentView = resolveEntity(db, 'finding-002');
    expect(currentView.status).toBe('retracted');
    expect(currentView.title).toBeUndefined(); // title delta was negated

    // But the full record is preserved
    const allDeltas = db.queryDeltas({ targetIds: ['finding-002'], includeNegated: true });
    const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];
    // Original deltas still exist in the store
    expect(deltasArray.find(d => d.id === findingDelta.id)).toBeDefined();

    // Time-travel shows it was once published
    const pastView = resolveEntity(db, 'finding-002', 1500);
    expect(pastView.title).toBe('CRISPR efficiency breakthrough in human T-cells');
    expect(pastView.status).toBe('published');
  });

  it('should track which labs have replicated which findings', async () => {
    // Three findings from three labs
    const findings = ['finding-A', 'finding-B', 'finding-C'];
    const labs = [labMIT, labStanford, labOxford];

    for (let i = 0; i < 3; i++) {
      await db.persistDelta(annotate(db, findings[i], 'title', `Finding ${i}`, labs[i]));
    }

    // Cross-replication matrix
    // MIT's finding replicated by Stanford and Tokyo
    await db.persistDelta(relate(db,
      'replication', 'rep-1', 'replicates',
      'finding', 'finding-A', 'replications', labStanford));
    await db.persistDelta(annotate(db, 'rep-1', 'result', 'replicated', labStanford));

    await db.persistDelta(relate(db,
      'replication', 'rep-2', 'replicates',
      'finding', 'finding-A', 'replications', labTokyo));
    await db.persistDelta(annotate(db, 'rep-2', 'result', 'replicated', labTokyo));

    // Stanford's finding: failed replication by Oxford
    await db.persistDelta(relate(db,
      'replication', 'rep-3', 'replicates',
      'finding', 'finding-B', 'replications', labOxford));
    await db.persistDelta(annotate(db, 'rep-3', 'result', 'failed', labOxford));

    // Oxford's finding: not yet replicated by anyone
    // (absence of replications)

    // Query replication counts
    const repsA = relatedIds(db, 'finding-A', 'replications', 'replication');
    expect(repsA).toHaveLength(2);

    const repsB = relatedIds(db, 'finding-B', 'replications', 'replication');
    expect(repsB).toHaveLength(1);

    const repsC = relatedIds(db, 'finding-C', 'replications', 'replication');
    expect(repsC).toHaveLength(0); // no replications yet
  });

  it('should attribute every claim to its source lab', async () => {
    // Multiple labs make claims about the same biological mechanism
    await db.persistDelta(annotate(db, 'mechanism-X', 'efficiency', '95%', labBerlin, 1000));
    await db.persistDelta(annotate(db, 'mechanism-X', 'efficiency', '23%', labMIT, 2000));
    await db.persistDelta(annotate(db, 'mechanism-X', 'efficiency', '28%', labStanford, 3000));
    await db.persistDelta(annotate(db, 'mechanism-X', 'efficiency', '91%', labTokyo, 4000));

    // All claims preserved
    const efficiencies = allValuesFor(db, 'mechanism-X', 'efficiency');
    expect(efficiencies).toHaveLength(4);

    // Query by specific lab
    const berlinDeltas = db.queryDeltas({
      targetIds: ['mechanism-X'],
      authors: [labBerlin]
    });
    const berlinArray = Array.isArray(berlinDeltas) ? berlinDeltas : [];
    expect(berlinArray.length).toBe(1);

    // You can see exactly which lab claimed what
    const allDeltas = db.queryDeltas({ targetIds: ['mechanism-X'] });
    const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];
    const labClaims = deltasArray.map(d => ({
      lab: d.author,
      value: d.pointers.find(p => typeof p.target === 'string' || typeof p.target === 'number')?.target
    }));

    expect(labClaims).toContainEqual({ lab: labBerlin, value: '95%' });
    expect(labClaims).toContainEqual({ lab: labMIT, value: '23%' });
  });

  it('should show the evolution of scientific consensus over time', async () => {
    const findingId = 'finding-consensus';
    const t1 = 1000;
    const t2 = 2000;
    const t3 = 3000;
    const t4 = 4000;

    // t1: Original bold claim
    await db.persistDelta(annotate(db, findingId, 'claim',
      'Gene X causes condition Y', labBerlin, t1));
    await db.persistDelta(annotate(db, findingId, 'confidence', 'high', labBerlin, t1));

    // t2: First replication adds nuance
    await db.persistDelta(annotate(db, findingId, 'claim',
      'Gene X correlates with condition Y in European populations', labOxford, t2));
    await db.persistDelta(annotate(db, findingId, 'confidence', 'moderate', labOxford, t2));

    // t3: Failed replication in different population
    await db.persistDelta(annotate(db, findingId, 'claim',
      'Gene X shows no correlation with condition Y in East Asian populations', labTokyo, t3));
    await db.persistDelta(annotate(db, findingId, 'confidence', 'low', labTokyo, t3));

    // t4: Meta-analysis
    await db.persistDelta(annotate(db, findingId, 'claim',
      'Gene X has population-specific effects on condition Y', labMIT, t4));

    // At each timestamp, the picture looks different
    const claimsT1 = allValuesFor(db, findingId, 'claim', t1);
    expect(claimsT1).toHaveLength(1);

    const claimsT2 = allValuesFor(db, findingId, 'claim', t2);
    expect(claimsT2).toHaveLength(2);

    const claimsT4 = allValuesFor(db, findingId, 'claim', t4);
    expect(claimsT4).toHaveLength(4);

    // Most recent claim reflects evolved understanding
    const currentView = resolveEntity(db, findingId);
    expect(currentView.claim).toContain('population-specific');
  });
});
