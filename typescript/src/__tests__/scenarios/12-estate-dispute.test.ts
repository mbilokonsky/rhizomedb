/**
 * Scenario 12: Contentious Estate Dispute
 *
 * Three siblings disputing an estate: division of a family business, real estate,
 * and personal property. Each party makes claims, the mediator aggregates.
 * All competing claims are surfaced explicitly.
 *
 * Tests: conflicting claims, all-values resolution, negation as challenge,
 * trusted-author resolution for mediator authority, provenance tracking.
 */

import {
  RhizomeDB,
  Delta,
  annotate,
  relate,
  resolveEntity,
  resolveEntityWith,
  allValuesFor,
  buildHyperView,
  resolveHyperView,
  mostRecent,
  allValues,
  trustedAuthor,
  ViewResolver,
  enableTimeTravel
} from './helpers';

describe('Scenario 12: Contentious Estate Dispute', () => {
  let db: RhizomeDB;
  const siblingA = 'sibling-alice';
  const siblingB = 'sibling-bob';
  const siblingC = 'sibling-carol';
  const mediator = 'mediator-dana';

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory', systemId: 'mediation-system' });
  });

  it('should surface all competing claims about an asset', async () => {
    // All three siblings claim the lake house
    await db.persistDelta(annotate(db, 'lake-house', 'claimed_by',
      'Alice: Dad promised it to me in 2019', siblingA, 1000));
    await db.persistDelta(annotate(db, 'lake-house', 'claimed_by',
      'Bob: I paid for the renovation, it should be mine', siblingB, 1001));
    await db.persistDelta(annotate(db, 'lake-house', 'claimed_by',
      'Carol: I have been maintaining it for 5 years', siblingC, 1002));

    // All three claims should be visible
    const claims = allValuesFor(db, 'lake-house', 'claimed_by');
    expect(claims).toHaveLength(3);
    expect(claims).toContain('Alice: Dad promised it to me in 2019');
    expect(claims).toContain('Bob: I paid for the renovation, it should be mine');
    expect(claims).toContain('Carol: I have been maintaining it for 5 years');
  });

  it('should track competing valuations with provenance', async () => {
    // Each sibling proposes a different value for the business
    await db.persistDelta(annotate(db, 'family-business', 'valuation', 500000, siblingA, 1000));
    await db.persistDelta(annotate(db, 'family-business', 'valuation', 750000, siblingB, 1001));
    await db.persistDelta(annotate(db, 'family-business', 'valuation', 300000, siblingC, 1002));

    // All valuations preserved
    const valuations = allValuesFor(db, 'family-business', 'valuation');
    expect(valuations).toHaveLength(3);
    expect(valuations).toContain(500000);
    expect(valuations).toContain(750000);
    expect(valuations).toContain(300000);

    // With mostRecent, Carol's (latest) wins
    const recentView = resolveEntity(db, 'family-business');
    expect(recentView.valuation).toBe(300000);

    // With trustedAuthor, mediator could assign an appraised value
    await db.persistDelta(annotate(db, 'family-business', 'valuation', 620000, mediator, 2000));
    const mediatorView = resolveEntityWith(db, 'family-business',
      trustedAuthor([mediator]));
    expect(mediatorView.valuation).toBe(620000);
  });

  it('should handle negation as formal challenge to a claim', async () => {
    // Alice claims a piece of jewelry was promised to her
    const aliceClaim = annotate(db, 'moms-ring', 'promised_to', 'Alice', siblingA, 1000);
    await db.persistDelta(aliceClaim);

    // Bob challenges: negates Alice's claim
    const challenge = db.negateDelta(siblingB, aliceClaim.id, 'No evidence of this promise');
    challenge.timestamp = 2000;
    await db.persistDelta(challenge);

    // Alice's claim is now negated
    const view = resolveEntity(db, 'moms-ring');
    expect(view.promised_to).toBeUndefined();

    // Alice provides counter-evidence, creating a new stronger claim
    const aliceReclaim = annotate(db, 'moms-ring', 'promised_to', 'Alice', siblingA, 3000);
    await db.persistDelta(aliceReclaim);
    await db.persistDelta(annotate(db, 'moms-ring', 'evidence',
      'Letter from Mom dated 2018-03-15', siblingA, 3000));

    // New claim stands
    const view2 = resolveEntity(db, 'moms-ring');
    expect(view2.promised_to).toBe('Alice');
    expect(view2.evidence).toBe('Letter from Mom dated 2018-03-15');
  });

  it('should support the mediator recording binding decisions', async () => {
    // Competing claims on three assets
    await db.persistDelta(annotate(db, 'lake-house', 'claimed_by', 'Alice', siblingA, 100));
    await db.persistDelta(annotate(db, 'lake-house', 'claimed_by', 'Bob', siblingB, 101));

    await db.persistDelta(annotate(db, 'family-business', 'claimed_by', 'Bob', siblingB, 100));
    await db.persistDelta(annotate(db, 'family-business', 'claimed_by', 'Carol', siblingC, 101));

    await db.persistDelta(annotate(db, 'art-collection', 'claimed_by', 'Alice', siblingA, 100));
    await db.persistDelta(annotate(db, 'art-collection', 'claimed_by', 'Carol', siblingC, 101));

    // Mediator records decisions
    await db.persistDelta(annotate(db, 'lake-house', 'awarded_to', 'Alice', mediator, 5000));
    await db.persistDelta(annotate(db, 'family-business', 'awarded_to', 'Bob', mediator, 5000));
    await db.persistDelta(annotate(db, 'art-collection', 'awarded_to', 'Carol', mediator, 5000));

    // Mediator decisions are accessible
    const lakeHouse = resolveEntity(db, 'lake-house');
    expect(lakeHouse.awarded_to).toBe('Alice');

    const business = resolveEntity(db, 'family-business');
    expect(business.awarded_to).toBe('Bob');

    const art = resolveEntity(db, 'art-collection');
    expect(art.awarded_to).toBe('Carol');

    // Original claims are still preserved alongside decisions
    const lhClaims = allValuesFor(db, 'lake-house', 'claimed_by');
    expect(lhClaims).toHaveLength(2);
  });

  it('should reconstruct the timeline of escalation', async () => {
    const t1 = 1000; // Initial filing
    const t2 = 2000; // Counter-claims
    const t3 = 3000; // Challenges
    const t4 = 4000; // Resolution

    // t1: Alice files initial claim
    await db.persistDelta(annotate(db, 'dispute', 'status', 'filed', siblingA, t1));
    await db.persistDelta(annotate(db, 'lake-house', 'claimed_by', 'Alice', siblingA, t1));

    // t2: Bob and Carol counter-claim
    await db.persistDelta(annotate(db, 'dispute', 'status', 'contested', siblingB, t2));
    await db.persistDelta(annotate(db, 'lake-house', 'claimed_by', 'Bob', siblingB, t2));
    await db.persistDelta(annotate(db, 'lake-house', 'claimed_by', 'Carol', siblingC, t2));

    // t3: Challenge period
    await db.persistDelta(annotate(db, 'dispute', 'status', 'under_review', mediator, t3));

    // t4: Resolution
    await db.persistDelta(annotate(db, 'dispute', 'status', 'resolved', mediator, t4));
    await db.persistDelta(annotate(db, 'lake-house', 'awarded_to', 'Alice', mediator, t4));

    // Timeline reconstruction
    const timeDB = enableTimeTravel(db);
    const disputeTimeline = timeDB.getObjectTimeline('dispute');
    expect(disputeTimeline).toEqual([t1, t2, t3, t4]);

    // At t1: only Alice's claim
    const claimsT1 = allValuesFor(db, 'lake-house', 'claimed_by', t1);
    expect(claimsT1).toEqual(['Alice']);

    // At t2: three claims
    const claimsT2 = allValuesFor(db, 'lake-house', 'claimed_by', t2);
    expect(claimsT2).toHaveLength(3);

    // At t4: resolution exists
    const resolution = resolveEntity(db, 'lake-house', t4);
    expect(resolution.awarded_to).toBe('Alice');
  });

  it('should distinguish claims by author for per-party views', async () => {
    // All three siblings make claims about multiple assets
    const assets = ['house', 'car', 'savings', 'jewelry'];
    for (const asset of assets) {
      await db.persistDelta(annotate(db, asset, 'value_claim', `${asset}-val-A`, siblingA));
      await db.persistDelta(annotate(db, asset, 'value_claim', `${asset}-val-B`, siblingB));
      await db.persistDelta(annotate(db, asset, 'value_claim', `${asset}-val-C`, siblingC));
    }

    // Filter deltas by author to get per-party view
    const allDeltas = db.queryDeltas({});
    const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];

    const aliceDeltas = deltasArray.filter(d => d.author === siblingA);
    const bobDeltas = deltasArray.filter(d => d.author === siblingB);

    // Alice made claims about all 4 assets
    expect(aliceDeltas.length).toBe(4);
    // Bob made claims about all 4 assets
    expect(bobDeltas.length).toBe(4);

    // Each asset has 3 competing claims
    for (const asset of assets) {
      const claims = allValuesFor(db, asset, 'value_claim');
      expect(claims).toHaveLength(3);
    }
  });
});
