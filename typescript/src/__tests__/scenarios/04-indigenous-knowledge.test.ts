/**
 * Scenario 4: Indigenous Oral History and Land Rights Documentation
 *
 * Elders' testimonies recorded as deltas. Each story references landmarks,
 * seasonal patterns, family lineages, and spiritual practices. The legal team's
 * schema extracts only what's admissible. The community's schema preserves full
 * cultural context. Two legitimate views of the same underlying data.
 *
 * Tests: different schemas producing different views, delta atomicity decisions,
 * provenance attribution to elders, selective filtering for legal admissibility.
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
  relatedIds,
  buildHyperView,
  resolveHyperView,
  mostRecent,
  firstWrite,
  trustedAuthor
} from './helpers';

describe('Scenario 4: Indigenous Oral History and Land Rights', () => {
  let db: RhizomeDB;
  const elderMary = 'elder-mary';
  const elderJohn = 'elder-john';
  const researcher = 'community-researcher';
  const lawyer = 'legal-team';

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory', systemId: 'community-archive' });
  });

  it('should record oral histories with full elder provenance', async () => {
    // Elder Mary shares a fishing story tied to a specific landmark
    await db.persistDelta(annotate(db, 'story-1', 'narrator', 'Elder Mary Whitehawk', elderMary));
    await db.persistDelta(annotate(db, 'story-1', 'content',
      'My grandmother fished at the bend of the river every spring when the salmon returned', elderMary));
    await db.persistDelta(annotate(db, 'story-1', 'season', 'spring', elderMary));
    await db.persistDelta(relate(db,
      'story', 'story-1', 'locations',
      'landmark', 'river-bend', 'stories',
      elderMary
    ));

    // Elder John shares a complementary story about the same landmark
    await db.persistDelta(annotate(db, 'story-2', 'narrator', 'Elder John Clearsky', elderJohn));
    await db.persistDelta(annotate(db, 'story-2', 'content',
      'The river bend is where we held the spring ceremony before the fishing season', elderJohn));
    await db.persistDelta(relate(db,
      'story', 'story-2', 'locations',
      'landmark', 'river-bend', 'stories',
      elderJohn
    ));

    // Both stories reference the same landmark
    const riverBendStories = relatedIds(db, 'river-bend', 'stories', 'story');
    expect(riverBendStories).toContain('story-1');
    expect(riverBendStories).toContain('story-2');

    // Provenance: each story traces to a specific elder
    const story1Deltas = db.queryDeltas({ targetIds: ['story-1'] });
    const s1Array = Array.isArray(story1Deltas) ? story1Deltas : [];
    expect(s1Array.every(d => d.author === elderMary)).toBe(true);

    const story2Deltas = db.queryDeltas({ targetIds: ['story-2'] });
    const s2Array = Array.isArray(story2Deltas) ? story2Deltas : [];
    expect(s2Array.every(d => d.author === elderJohn)).toBe(true);
  });

  it('should produce different views for community vs. legal schemas', async () => {
    // A story with both practical and ceremonial significance
    await db.persistDelta(annotate(db, 'site-eagle-ridge', 'land_use', 'hunting grounds', elderMary));
    await db.persistDelta(annotate(db, 'site-eagle-ridge', 'seasonal_pattern',
      'Used from late summer through fall for elk hunting', elderMary));
    await db.persistDelta(annotate(db, 'site-eagle-ridge', 'ceremonial_significance',
      'Vision quest site for coming-of-age ceremonies', elderMary));
    await db.persistDelta(annotate(db, 'site-eagle-ridge', 'spiritual_beings',
      'Home of the Eagle Spirit who watches over the valley', elderMary));
    await db.persistDelta(annotate(db, 'site-eagle-ridge', 'access_period',
      'Since time immemorial, at least 10 generations', elderMary));

    // Legal schema: only land use patterns, seasonal access, and time period
    // (excludes ceremonial and spiritual content)
    const legalSchema: HyperSchema = {
      id: 'legal-evidence',
      name: 'Legal Evidence',
      select: (objectId, delta) => {
        const admissibleContexts = ['land_use', 'seasonal_pattern', 'access_period'];
        const props: string[] = [];
        for (const p of delta.pointers) {
          if (typeof p.target === 'object' && 'id' in p.target &&
              p.target.id === objectId && p.target.context &&
              admissibleContexts.includes(p.target.context)) {
            props.push(p.target.context);
          }
        }
        return props.length > 0 ? props : false;
      },
      transform: {}
    };

    // Community schema: everything
    const communitySchema: HyperSchema = {
      id: 'community-full',
      name: 'Community Record',
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

    const legalView = buildHyperView(db, 'site-eagle-ridge', legalSchema);
    const communityView = buildHyperView(db, 'site-eagle-ridge', communitySchema);

    // Legal view: practical land-use evidence only
    expect(legalView.land_use).toBeDefined();
    expect(legalView.seasonal_pattern).toBeDefined();
    expect(legalView.access_period).toBeDefined();
    expect(legalView.ceremonial_significance).toBeUndefined();
    expect(legalView.spiritual_beings).toBeUndefined();

    // Community view: full cultural context preserved
    expect(communityView.land_use).toBeDefined();
    expect(communityView.seasonal_pattern).toBeDefined();
    expect(communityView.access_period).toBeDefined();
    expect(communityView.ceremonial_significance).toBeDefined();
    expect(communityView.spiritual_beings).toBeDefined();
  });

  it('should model interconnected cultural-practical knowledge as atomic deltas', async () => {
    // A single delta that captures inseparable cultural-practical knowledge:
    // the fishing technique, the season, and the ceremony are one unified assertion
    const atomicStory = db.createDelta(elderMary, [
      { role: 'about', target: { id: 'practice-spring-fishing', context: 'tradition' } },
      { role: 'technique', target: 'Net fishing at the river bend' },
      { role: 'season', target: 'When the first eagle returns' },
      { role: 'ceremony', target: 'Opening prayer to the salmon people' }
    ]);
    await db.persistDelta(atomicStory);

    // This is atomic: you can't negate the ceremony without also negating
    // the technique and season. They are one inseparable assertion.
    const negation = db.negateDelta(researcher, atomicStory.id,
      'Elder Mary wants to restrict ceremonial details');
    await db.persistDelta(negation);

    // ALL information in the delta is now negated
    const view = resolveEntity(db, 'practice-spring-fishing');
    expect(view.technique).toBeUndefined();
    expect(view.season).toBeUndefined();
    expect(view.ceremony).toBeUndefined();
  });

  it('should support elder revision of stories (firstWrite preserves original)', async () => {
    // Elder Mary tells a story in 2020
    await db.persistDelta(annotate(db, 'story-fish', 'content',
      'The salmon come when the dogwood blooms', elderMary, 1000));

    // In 2023, Elder Mary refines the story
    await db.persistDelta(annotate(db, 'story-fish', 'content',
      'The salmon come when the dogwood blooms and the river temperature rises', elderMary, 2000));

    // mostRecent: shows the refined version
    const currentView = resolveEntity(db, 'story-fish');
    expect(currentView.content).toContain('river temperature');

    // firstWrite: preserves the original telling
    const originalView = resolveEntityWith(db, 'story-fish', firstWrite);
    expect(originalView.content).toBe('The salmon come when the dogwood blooms');

    // Both versions preserved
    const allVersions = allValuesFor(db, 'story-fish', 'content');
    expect(allVersions).toHaveLength(2);
  });

  it('should link multiple elders testimony about the same place', async () => {
    // Multiple elders describe the same location, building a richer picture
    await db.persistDelta(annotate(db, 'cedar-grove', 'description',
      'Where we gather bark for canoes', elderMary));
    await db.persistDelta(annotate(db, 'cedar-grove', 'description',
      'The oldest cedar is 800 years old, my grandfather measured it', elderJohn));
    await db.persistDelta(annotate(db, 'cedar-grove', 'description',
      'Three families have traditional rights to gather here', researcher));

    // All three descriptions coexist
    const descriptions = allValuesFor(db, 'cedar-grove', 'description');
    expect(descriptions).toHaveLength(3);

    // Elder testimony gets priority in trusted-author resolution
    const elderView = resolveEntityWith(db, 'cedar-grove',
      trustedAuthor([elderMary, elderJohn, researcher]));
    expect(elderView.description).toContain('canoes'); // Mary's version wins

    // But the researcher's documentation is also preserved
    expect(descriptions.some(d =>
      typeof d === 'string' && d.includes('Three families')
    )).toBe(true);
  });
});
