/**
 * Graph Analysis Queries
 *
 * Composable query patterns for knowledge graph analysis.
 * These compose the primitive operations (entitiesOfType, relatedIds, resolve)
 * into research-useful higher-level queries.
 */

import { RhizomeDB } from '../storage/instance';

/**
 * Count how many independent papers support a claim about an entity.
 * Returns the set of source paper IDs.
 */
export function sourcePapersFor(db: RhizomeDB, entityId: string): Set<string> {
  const claims = db.relatedIds(entityId, 'claims_about', 'claim');
  const papers = new Set<string>();
  for (const claim of claims) {
    const claimPapers = db.relatedIds(claim, 'source_paper', 'source');
    for (const p of claimPapers) papers.add(p);
  }
  return papers;
}

/**
 * Calculate a consensus score for claims about an entity.
 * Higher score = more independent research groups support the claims.
 *
 * Factors in:
 * - Number of independent papers
 * - Evidence quality (clinical_trial > cohort > review)
 * - Geographic diversity of institutions
 */
export function consensusScore(db: RhizomeDB, entityId: string): {
  paperCount: number;
  weightedScore: number;
  countries: string[];
  studyTypes: string[];
} {
  const evidenceWeights: Record<string, number> = {
    'clinical_trial': 3,
    'cohort': 2,
    'review': 1,
  };

  const papers = sourcePapersFor(db, entityId);
  let weightedScore = 0;
  const countries = new Set<string>();
  const studyTypes = new Set<string>();

  for (const paperId of papers) {
    const paper = db.resolve(paperId);
    const studyType = (paper.study_type as string) || 'unspecified';
    studyTypes.add(studyType);
    weightedScore += evidenceWeights[studyType] || 1;

    // Trace paper → authors → institutions → country
    const authors = db.relatedIds(paperId, 'authors', 'author');
    for (const author of authors) {
      const affiliations = db.relatedIds(author, 'affiliations', 'member');
      for (const instId of affiliations) {
        const inst = db.resolve(instId);
        if (inst.country) countries.add(inst.country as string);
      }
    }
  }

  return {
    paperCount: papers.size,
    weightedScore,
    countries: Array.from(countries),
    studyTypes: Array.from(studyTypes),
  };
}

/**
 * Find all claims about an entity, including claims about its sub-entities
 * (e.g., species-level claims when querying at genus level).
 */
export function claimsIncludingSubEntities(
  db: RhizomeDB,
  entityId: string,
  childProperty: string,
  childRole: string
): string[] {
  const directClaims = db.relatedIds(entityId, 'claims_about', 'claim');
  const children = db.relatedIds(entityId, childProperty, childRole);

  const allClaims = new Set(directClaims);
  for (const child of children) {
    const childClaims = db.relatedIds(child, 'claims_about', 'claim');
    for (const c of childClaims) allClaims.add(c);
  }

  return Array.from(allClaims);
}

/**
 * Build a full evidence chain for a connection between two entities.
 * Returns all claims that mention BOTH entities, with full provenance.
 */
export function evidenceChain(
  db: RhizomeDB,
  entityA: string,
  entityB: string
): {
  claim: string;
  statement: string;
  paper: string;
  journal: string;
  year: number;
  studyType: string;
  authors: string[];
}[] {
  const claimsA = new Set(db.relatedIds(entityA, 'claims_about', 'claim'));
  const claimsB = db.relatedIds(entityB, 'claims_about', 'claim');

  const shared = claimsB.filter(c => claimsA.has(c));

  return shared.map(claimId => {
    const claimResolved = db.resolve(claimId);
    const papers = db.relatedIds(claimId, 'source_paper', 'source');
    const paper = papers.length > 0 ? db.resolve(papers[0]) : { title: '', journal: '', year: 0, study_type: '' };
    const authorIds = papers.length > 0 ? db.relatedIds(papers[0], 'authors', 'author') : [];
    const authorNames = authorIds.map(a => db.resolve(a).name as string);

    return {
      claim: claimId,
      statement: (claimResolved.statement as string) || '',
      paper: (paper.title as string) || '',
      journal: (paper.journal as string) || '',
      year: (paper.year as number) || 0,
      studyType: (paper.study_type as string) || 'unspecified',
      authors: authorNames,
    };
  });
}

/**
 * Rank entities of a given type by how many claims they're involved in.
 */
