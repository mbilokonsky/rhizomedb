/**
 * Scenario 10: Whistleblower Evidence Preservation
 *
 * An employee documenting procurement fraud over months. The append-only
 * property means evidence can't be retroactively fabricated. Delta stream
 * has internal consistency that would be difficult to forge.
 *
 * Tests: tamper-evident evidence chain, timestamp consistency, append-only
 * guarantees, negation resistance, time-travel for discovery sequence.
 */

import {
  RhizomeDB,
  Delta,
  annotate,
  relate,
  resolveEntity,
  allValuesFor,
  relatedIds,
  buildHyperView,
  enableTimeTravel,
  getNegatedDeltaIds
} from './helpers';

describe('Scenario 10: Whistleblower Evidence Preservation', () => {
  let db: RhizomeDB;
  const whistleblower = 'anonymous-employee';
  const system = 'secure-device';

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory', systemId: system });
  });

  it('should build a tamper-evident evidence chain over time', async () => {
    const t1 = 1000; // January: first suspicion
    const t2 = 2000; // February: second piece of evidence
    const t3 = 3000; // March: connecting the dots
    const t4 = 4000; // April: smoking gun

    // January: suspicious contract
    await db.persistDelta(annotate(db, 'evidence-1', 'type', 'contract', whistleblower, t1));
    await db.persistDelta(annotate(db, 'evidence-1', 'description',
      'Contract #4521 awarded to shell company at 3x market rate', whistleblower, t1));
    await db.persistDelta(annotate(db, 'evidence-1', 'date_discovered', '2024-01-15', whistleblower, t1));

    // February: connection to executive
    await db.persistDelta(annotate(db, 'evidence-2', 'type', 'financial_record', whistleblower, t2));
    await db.persistDelta(annotate(db, 'evidence-2', 'description',
      'VP Procurement owns 40% of the shell company', whistleblower, t2));
    await db.persistDelta(relate(db,
      'evidence', 'evidence-2', 'related_to',
      'evidence', 'evidence-1', 'corroborated_by',
      whistleblower, t2
    ));

    // March: pattern emerges
    await db.persistDelta(annotate(db, 'evidence-3', 'type', 'pattern', whistleblower, t3));
    await db.persistDelta(annotate(db, 'evidence-3', 'description',
      '12 similar contracts over 3 years, all to related shell companies', whistleblower, t3));
    await db.persistDelta(relate(db,
      'evidence', 'evidence-3', 'related_to',
      'evidence', 'evidence-1', 'corroborated_by',
      whistleblower, t3
    ));
    await db.persistDelta(relate(db,
      'evidence', 'evidence-3', 'related_to',
      'evidence', 'evidence-2', 'corroborated_by',
      whistleblower, t3
    ));

    // April: internal email
    await db.persistDelta(annotate(db, 'evidence-4', 'type', 'communication', whistleblower, t4));
    await db.persistDelta(annotate(db, 'evidence-4', 'description',
      'Email from VP to shell company director discussing kickback schedule', whistleblower, t4));

    // Verify the evidence chain
    const e1 = resolveEntity(db, 'evidence-1');
    expect(e1.type).toBe('contract');
    expect(e1.date_discovered).toBe('2024-01-15');

    // Evidence-1 is corroborated by two later pieces
    const corroboration = relatedIds(db, 'evidence-1', 'corroborated_by', 'evidence');
    expect(corroboration).toContain('evidence-2');
    expect(corroboration).toContain('evidence-3');

    // All evidence traces to the same author
    const allDeltas = db.queryDeltas({});
    const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];
    expect(deltasArray.every(d => d.author === whistleblower)).toBe(true);

    // All evidence created on the same system
    expect(deltasArray.every(d => d.system === system)).toBe(true);
  });

  it('should prove sequence of discovery via timestamps', async () => {
    const discoveries = [
      { id: 'disc-1', content: 'Unusual contract terms', time: 1000 },
      { id: 'disc-2', content: 'Shell company registered to VP address', time: 2000 },
      { id: 'disc-3', content: 'Pattern of inflated invoices', time: 3000 },
      { id: 'disc-4', content: 'Kickback email found', time: 4000 },
      { id: 'disc-5', content: 'Second VP implicated', time: 5000 },
    ];

    for (const disc of discoveries) {
      await db.persistDelta(annotate(db, disc.id, 'content', disc.content, whistleblower, disc.time));
    }

    // Time-travel proves the order of discovery
    const timeDB = enableTimeTravel(db);

    // At t=2500, only first two discoveries exist
    const disc1at2500 = resolveEntity(db, 'disc-1', 2500);
    const disc2at2500 = resolveEntity(db, 'disc-2', 2500);
    const disc3at2500 = resolveEntity(db, 'disc-3', 2500);

    expect(disc1at2500.content).toBe('Unusual contract terms');
    expect(disc2at2500.content).toBe('Shell company registered to VP address');
    expect(disc3at2500.content).toBeUndefined(); // not discovered yet

    // FindOrigin shows when each piece of evidence first appeared
    const origin1 = timeDB.findOrigin('disc-1');
    const origin4 = timeDB.findOrigin('disc-4');
    expect(origin1?.timestamp).toBe(1000);
    expect(origin4?.timestamp).toBe(4000);
    expect(origin1!.timestamp).toBeLessThan(origin4!.timestamp);
  });

  it('should resist unauthorized negation attempts', async () => {
    // Whistleblower records critical evidence
    const criticalEvidence = annotate(db, 'smoking-gun', 'content',
      'Signed approval for fraudulent payment', whistleblower, 1000);
    await db.persistDelta(criticalEvidence);

    // An adversary tries to negate the evidence
    const adversary = 'vp-procurement';
    const negation = db.negateDelta(adversary, criticalEvidence.id,
      'This document is fabricated');
    negation.timestamp = 2000;
    await db.persistDelta(negation);

    // The negation succeeds technically (the system doesn't prevent it)
    // BUT the provenance reveals who negated it
    const allDeltas = db.queryDeltas({ includeNegated: true });
    const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];
    const negDelta = deltasArray.find(d => d.id === negation.id);
    expect(negDelta?.author).toBe(adversary);

    // A lawyer could argue: the person accused of fraud negated the evidence
    // That's itself suspicious and provable from the delta stream

    // The whistleblower can counter-negate (double negation restores)
    const counterNeg = db.negateDelta(whistleblower, negation.id,
      'Evidence authenticated by forensic analysis');
    counterNeg.timestamp = 3000;
    await db.persistDelta(counterNeg);

    // Original evidence is restored
    const view = resolveEntity(db, 'smoking-gun');
    expect(view.content).toBe('Signed approval for fraudulent payment');
  });

  it('should preserve the complete timeline even after negation', async () => {
    // Build up evidence over time
    const ev1 = annotate(db, 'timeline', 'entry', 'Jan: noticed anomaly', whistleblower, 1000);
    await db.persistDelta(ev1);
    const ev2 = annotate(db, 'timeline', 'entry', 'Feb: confirmed pattern', whistleblower, 2000);
    await db.persistDelta(ev2);
    const ev3 = annotate(db, 'timeline', 'entry', 'Mar: found proof', whistleblower, 3000);
    await db.persistDelta(ev3);

    // Even if some entries are negated, includeNegated: true shows everything
    const neg = db.negateDelta(whistleblower, ev2.id, 'Superseded by more precise entry');
    neg.timestamp = 3500;
    await db.persistDelta(neg);

    // Default query hides negated entry
    const visibleEntries = allValuesFor(db, 'timeline', 'entry');
    expect(visibleEntries).toHaveLength(2);

    // includeNegated shows the complete history
    const allDeltas = db.queryDeltas({ targetIds: ['timeline'], includeNegated: true });
    const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];
    // 3 entry deltas (one negated) still present in the store
    const entryDeltas = deltasArray.filter(d =>
      d.pointers.some(p => p.role === 'entry')
    );
    expect(entryDeltas.length).toBe(3);
  });

  it('should support linking evidence to people and organizations', async () => {
    // Create entities
    await db.persistDelta(annotate(db, 'person-vp', 'name', 'John VP', whistleblower));
    await db.persistDelta(annotate(db, 'person-vp', 'role', 'VP Procurement', whistleblower));
    await db.persistDelta(annotate(db, 'company-shell', 'name', 'ABC Holdings LLC', whistleblower));
    await db.persistDelta(annotate(db, 'contract-4521', 'value', 2500000, whistleblower));

    // Link them
    await db.persistDelta(relate(db,
      'person', 'person-vp', 'companies',
      'company', 'company-shell', 'owners',
      whistleblower
    ));
    await db.persistDelta(relate(db,
      'company', 'company-shell', 'contracts',
      'contract', 'contract-4521', 'vendor',
      whistleblower
    ));
    await db.persistDelta(relate(db,
      'person', 'person-vp', 'approved',
      'contract', 'contract-4521', 'approved_by',
      whistleblower
    ));

    // Query: what companies does the VP own?
    const vpCompanies = relatedIds(db, 'person-vp', 'companies', 'company');
    expect(vpCompanies).toContain('company-shell');

    // Query: what contracts did the shell company get?
    const shellContracts = relatedIds(db, 'company-shell', 'contracts', 'contract');
    expect(shellContracts).toContain('contract-4521');

    // Query: who approved the contract?
    const approvers = relatedIds(db, 'contract-4521', 'approved_by', 'person');
    expect(approvers).toContain('person-vp');

    // The graph structure itself tells the story:
    // VP owns shell company -> shell company gets contract -> VP approved contract
  });
});
