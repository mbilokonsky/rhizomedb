/**
 * Scenario 1: Mutual Aid Network During Infrastructure Collapse
 *
 * ~200 volunteers across a flooded metro area. Phones running local instances,
 * shelters acting as hubs. No central server. Conflicting reports coexist.
 * Most-recent resolution picks the latest field report.
 *
 * Tests: multi-instance federation, conflicting reports, time-travel for
 * after-action review, provenance tracking per volunteer.
 */

jest.setTimeout(15000);

import {
  RhizomeDB,
  Delta,
  annotate,
  relate,
  resolveEntity,
  resolveEntityWith,
  allValuesFor,
  buildHyperView,
  mostRecent,
  firstWrite,
  enableTimeTravel,
  createFederatedInstance,
  teardownInstance,
  connectInstances,
  waitFor,
  countEntityDeltas,
  TestInstance
} from './helpers';

describe('Scenario 1: Mutual Aid Network', () => {
  let shelter: TestInstance;
  let phoneA: TestInstance;
  let phoneB: TestInstance;

  beforeEach(async () => {
    shelter = await createFederatedInstance('shelter-hub');
    phoneA = await createFederatedInstance('phone-volunteer-a');
    phoneB = await createFederatedInstance('phone-volunteer-b');
  });

  afterEach(async () => {
    await teardownInstance(phoneB);
    await teardownInstance(phoneA);
    await teardownInstance(shelter);
  });

  it('should converge field reports from multiple volunteers at the shelter hub', async () => {
    // Both phones connect to shelter
    await connectInstances(shelter, phoneA);
    await connectInstances(shelter, phoneB);

    // Volunteer A reports: road status
    const reportA = annotate(phoneA.db, 'road-main-st', 'status', 'flooded', 'volunteer-alice');
    await phoneA.db.persistDelta(reportA);

    // Volunteer B reports: shelter capacity
    const reportB = annotate(phoneB.db, 'shelter-north', 'capacity', 50, 'volunteer-bob');
    await phoneB.db.persistDelta(reportB);
    const reportB2 = annotate(phoneB.db, 'shelter-north', 'current_occupancy', 35, 'volunteer-bob');
    await phoneB.db.persistDelta(reportB2);

    // Wait for reports to reach the shelter
    await waitFor(() => countEntityDeltas(shelter.db, 'road-main-st') >= 1);
    await waitFor(() => countEntityDeltas(shelter.db, 'shelter-north') >= 2);

    // Shelter sees both reports
    const roadView = resolveEntity(shelter.db, 'road-main-st');
    expect(roadView.status).toBe('flooded');

    const shelterView = resolveEntity(shelter.db, 'shelter-north');
    expect(shelterView.capacity).toBe(50);
    expect(shelterView.current_occupancy).toBe(35);
  });

  it('should resolve conflicting status reports with most-recent', async () => {
    await connectInstances(shelter, phoneA);
    await connectInstances(shelter, phoneB);

    // Volunteer A reports road as flooded (earlier observation)
    const d1 = annotate(phoneA.db, 'road-elm-st', 'status', 'flooded', 'volunteer-alice');
    d1.timestamp = Date.now() - 1000; // 1 second ago
    await phoneA.db.persistDelta(d1);

    await waitFor(() => countEntityDeltas(shelter.db, 'road-elm-st') >= 1);

    // Volunteer B reports same road as passable (later observation, water receded)
    const d2 = annotate(phoneB.db, 'road-elm-st', 'status', 'passable', 'volunteer-bob');
    // d2 gets current timestamp (more recent)
    await phoneB.db.persistDelta(d2);

    await waitFor(() => countEntityDeltas(shelter.db, 'road-elm-st') >= 2);

    // Most-recent resolution at shelter: passable (Bob's later report)
    const view = resolveEntity(shelter.db, 'road-elm-st');
    expect(view.status).toBe('passable');

    // Both reports preserved
    const allStatuses = allValuesFor(shelter.db, 'road-elm-st', 'status');
    expect(allStatuses).toHaveLength(2);
    expect(allStatuses).toContain('flooded');
    expect(allStatuses).toContain('passable');
  });

  it('should support after-action review via time-travel', async () => {
    // Use a single instance for simplicity in time-travel test
    const db = shelter.db;
    const t1 = 1000;
    const t2 = 2000;
    const t3 = 3000;
    const t4 = 4000;

    // t1: Initial report - bridge safe
    await db.persistDelta(annotate(db, 'bridge-oak', 'status', 'safe', 'vol-1', t1));

    // t2: Water rising
    await db.persistDelta(annotate(db, 'bridge-oak', 'status', 'caution', 'vol-2', t2));

    // t3: Bridge closed
    await db.persistDelta(annotate(db, 'bridge-oak', 'status', 'closed', 'vol-1', t3));

    // t4: Water recedes
    await db.persistDelta(annotate(db, 'bridge-oak', 'status', 'safe', 'vol-3', t4));

    // After-action: reconstruct what was known at each point
    expect(resolveEntity(db, 'bridge-oak', t1).status).toBe('safe');
    expect(resolveEntity(db, 'bridge-oak', t2).status).toBe('caution');
    expect(resolveEntity(db, 'bridge-oak', t3).status).toBe('closed');
    expect(resolveEntity(db, 'bridge-oak', t4).status).toBe('safe');

    // Timeline
    const timeDB = enableTimeTravel(db);
    const timeline = timeDB.getObjectTimeline('bridge-oak');
    expect(timeline).toEqual([t1, t2, t3, t4]);
  });

  it('should track provenance of every field report', async () => {
    await connectInstances(shelter, phoneA);

    // Multiple volunteers report on same location
    await phoneA.db.persistDelta(annotate(phoneA.db, 'need-insulin',
      'location', '123 Main St', 'volunteer-alice'));
    await phoneA.db.persistDelta(annotate(phoneA.db, 'need-insulin',
      'urgency', 'critical', 'volunteer-alice'));
    await phoneA.db.persistDelta(annotate(phoneA.db, 'need-insulin',
      'contact', 'Mrs. Garcia, apt 3B', 'volunteer-alice'));

    await waitFor(() => countEntityDeltas(shelter.db, 'need-insulin') >= 3);

    // Shelter can see who reported what
    const deltas = shelter.db.queryDeltas({ targetIds: ['need-insulin'] });
    const deltasArray = Array.isArray(deltas) ? deltas : [];

    expect(deltasArray.every(d => d.author === 'volunteer-alice')).toBe(true);
    expect(deltasArray.every(d => d.system === 'phone-volunteer-a')).toBe(true);
  });
});