export function rankByClaimCount(
  db: RhizomeDB,
  entityType: string
): { id: string; name: string; claimCount: number; paperCount: number }[] {
  const entities = db.entitiesOfType(entityType);

  const rankings = entities.map(entityId => {
    const claims = db.relatedIds(entityId, 'claims_about', 'claim');
    const papers = sourcePapersFor(db, entityId);
    const resolved = db.resolve(entityId);

    return {
      id: entityId,
      name: (resolved.name as string) || entityId,
      claimCount: claims.length,
      paperCount: papers.size,
    };
  }).filter(r => r.claimCount > 0);

  rankings.sort((a, b) => b.claimCount - a.claimCount);
  return rankings;
}

/**
 * Find entities that appear together in claims frequently (co-occurrence).
 * Returns pairs of entities and their co-occurrence count.
 */
export function coOccurrence(
  db: RhizomeDB,
  entityType: string,
  claimRelation: string,
  claimRole: string
): { entityA: string; entityB: string; nameA: string; nameB: string; sharedClaims: number }[] {
  const entities = db.entitiesOfType(entityType);

  // Build entity → claims map
  const entityClaims = new Map<string, Set<string>>();
  for (const entityId of entities) {
    const claims = db.relatedIds(entityId, claimRelation, claimRole);
    if (claims.length > 0) {
      entityClaims.set(entityId, new Set(claims));
    }
  }

  // Find pairs with shared claims
  const pairs: { entityA: string; entityB: string; nameA: string; nameB: string; sharedClaims: number }[] = [];
  const entityList = Array.from(entityClaims.keys());

  for (let i = 0; i < entityList.length; i++) {
    for (let j = i + 1; j < entityList.length; j++) {
      const a = entityList[i];
      const b = entityList[j];
      const claimsA = entityClaims.get(a)!;
      const claimsB = entityClaims.get(b)!;

      let shared = 0;
      for (const c of claimsA) {
        if (claimsB.has(c)) shared++;
      }

      if (shared > 0) {
        pairs.push({
          entityA: a,
          entityB: b,
          nameA: (db.resolve(a).name as string) || a,
          nameB: (db.resolve(b).name as string) || b,
          sharedClaims: shared,
        });
      }
    }
  }

  pairs.sort((a, b) => b.sharedClaims - a.sharedClaims);
  return pairs;
}

type DirectionEntry = { claim: string; statement: string; paper: string; year: number; studyType: string };

/**
 * Find contradictions: cases where different papers make opposing claims
 * about the same entity-condition pair. Looks for direction annotations
 * (e.g., 'increased_in_disease' vs 'decreased_in_disease' vs 'no_effect').
 *
 * A null result (no_effect) from a clinical trial contradicts a positive
 * animal study finding — the contradiction categories reflect this.
 */
export function findContradictions(
  db: RhizomeDB,
  entityType: string,
  conditionType: string
): {
  entity: string;
  entityName: string;
  condition: string;
  conditionName: string;
  increased: DirectionEntry[];
  decreased: DirectionEntry[];
  noEffect: DirectionEntry[];
}[] {
  const entities = db.entitiesOfType(entityType);
  const conditions = db.entitiesOfType(conditionType);
  const contradictions: ReturnType<typeof findContradictions> = [];

  for (const entityId of entities) {
    const entityClaims = db.relatedIds(entityId, 'claims_about', 'claim');
    if (entityClaims.length === 0) continue;

    for (const condId of conditions) {
      const condClaims = new Set(db.relatedIds(condId, 'claims_about', 'claim'));

      // Find claims that mention BOTH this entity and this condition
      const sharedClaims = entityClaims.filter(c => condClaims.has(c));
      if (sharedClaims.length < 2) continue;

      const increased: DirectionEntry[] = [];
      const decreased: DirectionEntry[] = [];
      const noEffect: DirectionEntry[] = [];

      for (const claimId of sharedClaims) {
        const resolved = db.resolve(claimId);
        const direction = resolved.direction as string | undefined;
        if (!direction) continue;

        const papers = db.relatedIds(claimId, 'source_paper', 'source');
        const paper = papers.length > 0 ? db.resolve(papers[0]) : { title: '', year: 0, study_type: '' };

        const entry: DirectionEntry = {
          claim: claimId,
          statement: (resolved.statement as string) || '',
          paper: (paper.title as string) || '',
          year: (paper.year as number) || 0,
          studyType: (paper.study_type as string) || 'unspecified',
        };

        if (direction === 'increased_in_disease' || direction === 'increased_in_treatment') {
          increased.push(entry);
        } else if (direction === 'decreased_in_disease') {
          decreased.push(entry);
        } else if (direction === 'no_effect') {
          noEffect.push(entry);
        }
      }

      // Report if there are claims in multiple directions
      const categories = [increased.length > 0, decreased.length > 0, noEffect.length > 0].filter(Boolean).length;
      if (categories >= 2) {
        contradictions.push({
          entity: entityId,
          entityName: (db.resolve(entityId).name as string) || entityId,
          condition: condId,
          conditionName: (db.resolve(condId).name as string) || condId,
          increased,
          decreased,
          noEffect,
        });
      }
    }
  }

  return contradictions;
}

