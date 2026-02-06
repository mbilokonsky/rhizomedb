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

/**
 * Find contradictions: cases where different papers make opposing claims
 * about the same entity-condition pair. Looks for direction annotations
 * (e.g., 'increased_in_disease' vs 'decreased_in_disease').
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
  increased: { claim: string; statement: string; paper: string; year: number }[];
  decreased: { claim: string; statement: string; paper: string; year: number }[];
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

      const increased: { claim: string; statement: string; paper: string; year: number }[] = [];
      const decreased: { claim: string; statement: string; paper: string; year: number }[] = [];

      for (const claimId of sharedClaims) {
        const resolved = db.resolve(claimId);
        const direction = resolved.direction as string | undefined;
        if (!direction) continue;

        const papers = db.relatedIds(claimId, 'source_paper', 'source');
        const paper = papers.length > 0 ? db.resolve(papers[0]) : { title: '', year: 0 };

        const entry = {
          claim: claimId,
          statement: (resolved.statement as string) || '',
          paper: (paper.title as string) || '',
          year: (paper.year as number) || 0,
        };

        if (direction === 'increased_in_disease' || direction === 'increased_in_treatment') {
          increased.push(entry);
        } else if (direction === 'decreased_in_disease') {
          decreased.push(entry);
        }
      }

      // Only report if there are claims in BOTH directions (that's a contradiction)
      if (increased.length > 0 && decreased.length > 0) {
        contradictions.push({
          entity: entityId,
          entityName: (db.resolve(entityId).name as string) || entityId,
          condition: condId,
          conditionName: (db.resolve(condId).name as string) || condId,
          increased,
          decreased,
        });
      }
    }
  }

  return contradictions;
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
