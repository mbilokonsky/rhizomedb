/**
 * Scenario 3: Multi-Site Pharmaceutical Clinical Trial
 *
 * Phase III drug trial across 12 hospitals. Each patient interaction generates
 * deltas. Immutable audit trail satisfies regulatory requirements. Negation
 * preserves the error and the correction. Time-travel reconstructs any past state.
 *
 * Tests: immutable audit trail, negation for corrections, time-travel for
 * regulatory inspection, multi-site data, blinding schema.
 */

import {
  RhizomeDB,
  Delta,
  HyperSchema,
  annotate,
  relate,
  resolveEntity,
  resolveEntityWith,
  allValuesFor,
  buildHyperView,
  resolveHyperView,
  mostRecent,
  trustedAuthor,
  enableTimeTravel,
  getNegatedDeltaIds
} from './helpers';

describe('Scenario 3: Multi-Site Clinical Trial', () => {
  let db: RhizomeDB;
  const siteA = 'hospital-boston';
  const siteB = 'hospital-london';
  const drSmith = 'dr-smith';
  const drJones = 'dr-jones';
  const cro = 'cro-coordinator';

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory', systemId: 'trial-coordinator' });
  });

  it('should maintain an immutable audit trail of patient data', async () => {
    const patient = 'patient-001';
    const t1 = 1000;
    const t2 = 2000;
    const t3 = 3000;

    // Screening visit
    await db.persistDelta(annotate(db, patient, 'blood_pressure', '120/80', drSmith, t1));
    await db.persistDelta(annotate(db, patient, 'weight_kg', 75, drSmith, t1));
    await db.persistDelta(annotate(db, patient, 'enrolled', true, drSmith, t1));

    // Follow-up visit
    await db.persistDelta(annotate(db, patient, 'blood_pressure', '130/85', drSmith, t2));
    await db.persistDelta(annotate(db, patient, 'weight_kg', 74, drSmith, t2));

    // Adverse event
    await db.persistDelta(annotate(db, patient, 'adverse_event', 'mild headache', drSmith, t3));

    // Every measurement is preserved with full provenance
    const allDeltas = db.queryDeltas({ targetIds: [patient] });
    const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];

    // All 6 data points recorded
    expect(deltasArray.length).toBe(6);

    // Every delta traces back to the author
    expect(deltasArray.every(d => d.author === drSmith)).toBe(true);

    // Every delta has a timestamp
    expect(deltasArray.every(d => d.timestamp > 0)).toBe(true);
  });

  it('should preserve errors and corrections via negation', async () => {
    const patient = 'patient-002';

    // Initial recording: wrong blood pressure (transposed digits)
    const wrongBP = annotate(db, patient, 'blood_pressure', '180/120', drSmith, 1000);
    await db.persistDelta(wrongBP);

    // Correction: negate the error and record correct value
    const correction = db.negateDelta(drSmith, wrongBP.id,
      'Correction: digits were transposed during data entry');
    correction.timestamp = 2000;
    await db.persistDelta(correction);

    const correctBP = annotate(db, patient, 'blood_pressure', '120/80', drSmith, 2000);
    await db.persistDelta(correctBP);

    // Current view shows correct value
    const currentView = resolveEntity(db, patient);
    expect(currentView.blood_pressure).toBe('120/80');

    // Audit trail: both the error and correction are preserved
    const allDeltas = db.queryDeltas({ includeNegated: true });
    const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];

    // Original wrong delta still exists in the store
    expect(deltasArray.find(d => d.id === wrongBP.id)).toBeDefined();
    // Correction delta exists
    expect(deltasArray.find(d => d.id === correction.id)).toBeDefined();
    // Correct value exists
    expect(deltasArray.find(d => d.id === correctBP.id)).toBeDefined();

    // The wrong delta is marked as negated
    const negatedIds = getNegatedDeltaIds(deltasArray);
    expect(negatedIds.has(wrongBP.id)).toBe(true);
    expect(negatedIds.has(correctBP.id)).toBe(false);
  });

  it('should reconstruct past state for regulatory inspection', async () => {
    const patient = 'patient-003';
    const enrollment = 1000;
    const visit1 = 2000;
    const visit2 = 3000;
    const adverseEvent = 4000;

    // Build patient timeline
    await db.persistDelta(annotate(db, patient, 'status', 'enrolled', drSmith, enrollment));
    await db.persistDelta(annotate(db, patient, 'dose_mg', 100, drSmith, visit1));
    await db.persistDelta(annotate(db, patient, 'response', 'stable', drSmith, visit1));
    await db.persistDelta(annotate(db, patient, 'dose_mg', 150, drSmith, visit2));
    await db.persistDelta(annotate(db, patient, 'response', 'improving', drSmith, visit2));
    await db.persistDelta(annotate(db, patient, 'adverse_event', 'nausea', drSmith, adverseEvent));
    await db.persistDelta(annotate(db, patient, 'status', 'withdrawn', drSmith, adverseEvent));

    // Regulatory question: "What was known about this patient at visit 2?"
    const viewAtVisit2 = resolveEntity(db, patient, visit2);
    expect(viewAtVisit2.status).toBe('enrolled');
    expect(viewAtVisit2.dose_mg).toBe(150);
    expect(viewAtVisit2.response).toBe('improving');
    expect(viewAtVisit2.adverse_event).toBeUndefined(); // not yet known!

    // Regulatory question: "When did the adverse event happen?"
    const timeDB = enableTimeTravel(db);
    const timeline = timeDB.getObjectTimeline(patient);
    expect(timeline).toContain(adverseEvent);

    // Regulatory question: "What changed between visit 2 and the adverse event?"
    const schema = buildHyperView(db, patient).id ? undefined : undefined; // use default
    const comparison = timeDB.compareSnapshots(
      patient,
      { id: '_q', name: 'Q', select: (oid, d) => {
        const props: string[] = [];
        for (const p of d.pointers) {
          if (typeof p.target === 'object' && 'id' in p.target &&
              p.target.id === oid && p.target.context) {
            props.push(p.target.context);
          }
        }
        return props.length > 0 ? props : false;
      }, transform: {} },
      visit2,
      adverseEvent
    );
    expect(comparison.deltasAdded).toBeGreaterThan(0);
  });

  it('should support blinding schema that hides treatment arm', async () => {
    // CRO assigns treatment arms (only visible to unblinded personnel)
    await db.persistDelta(annotate(db, 'patient-A', 'treatment_arm', 'drug', cro, 1000));
    await db.persistDelta(annotate(db, 'patient-B', 'treatment_arm', 'placebo', cro, 1000));
    await db.persistDelta(annotate(db, 'patient-A', 'site', 'Boston', drSmith, 1000));
    await db.persistDelta(annotate(db, 'patient-B', 'site', 'London', drJones, 1000));

    // Clinical data from sites
    await db.persistDelta(annotate(db, 'patient-A', 'response', 'improved', drSmith, 2000));
    await db.persistDelta(annotate(db, 'patient-B', 'response', 'no change', drJones, 2000));

    // Blinded schema: excludes treatment_arm
    const blindedSchema: HyperSchema = {
      id: 'blinded',
      name: 'Blinded',
      select: (objectId, delta) => {
        const props: string[] = [];
        for (const p of delta.pointers) {
          if (typeof p.target === 'object' && 'id' in p.target &&
              p.target.id === objectId && p.target.context &&
              p.target.context !== 'treatment_arm') {
            props.push(p.target.context);
          }
        }
        return props.length > 0 ? props : false;
      },
      transform: {}
    };

    // Unblinded schema: includes everything
    const unblindedSchema: HyperSchema = {
      id: 'unblinded',
      name: 'Unblinded',
      select: (objectId, delta) => {
        const props: string[] = [];
        for (const p of delta.pointers) {
          if (typeof p.target === 'object' && 'id' in p.target &&
              p.target.id === objectId && p.target.context) {
            props.push(p.target.context);
          }
        }
        return props.length > 0 ? props : false;
      },
      transform: {}
    };

    // Site investigator sees blinded view
    const blindedViewA = buildHyperView(db, 'patient-A', blindedSchema);
    expect(blindedViewA.site).toBeDefined();
    expect(blindedViewA.response).toBeDefined();
    expect(blindedViewA.treatment_arm).toBeUndefined();

    // DSMB sees unblinded view
    const unblindedViewA = buildHyperView(db, 'patient-A', unblindedSchema);
    expect(unblindedViewA.treatment_arm).toBeDefined();
    expect(unblindedViewA.response).toBeDefined();
  });

  it('should normalize data from multiple sites via a common schema', async () => {
    // Site A records vitals with one convention
    await db.persistDelta(annotate(db, 'patient-X', 'systolic', 120, drSmith, 1000));
    await db.persistDelta(annotate(db, 'patient-X', 'diastolic', 80, drSmith, 1000));
    await db.persistDelta(annotate(db, 'patient-X', 'site', 'Boston', drSmith, 1000));

    // Site B records vitals with same convention
    await db.persistDelta(annotate(db, 'patient-Y', 'systolic', 140, drJones, 1000));
    await db.persistDelta(annotate(db, 'patient-Y', 'diastolic', 90, drJones, 1000));
    await db.persistDelta(annotate(db, 'patient-Y', 'site', 'London', drJones, 1000));

    // CRO can query all patients uniformly
    const viewX = resolveEntity(db, 'patient-X');
    const viewY = resolveEntity(db, 'patient-Y');

    expect(viewX.systolic).toBe(120);
    expect(viewX.site).toBe('Boston');
    expect(viewY.systolic).toBe(140);
    expect(viewY.site).toBe('London');

    // Query by author to see all data from a specific site
    const bostonDeltas = db.queryDeltas({ authors: [drSmith] });
    const londonDeltas = db.queryDeltas({ authors: [drJones] });
    const bostonArray = Array.isArray(bostonDeltas) ? bostonDeltas : [];
    const londonArray = Array.isArray(londonDeltas) ? londonDeltas : [];

    expect(bostonArray.length).toBeGreaterThan(0);
    expect(londonArray.length).toBeGreaterThan(0);
    expect(bostonArray.every(d => d.author === drSmith)).toBe(true);
    expect(londonArray.every(d => d.author === drJones)).toBe(true);
  });
});