/**
 * Build a temporal trajectory for an entity: how understanding evolves over time.
 * Returns claims organized by year with full provenance.
 */
export function temporalTrajectory(
  db: RhizomeDB,
  entityId: string
): {
  year: number;
  claims: {
    statement: string;
    direction?: string;
    paper: string;
    journal: string;
    studyType: string;
    conditions: string[];
  }[];
}[] {
  const claims = db.relatedIds(entityId, 'claims_about', 'claim');

  const byYear = new Map<number, {
    statement: string;
    direction?: string;
    paper: string;
    journal: string;
    studyType: string;
    conditions: string[];
  }[]>();

  for (const claimId of claims) {
    const resolved = db.resolve(claimId);
    const papers = db.relatedIds(claimId, 'source_paper', 'source');
    if (papers.length === 0) continue;

    const paper = db.resolve(papers[0]);
    const year = (paper.year as number) || 0;
    if (year === 0) continue;

    const condIds = db.relatedIds(claimId, 'conditions', 'subject');
    const condNames = condIds.map(c => (db.resolve(c).name as string) || c);

    const entry = {
      statement: (resolved.statement as string) || '',
      direction: resolved.direction as string | undefined,
      paper: (paper.title as string) || '',
      journal: (paper.journal as string) || '',
      studyType: (paper.study_type as string) || 'unspecified',
      conditions: condNames,
    };

    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(entry);
  }

  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, claims]) => ({ year, claims }));
}

/**
 * Find multi-hop pathways between two entities through the knowledge graph.
 *
 * Example: pathwayBetween(db, 'bacterium:lactobacillus', 'condition:major-depressive-disorder')
 * might return: Lactobacillus → produces → GABA → [via claim] → Depression
 *
 * Traversal strategy: BFS through claim co-mentions and production relationships.
 * A "hop" is either:
 *   - Two entities mentioned in the same claim (claim co-mention)
 *   - A producer→product relationship (metabolite production)
 */
export function pathwayBetween(
  db: RhizomeDB,
  startEntity: string,
  endEntity: string,
  maxHops: number = 4,
  maxResults: number = 20
): { path: { entity: string; name: string; type: string }[]; claims: string[] }[] {
  type PathNode = { entity: string; name: string; type: string };
  type PathState = {
    entity: string;
    path: PathNode[];
    claims: string[];
    visited: Set<string>;
  };

  // Pre-compute adjacency: entity → [{neighbor, claim?}]
  // This avoids repeated relatedIds calls during BFS
  const adjacency = new Map<string, { entity: string; claim: string | null }[]>();

  function ensureAdjacency(entityId: string): { entity: string; claim: string | null }[] {
    if (adjacency.has(entityId)) return adjacency.get(entityId)!;

    const neighbors: { entity: string; claim: string | null }[] = [];
    const seen = new Set<string>();

    // Claim co-mentions
    const claims = db.relatedIds(entityId, 'claims_about', 'claim');
    for (const claimId of claims) {
      for (const rel of ['bacteria', 'metabolites', 'mechanisms', 'conditions']) {
        const subjects = db.relatedIds(claimId, rel, 'subject');
        for (const s of subjects) {
          if (s !== entityId && !seen.has(s)) {
            seen.add(s);
            neighbors.push({ entity: s, claim: claimId });
          }
        }
      }
    }

    // Production relationships
    for (const product of db.relatedIds(entityId, 'produces', 'product')) {
      if (!seen.has(product)) {
        seen.add(product);
        neighbors.push({ entity: product, claim: null });
      }
    }
    for (const producer of db.relatedIds(entityId, 'produced_by', 'producer')) {
      if (!seen.has(producer)) {
        seen.add(producer);
        neighbors.push({ entity: producer, claim: null });
      }
    }

    adjacency.set(entityId, neighbors);
    return neighbors;
  }

  // Resolve entity metadata (cached)
  const resolveCache = new Map<string, PathNode>();
  function resolveNode(entityId: string): PathNode {
    if (resolveCache.has(entityId)) return resolveCache.get(entityId)!;
    const resolved = db.resolve(entityId);
    const node = {
      entity: entityId,
      name: (resolved.name as string) || entityId,
      type: (resolved.type as string) || 'unknown',
    };
    resolveCache.set(entityId, node);
    return node;
  }

  const results: { path: PathNode[]; claims: string[] }[] = [];

  const queue: PathState[] = [{
    entity: startEntity,
    path: [resolveNode(startEntity)],
    claims: [],
    visited: new Set([startEntity]),
  }];

  while (queue.length > 0 && results.length < maxResults) {
    const current = queue.shift()!;
    if (current.path.length > maxHops) continue;

    const neighbors = ensureAdjacency(current.entity);
    for (const { entity: neighbor, claim } of neighbors) {
      if (current.visited.has(neighbor)) continue;
      if (results.length >= maxResults) break;

      const node = resolveNode(neighbor);
      const newPath = [...current.path, node];
      const newClaims = claim ? [...current.claims, claim] : [...current.claims];

      if (neighbor === endEntity) {
        results.push({ path: newPath, claims: newClaims });
        continue;
      }

      if (newPath.length < maxHops) {
        const newVisited = new Set(current.visited);
        newVisited.add(neighbor);
        queue.push({ entity: neighbor, path: newPath, claims: newClaims, visited: newVisited });
      }
    }
  }

  results.sort((a, b) => a.path.length - b.path.length);
  return results;
}

