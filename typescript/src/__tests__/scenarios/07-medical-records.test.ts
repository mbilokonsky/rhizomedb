/**
 * Scenario 7: Conflict-Zone Medical Records
 *
 * 8 clinics in an active conflict zone, each with a local instance. Sporadic
 * connectivity. Patients move between clinics as front lines shift. Critical
 * allergy information must propagate. Provenance traces doctor and clinic.
 *
 * Tests: patient records across clinics, partial sync, provenance per doctor,
 * allergy propagation, eventual consistency of treatment history.
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
  mostRecent,
  enableTimeTravel,
  getNegatedDeltaIds
} from './helpers';

describe('Scenario 7: Conflict-Zone Medical Records', () => {
  let clinicA: RhizomeDB;
  let clinicB: RhizomeDB;
  let clinicC: RhizomeDB;
  const drKhalid = 'dr-khalid';
  const drFatima = 'dr-fatima';
  const drAhmad = 'dr-ahmad';

  beforeEach(() => {
    clinicA = new RhizomeDB({ storage: 'memory', systemId: 'clinic-north' });
    clinicB = new RhizomeDB({ storage: 'memory', systemId: 'clinic-south' });
    clinicC = new RhizomeDB({ storage: 'memory', systemId: 'clinic-west' });
  });

  /** Simulate sync by copying all deltas from source to destination */
  async function syncClinic(source: RhizomeDB, dest: RhizomeDB): Promise<void> {
    const deltas = source.queryDeltas({ includeNegated: true });
    const deltasArray = Array.isArray(deltas) ? deltas : [];
    for (const delta of deltasArray) {
      await dest.persistDelta(delta);
    }
  }

  it('should build a patient record across multiple clinics', async () => {
    const patient = 'patient-ahmad';

    // Clinic A: initial intake
    await clinicA.persistDelta(annotate(clinicA, patient, 'name', 'Ahmad Hassan', drKhalid));
    await clinicA.persistDelta(annotate(clinicA, patient, 'age', 45, drKhalid));
    await clinicA.persistDelta(annotate(clinicA, patient, 'blood_type', 'O+', drKhalid));
    await clinicA.persistDelta(annotate(clinicA, patient, 'allergy', 'penicillin', drKhalid));

    // Clinic B: patient arrives after displacement, no sync yet
    // Doctor only knows what patient tells them
    await clinicB.persistDelta(annotate(clinicB, patient, 'name', 'Ahmad Hassan', drFatima));
    await clinicB.persistDelta(annotate(clinicB, patient, 'chief_complaint', 'shrapnel wound, left arm', drFatima));
    await clinicB.persistDelta(annotate(clinicB, patient, 'treatment', 'wound debridement and sutures', drFatima));

    // Before sync: Clinic B doesn't know about the allergy
    const viewAtB = resolveEntity(clinicB, patient);
    expect(viewAtB.allergy).toBeUndefined(); // dangerous gap!

    // Satellite uplink available: sync Clinic A -> Clinic B
    await syncClinic(clinicA, clinicB);

    // After sync: Clinic B now knows about the allergy
    const viewAfterSync = resolveEntity(clinicB, patient);
    expect(viewAfterSync.allergy).toBe('penicillin');
    expect(viewAfterSync.blood_type).toBe('O+');
    expect(viewAfterSync.chief_complaint).toBe('shrapnel wound, left arm');
  });

  it('should merge treatment histories from multiple clinics', async () => {
    const patient = 'patient-sara';

    // Clinic A treatments
    await clinicA.persistDelta(annotate(clinicA, patient, 'diagnosis', 'malaria', drKhalid, 1000));
    await clinicA.persistDelta(annotate(clinicA, patient, 'treatment',
      'Artemisinin combination therapy', drKhalid, 1000));

    // Clinic C treatments (weeks later)
    await clinicC.persistDelta(annotate(clinicC, patient, 'diagnosis', 'dehydration', drAhmad, 2000));
    await clinicC.persistDelta(annotate(clinicC, patient, 'treatment',
      'IV fluids and oral rehydration', drAhmad, 2000));

    // Sync both to Clinic B
    await syncClinic(clinicA, clinicB);
    await syncClinic(clinicC, clinicB);

    // Clinic B sees complete treatment history
    const diagnoses = allValuesFor(clinicB, patient, 'diagnosis');
    expect(diagnoses).toHaveLength(2);
    expect(diagnoses).toContain('malaria');
    expect(diagnoses).toContain('dehydration');

    const treatments = allValuesFor(clinicB, patient, 'treatment');
    expect(treatments).toHaveLength(2);
    expect(treatments).toContain('Artemisinin combination therapy');
    expect(treatments).toContain('IV fluids and oral rehydration');
  });

  it('should trace every medical decision to its doctor and clinic', async () => {
    const patient = 'patient-yusuf';

    // Three doctors at three clinics treat the same patient
    await clinicA.persistDelta(annotate(clinicA, patient, 'note',
      'Administered tetanus booster', drKhalid, 1000));
    await clinicB.persistDelta(annotate(clinicB, patient, 'note',
      'Changed wound dressing', drFatima, 2000));
    await clinicC.persistDelta(annotate(clinicC, patient, 'note',
      'Removed sutures, wound healing well', drAhmad, 3000));

    // Sync all to Clinic B
    await syncClinic(clinicA, clinicB);
    await syncClinic(clinicC, clinicB);

    // Every note traces to its source
    const allDeltas = clinicB.queryDeltas({ targetIds: [patient] });
    const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];

    const provenance = deltasArray.map(d => ({
      author: d.author,
      system: d.system,
      timestamp: d.timestamp
    }));

    // Verify each doctor and clinic is traceable
    expect(provenance.some(p => p.author === drKhalid && p.system === 'clinic-north')).toBe(true);
    expect(provenance.some(p => p.author === drFatima && p.system === 'clinic-south')).toBe(true);
    expect(provenance.some(p => p.author === drAhmad && p.system === 'clinic-west')).toBe(true);
  });

  it('should handle correction of medical records via negation', async () => {
    const patient = 'patient-layla';

    // Wrong allergy recorded
    const wrongAllergy = annotate(clinicA, patient, 'allergy', 'aspirin', drKhalid, 1000);
    await clinicA.persistDelta(wrongAllergy);

    // Doctor realizes the error
    const correction = clinicA.negateDelta(drKhalid, wrongAllergy.id,
      'Patient clarified: allergic to ibuprofen, not aspirin');
    correction.timestamp = 2000;
    await clinicA.persistDelta(correction);
    await clinicA.persistDelta(annotate(clinicA, patient, 'allergy', 'ibuprofen', drKhalid, 2000));

    // Current view shows correct allergy
    const view = resolveEntity(clinicA, patient);
    expect(view.allergy).toBe('ibuprofen');

    // Sync to Clinic B
    await syncClinic(clinicA, clinicB);

    // Clinic B also sees corrected allergy
    const viewB = resolveEntity(clinicB, patient);
    expect(viewB.allergy).toBe('ibuprofen');

    // Audit trail: both the error and correction are visible
    const allDeltas = clinicB.queryDeltas({ includeNegated: true });
    const allArray = Array.isArray(allDeltas) ? allDeltas : [];
    expect(allArray.find(d => d.id === wrongAllergy.id)).toBeDefined();
    const negatedIds = getNegatedDeltaIds(allArray);
    expect(negatedIds.has(wrongAllergy.id)).toBe(true);
  });

  it('should support idempotent sync (same delta received twice is safe)', async () => {
    const patient = 'patient-omar';

    await clinicA.persistDelta(annotate(clinicA, patient, 'name', 'Omar', drKhalid));
    await clinicA.persistDelta(annotate(clinicA, patient, 'age', 30, drKhalid));

    // Sync twice (simulating duplicate delivery)
    await syncClinic(clinicA, clinicB);
    await syncClinic(clinicA, clinicB);

    // Clinic B should have exactly the right number of deltas (no duplicates)
    const deltas = clinicB.queryDeltas({ targetIds: [patient] });
    const deltasArray = Array.isArray(deltas) ? deltas : [];
    expect(deltasArray).toHaveLength(2);
  });
});
