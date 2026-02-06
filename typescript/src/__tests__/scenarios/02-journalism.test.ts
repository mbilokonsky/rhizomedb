/**
 * Scenario 2: Cross-Border Investigative Journalism
 *
 * A consortium of journalists in five countries investigating arms trafficking.
 * Selective federation with push/pull filters. Each newsroom controls its
 * exposure. Append-only proves chain of custody.
 *
 * Tests: selective federation, trust policies, provenance preservation,
 * different schemas per newsroom, append-only evidence chain.
 */

jest.setTimeout(15000);

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
  mostRecent,
  trustedAuthor,
  createFederatedInstance,
  teardownInstance,
  connectInstances,
  waitFor,
  countEntityDeltas,
  TestInstance
} from './helpers';

describe('Scenario 2: Cross-Border Investigative Journalism', () => {
  let newsroomA: TestInstance; // Lagos
  let newsroomB: TestInstance; // Berlin

  beforeEach(async () => {
    newsroomA = await createFederatedInstance('newsroom-lagos');
    newsroomB = await createFederatedInstance('newsroom-berlin');
  });

  afterEach(async () => {
    await teardownInstance(newsroomB);
    await teardownInstance(newsroomA);
  });

  it('should federate shared evidence between newsrooms', async () => {
    await connectInstances(newsroomA, newsroomB);

    // Lagos journalist documents a shell company
    const lagosJournalist = 'journalist-adaeze';
    await newsroomA.db.persistDelta(annotate(newsroomA.db,
      'company-shell-1', 'name', 'Apex Trading Ltd', lagosJournalist));
    await newsroomA.db.persistDelta(annotate(newsroomA.db,
      'company-shell-1', 'jurisdiction', 'British Virgin Islands', lagosJournalist));
    await newsroomA.db.persistDelta(annotate(newsroomA.db,
      'company-shell-1', 'connected_to', 'arms shipment to conflict zone', lagosJournalist));

    // Wait for sync
    await waitFor(() => countEntityDeltas(newsroomB.db, 'company-shell-1') >= 3);

    // Berlin sees the evidence with full provenance
    const view = resolveEntity(newsroomB.db, 'company-shell-1');
    expect(view.name).toBe('Apex Trading Ltd');
    expect(view.jurisdiction).toBe('British Virgin Islands');

    // Berlin can verify the source
    const deltas = newsroomB.db.queryDeltas({ targetIds: ['company-shell-1'] });
    const deltasArray = Array.isArray(deltas) ? deltas : [];
    expect(deltasArray.every(d => d.author === lagosJournalist)).toBe(true);
    expect(deltasArray.every(d => d.system === 'newsroom-lagos')).toBe(true);
  });

  it('should build a network of connections across jurisdictions', async () => {
    // Use single DB to test graph structure (federation tested above)
    const db = newsroomA.db;
    const journalist = 'journalist-team';

    // Create entities
    await db.persistDelta(annotate(db, 'person-oligarch', 'name', 'Viktor M.', journalist));
    await db.persistDelta(annotate(db, 'company-defense', 'name', 'Eurodefense GmbH', journalist));
    await db.persistDelta(annotate(db, 'company-shell', 'name', 'Apex Trading Ltd', journalist));
    await db.persistDelta(annotate(db, 'shipment-001', 'contents', 'military equipment', journalist));

    // Build the connection graph
    await db.persistDelta(relate(db,
      'person', 'person-oligarch', 'owns',
      'company', 'company-defense', 'owned_by', journalist));
    await db.persistDelta(relate(db,
      'company', 'company-defense', 'subsidiaries',
      'company', 'company-shell', 'parent_company', journalist));
    await db.persistDelta(relate(db,
      'company', 'company-shell', 'shipments',
      'shipment', 'shipment-001', 'shipper', journalist));

    // Trace the network
    const oligarchCompanies = relatedIds(db, 'person-oligarch', 'owns', 'company');
    expect(oligarchCompanies).toContain('company-defense');

    const subsidiaries = relatedIds(db, 'company-defense', 'subsidiaries', 'company');
    expect(subsidiaries).toContain('company-shell');

    const shipments = relatedIds(db, 'company-shell', 'shipments', 'shipment');
    expect(shipments).toContain('shipment-001');

    // The chain: oligarch -> defense company -> shell company -> arms shipment
  });

  it('should preserve the chain of custody for evidence', async () => {
    const db = newsroomA.db;
    const t1 = 1000;
    const t2 = 2000;
    const t3 = 3000;

    // First journalist discovers a document
    await db.persistDelta(annotate(db, 'doc-001', 'type', 'financial_transfer', 'journalist-1', t1));
    await db.persistDelta(annotate(db, 'doc-001', 'description',
      'Wire transfer of $2.3M from shell company to arms dealer', 'journalist-1', t1));

    // Second journalist corroborates with a different source
    await db.persistDelta(annotate(db, 'doc-001', 'corroboration',
      'Bank records independently confirm the transfer', 'journalist-2', t2));

    // Third journalist adds context
    await db.persistDelta(annotate(db, 'doc-001', 'context',
      'Transfer date coincides with known arms delivery to conflict zone', 'journalist-3', t3));

    // Full picture with all journalists' contributions
    const view = resolveEntity(db, 'doc-001');
    expect(view.type).toBe('financial_transfer');
    expect(view.corroboration).toContain('Bank records');
    expect(view.context).toContain('conflict zone');

    // Each contribution traceable to its journalist
    const deltas = db.queryDeltas({ targetIds: ['doc-001'] });
    const deltasArray = Array.isArray(deltas) ? deltas : [];
    const authors = new Set(deltasArray.map(d => d.author));
    expect(authors.size).toBe(3);
    expect(authors.has('journalist-1')).toBe(true);
    expect(authors.has('journalist-2')).toBe(true);
    expect(authors.has('journalist-3')).toBe(true);
  });

  it('should support different editorial schemas per newsroom', async () => {
    const db = newsroomA.db;

    // Rich evidence record
    await db.persistDelta(annotate(db, 'investigation', 'headline',
      'Oligarch Network Funnels Arms to Conflict Zone', 'editor'));
    await db.persistDelta(annotate(db, 'investigation', 'sources_count', 14, 'editor'));
    await db.persistDelta(annotate(db, 'investigation', 'legal_review', 'approved', 'legal-team'));
    await db.persistDelta(annotate(db, 'investigation', 'source_names',
      'Confidential - DO NOT PUBLISH', 'editor'));
    await db.persistDelta(annotate(db, 'investigation', 'publish_date', '2024-06-01', 'editor'));

    // Published schema: excludes confidential source information
    const publishedSchema: HyperSchema = {
      id: 'published',
      name: 'Published View',
      select: (objectId, delta) => {
        const excludedContexts = ['source_names'];
        const props: string[] = [];
        for (const p of delta.pointers) {
          if (typeof p.target === 'object' && 'id' in p.target &&
              p.target.id === objectId && p.target.context &&
              !excludedContexts.includes(p.target.context)) {
            props.push(p.target.context);
          }
        }
        return props.length > 0 ? props : false;
      },
      transform: {}
    };

    // Internal schema: everything
    const internalSchema: HyperSchema = {
      id: 'internal',
      name: 'Internal View',
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

    const publishedView = buildHyperView(db, 'investigation', publishedSchema);
    const internalView = buildHyperView(db, 'investigation', internalSchema);

    // Published view: no source names
    expect(publishedView.headline).toBeDefined();
    expect(publishedView.legal_review).toBeDefined();
    expect(publishedView.source_names).toBeUndefined();

    // Internal view: everything including source names
    expect(internalView.headline).toBeDefined();
    expect(internalView.source_names).toBeDefined();
  });
});