/**
 * Find the research collaboration network: which researchers share papers,
 * and which institutions collaborate.
 */
export function researcherNetwork(db: RhizomeDB): {
  collaborations: { researcherA: string; researcherB: string; nameA: string; nameB: string; sharedPapers: number }[];
  institutionLinks: { instA: string; instB: string; nameA: string; nameB: string; sharedPapers: number }[];
} {
  const papers = db.entitiesOfType('paper');
  const researcherPairs = new Map<string, { a: string; b: string; nameA: string; nameB: string; count: number }>();
  const instPairs = new Map<string, { a: string; b: string; nameA: string; nameB: string; count: number }>();

  for (const paperId of papers) {
    const authors = db.relatedIds(paperId, 'authors', 'author');

    // Researcher collaborations within a paper
    for (let i = 0; i < authors.length; i++) {
      for (let j = i + 1; j < authors.length; j++) {
        const [a, b] = authors[i] < authors[j] ? [authors[i], authors[j]] : [authors[j], authors[i]];
        const key = `${a}|${b}`;
        if (!researcherPairs.has(key)) {
          researcherPairs.set(key, {
            a, b,
            nameA: (db.resolve(a).name as string) || a,
            nameB: (db.resolve(b).name as string) || b,
            count: 0,
          });
        }
        researcherPairs.get(key)!.count++;
      }
    }

    // Institution collaborations: unique institutions per paper
    const paperInsts = new Set<string>();
    for (const author of authors) {
      const affiliations = db.relatedIds(author, 'affiliations', 'member');
      for (const inst of affiliations) paperInsts.add(inst);
    }
    const instList = Array.from(paperInsts);
    for (let i = 0; i < instList.length; i++) {
      for (let j = i + 1; j < instList.length; j++) {
        const [a, b] = instList[i] < instList[j] ? [instList[i], instList[j]] : [instList[j], instList[i]];
        const key = `${a}|${b}`;
        if (!instPairs.has(key)) {
          instPairs.set(key, {
            a, b,
            nameA: (db.resolve(a).name as string) || a,
            nameB: (db.resolve(b).name as string) || b,
            count: 0,
          });
        }
        instPairs.get(key)!.count++;
      }
    }
  }

  const collaborations = Array.from(researcherPairs.values())
    .map(p => ({ researcherA: p.a, researcherB: p.b, nameA: p.nameA, nameB: p.nameB, sharedPapers: p.count }))
    .sort((a, b) => b.sharedPapers - a.sharedPapers);

  const institutionLinks = Array.from(instPairs.values())
    .map(p => ({ instA: p.a, instB: p.b, nameA: p.nameA, nameB: p.nameB, sharedPapers: p.count }))
    .sort((a, b) => b.sharedPapers - a.sharedPapers);

  return { collaborations, institutionLinks };
}

