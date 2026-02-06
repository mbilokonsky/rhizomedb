/**
 * Scenario 6: Personal Knowledge Graph
 *
 * A single person organizing their reading notes, project ideas, and daily observations.
 * One instance on their laptop. The rhizomatic structure mirrors how knowledge actually
 * connects -- not in folders, but in webs of association.
 *
 * Tests: basic CRUD, web of associations, time-travel for reflection,
 * querying the same data through different schemas.
 */

import {
  RhizomeDB,
  annotate,
  relate,
  resolveEntity,
  allValuesFor,
  relatedIds,
  buildHyperView,
  enableTimeTravel,
  TimeTravelDB,
  createStandardSchema,
  SchemaRegistry,
  constructHyperView,
  selectByTargetContext,
  HyperSchema,
  Delta
} from './helpers';

describe('Scenario 6: Personal Knowledge Graph', () => {
  let db: RhizomeDB;
  const author = 'mykola';

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory', systemId: 'laptop' });
  });

  it('should build a web of associations between books, concepts, and projects', async () => {
    // Add some books
    await db.persistDelta(annotate(db, 'book-1', 'title', 'A Thousand Plateaus', author));
    await db.persistDelta(annotate(db, 'book-2', 'title', 'Autopoiesis and Cognition', author));
    await db.persistDelta(annotate(db, 'book-3', 'title', 'The Timeless Way of Building', author));

    // Add concepts
    await db.persistDelta(annotate(db, 'concept-rhizome', 'name', 'Rhizome', author));
    await db.persistDelta(annotate(db, 'concept-autopoiesis', 'name', 'Autopoiesis', author));
    await db.persistDelta(annotate(db, 'concept-patterns', 'name', 'Pattern Language', author));

    // Link books to concepts
    await db.persistDelta(relate(db,
      'book', 'book-1', 'concepts',
      'concept', 'concept-rhizome', 'sources',
      author
    ));
    await db.persistDelta(relate(db,
      'book', 'book-2', 'concepts',
      'concept', 'concept-autopoiesis', 'sources',
      author
    ));
    await db.persistDelta(relate(db,
      'book', 'book-3', 'concepts',
      'concept', 'concept-patterns', 'sources',
      author
    ));

    // Cross-link concepts (rhizome connects to autopoiesis)
    await db.persistDelta(relate(db,
      'concept', 'concept-rhizome', 'related',
      'concept', 'concept-autopoiesis', 'related',
      author
    ));

    // Add a project that draws on concepts
    await db.persistDelta(annotate(db, 'project-1', 'name', 'RhizomeDB', author));
    await db.persistDelta(relate(db,
      'project', 'project-1', 'influences',
      'concept', 'concept-rhizome', 'projects',
      author
    ));
    await db.persistDelta(relate(db,
      'project', 'project-1', 'influences',
      'concept', 'concept-autopoiesis', 'projects',
      author
    ));

    // Query: what concepts does the project draw on?
    const projectInfluences = relatedIds(db, 'project-1', 'influences', 'concept');
    expect(projectInfluences).toContain('concept-rhizome');
    expect(projectInfluences).toContain('concept-autopoiesis');
    expect(projectInfluences).toHaveLength(2);

    // Query: what's related to the rhizome concept?
    const rhizomeRelated = relatedIds(db, 'concept-rhizome', 'related', 'concept');
    expect(rhizomeRelated).toContain('concept-autopoiesis');

    // Query: which books inform the rhizome concept?
    const rhizomeSources = relatedIds(db, 'concept-rhizome', 'sources', 'book');
    expect(rhizomeSources).toContain('book-1');

    // Verify entity properties
    const book1 = resolveEntity(db, 'book-1');
    expect(book1.title).toBe('A Thousand Plateaus');
  });

  it('should show how thinking evolved via time-travel', async () => {
    const t1 = 1000;
    const t2 = 2000;
    const t3 = 3000;

    // Week 1: reading about rhizomes, initial note
    const d1 = annotate(db, 'note-1', 'content', 'Rhizomes have no center', author, t1);
    await db.persistDelta(d1);
    const d1b = annotate(db, 'note-1', 'tag', 'philosophy', author, t1);
    await db.persistDelta(d1b);

    // Week 2: reading about CRDTs, connect the dots
    const d2 = annotate(db, 'note-2', 'content', 'CRDTs converge without coordination', author, t2);
    await db.persistDelta(d2);

    // Week 3: synthesis - connect rhizomes to CRDTs
    const d3 = annotate(db, 'note-3', 'content', 'What if CRDTs ARE rhizomes?', author, t3);
    await db.persistDelta(d3);
    const d3link = relate(db,
      'note', 'note-3', 'references',
      'note', 'note-1', 'referenced_by',
      author, t3
    );
    await db.persistDelta(d3link);
    const d3link2 = relate(db,
      'note', 'note-3', 'references',
      'note', 'note-2', 'referenced_by',
      author, t3
    );
    await db.persistDelta(d3link2);

    // Time-travel: at t1, only the first note exists
    const viewAtT1 = resolveEntity(db, 'note-1', t1);
    expect(viewAtT1.content).toBe('Rhizomes have no center');

    // The synthesis note doesn't exist yet at t1
    const synthAtT1 = resolveEntity(db, 'note-3', t1);
    expect(synthAtT1.content).toBeUndefined();

    // At t3, the synthesis references both earlier notes
    const synthRefs = relatedIds(db, 'note-3', 'references', 'note');
    expect(synthRefs).toContain('note-1');
    expect(synthRefs).toContain('note-2');

    // TimeTravelDB: replay the evolution
    const timeDB = enableTimeTravel(db);
    const timeline = timeDB.getObjectTimeline('note-3');
    // Content delta targets note-3. The relate() deltas target note-3 via 'references'
    // context, so they also appear. But timestamps are deduplicated since all are t3.
    expect(timeline.length).toBeGreaterThanOrEqual(1);
    expect(timeline).toContain(t3);
  });

  it('should query the same data through different schemas', async () => {
    // A book with multiple facets
    await db.persistDelta(annotate(db, 'book-x', 'title', 'Godel Escher Bach', author));
    await db.persistDelta(annotate(db, 'book-x', 'topic', 'consciousness', author));
    await db.persistDelta(annotate(db, 'book-x', 'topic', 'recursion', author));
    await db.persistDelta(annotate(db, 'book-x', 'year', 1979, author));
    await db.persistDelta(annotate(db, 'book-x', 'rating', 5, author));

    // Schema 1: bibliographic (title + year)
    const biblioSchema: HyperSchema = {
      id: 'biblio',
      name: 'Bibliographic',
      select: (objectId, delta) => {
        const props: string[] = [];
        for (const p of delta.pointers) {
          if (typeof p.target === 'object' && 'id' in p.target &&
              p.target.id === objectId && p.target.context &&
              ['title', 'year'].includes(p.target.context)) {
            props.push(p.target.context);
          }
        }
        return props.length > 0 ? props : false;
      },
      transform: {}
    };

    // Schema 2: topical (topics only)
    const topicSchema: HyperSchema = {
      id: 'topic',
      name: 'Topical',
      select: (objectId, delta) => {
        const props: string[] = [];
        for (const p of delta.pointers) {
          if (typeof p.target === 'object' && 'id' in p.target &&
              p.target.id === objectId && p.target.context === 'topic') {
            props.push('topic');
          }
        }
        return props.length > 0 ? props : false;
      },
      transform: {}
    };

    const biblioView = buildHyperView(db, 'book-x', biblioSchema);
    const topicView = buildHyperView(db, 'book-x', topicSchema);

    // Biblio view has title and year, but not topic or rating
    expect(biblioView.title).toBeDefined();
    expect(biblioView.year).toBeDefined();
    expect(biblioView.topic).toBeUndefined();
    expect(biblioView.rating).toBeUndefined();

    // Topic view has topics, but not title/year/rating
    expect(topicView.topic).toBeDefined();
    expect((topicView.topic as Delta[]).length).toBe(2); // two topic deltas
    expect(topicView.title).toBeUndefined();
    expect(topicView.year).toBeUndefined();
  });

  it('should support revising a note (negation + new assertion)', async () => {
    // Initial thought
    const original = annotate(db, 'note-x', 'content',
      'CRDTs need a central coordinator', author, 1000);
    await db.persistDelta(original);

    // Later: realize this was wrong, negate and replace
    const negation = db.negateDelta(author, original.id, 'Was thinking of Paxos, not CRDTs');
    negation.timestamp = 2000;
    await db.persistDelta(negation);

    const correction = annotate(db, 'note-x', 'content',
      'CRDTs converge WITHOUT a central coordinator', author, 2000);
    await db.persistDelta(correction);

    // Current view shows the correction
    const view = resolveEntity(db, 'note-x');
    expect(view.content).toBe('CRDTs converge WITHOUT a central coordinator');

    // Time-travel shows the original was there
    const pastView = resolveEntity(db, 'note-x', 1500);
    expect(pastView.content).toBe('CRDTs need a central coordinator');
  });
});