/**
 * Find novel connections: entity pairs that are linked through the graph
 * (via shared claims or production relationships) but never appear together
 * in any single paper. These are insights the knowledge graph reveals that
 * no individual paper states.
 *
 * Example: Bacterium X and Condition Y might be linked through
 * X→produces→Metabolite Z→[claim]→Y, but no paper directly studies X+Y.
 */
export function novelConnections(
  db: RhizomeDB,
  entityTypeA: string,
  entityTypeB: string,
  maxHops: number = 3,
  maxPerPair: number = 3
): {
  entityA: string;
  nameA: string;
  entityB: string;
  nameB: string;
  shortestPath: number;
  pathCount: number;
  viaSummary: string;
}[] {
  const entitiesA = db.entitiesOfType(entityTypeA);
  const entitiesB = db.entitiesOfType(entityTypeB);

  // Build set of entity pairs that DO appear in the same paper
  const directPairs = new Set<string>();
  const papers = db.entitiesOfType('paper');
  for (const paperId of papers) {
    const claims = db.relatedIds(paperId, 'claims', 'claim');
    const paperEntities = new Set<string>();
    for (const claimId of claims) {
      for (const rel of ['bacteria', 'metabolites', 'mechanisms', 'conditions']) {
        const subjects = db.relatedIds(claimId, rel, 'subject');
        for (const s of subjects) paperEntities.add(s);
      }
    }
    // Record all pairs within this paper
    const entityList = Array.from(paperEntities);
    for (let i = 0; i < entityList.length; i++) {
      for (let j = i + 1; j < entityList.length; j++) {
        const [a, b] = entityList[i] < entityList[j] ? [entityList[i], entityList[j]] : [entityList[j], entityList[i]];
        directPairs.add(`${a}|${b}`);
      }
    }
  }

  const results: {
    entityA: string; nameA: string; entityB: string; nameB: string;
    shortestPath: number; pathCount: number; viaSummary: string;
  }[] = [];

  for (const a of entitiesA) {
    for (const b of entitiesB) {
      if (a === b) continue;
      const [sorted1, sorted2] = a < b ? [a, b] : [b, a];
      if (directPairs.has(`${sorted1}|${sorted2}`)) continue;

      // Try to find paths
      const paths = pathwayBetween(db, a, b, maxHops, maxPerPair);
      if (paths.length === 0) continue;

      // Summarize what's "via" — unique intermediate entities
      const intermediates = new Set<string>();
      for (const p of paths) {
        for (let i = 1; i < p.path.length - 1; i++) {
          intermediates.add(p.path[i].name);
        }
      }

      const resolvedA = db.resolve(a);
      const resolvedB = db.resolve(b);

      results.push({
        entityA: a,
        nameA: (resolvedA.name as string) || a,
        entityB: b,
        nameB: (resolvedB.name as string) || b,
        shortestPath: paths[0].path.length,
        pathCount: paths.length,
        viaSummary: Array.from(intermediates).slice(0, 5).join(', '),
      });
    }
  }

  results.sort((a, b) => a.shortestPath - b.shortestPath);
  return results;
}

/**
 * Generate a summary report of the knowledge graph's contents.
 */
export function graphSummary(db: RhizomeDB): {
  papers: number;
  researchers: number;
  institutions: number;
  bacteria: number;
  metabolites: number;
  mechanisms: number;
  conditions: number;
  claims: number;
  totalDeltas: number;
  countries: string[];
  yearRange: [number, number];
} {
  const papers = db.entitiesOfType('paper');
  const allConditions = db.entitiesOfType('condition');

  const countries = new Set<string>();
  for (const instId of db.entitiesOfType('institution')) {
    const resolved = db.resolve(instId);
    if (resolved.country) countries.add(resolved.country as string);
  }

  const years = papers.map(p => db.resolve(p).year as number).filter(y => y > 0).sort();

  return {
    papers: papers.length,
    researchers: db.entitiesOfType('researcher').length,
    institutions: db.entitiesOfType('institution').length,
    bacteria: db.entitiesOfType('bacterium').length,
    metabolites: db.entitiesOfType('metabolite').length,
    mechanisms: db.entitiesOfType('mechanism').length,
    conditions: allConditions.length,
    claims: db.entitiesOfType('claim').length,
    totalDeltas: db.getStats().totalDeltas,
    countries: Array.from(countries),
    yearRange: [years[0] || 0, years[years.length - 1] || 0],
  };
}
