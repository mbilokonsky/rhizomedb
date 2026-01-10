/**
 * Rhia's ViewSchemas - Conflict resolution definitions for entity views
 *
 * These schemas define how to resolve HyperViews into Views,
 * following the spec §6 algorithm.
 */

import { ViewSchema, Delta } from '../../src/core/types';
import {
  mostRecent,
  allValues,
  extractPrimitive,
  extractReference,
  extractNestedView,
  trustedAuthor
} from '../../src/queries/view-resolver';
import { RHIA_AUTHOR } from './schema';

// =============================================================================
// Custom extraction helpers for Rhia's patterns
// =============================================================================

/**
 * Extract primitive value from annotation pattern deltas
 * (deltas with past-participle/noun roles like named/name)
 */
function extractAnnotationValue(nounRole: string): (delta: Delta) => string | undefined {
  return (delta: Delta) => {
    const pointer = delta.pointers.find((p) => p.role === nounRole);
    if (pointer && (typeof pointer.target === 'string' || typeof pointer.target === 'number')) {
      return String(pointer.target);
    }
    return undefined;
  };
}

/**
 * Extract related entity IDs from relationship pattern deltas
 */
function extractRelatedEntityIds(role: string): (delta: Delta) => string[] {
  return (delta: Delta) => {
    const ids: string[] = [];
    for (const pointer of delta.pointers) {
      if (
        pointer.role === role &&
        typeof pointer.target === 'object' &&
        'id' in pointer.target
      ) {
        ids.push(pointer.target.id);
      }
    }
    return ids;
  };
}

/**
 * Extract timestamp from delta for sorting/display
 */
function extractTimestamp(delta: Delta): number {
  return delta.timestamp;
}

// =============================================================================
// Resolution strategy: Rhia is the trusted author
// =============================================================================

const rhiaTrusted = trustedAuthor([RHIA_AUTHOR]);

// =============================================================================
// Concept ViewSchema
// =============================================================================

export const ConceptViewSchema: ViewSchema = {
  properties: {
    name: {
      source: 'name',
      extract: extractAnnotationValue('name'),
      resolve: mostRecent
    },
    description: {
      source: 'description',
      extract: extractAnnotationValue('description'),
      resolve: mostRecent
    },
    type: {
      source: 'type',
      extract: extractAnnotationValue('type'),
      resolve: mostRecent
    }
  }
};

// =============================================================================
// Question ViewSchema
// =============================================================================

export const QuestionViewSchema: ViewSchema = {
  properties: {
    text: {
      source: 'text',
      extract: extractAnnotationValue('text'),
      resolve: mostRecent
    },
    status: {
      source: 'status',
      extract: extractAnnotationValue('status'),
      resolve: mostRecent
    },
    context: {
      source: 'context',
      extract: extractAnnotationValue('context'),
      resolve: mostRecent
    },
    answer: {
      source: 'answer',
      extract: extractAnnotationValue('answer'),
      resolve: mostRecent
    },
    askedBy: {
      source: 'askedBy',
      extract: extractAnnotationValue('askedBy'),
      resolve: mostRecent
    },
    answeredBy: {
      source: 'answeredBy',
      extract: extractAnnotationValue('answeredBy'),
      resolve: mostRecent
    },
    type: {
      source: 'type',
      extract: extractAnnotationValue('type'),
      resolve: mostRecent
    }
  }
};

// =============================================================================
// Decision ViewSchema
// =============================================================================

export const DecisionViewSchema: ViewSchema = {
  properties: {
    summary: {
      source: 'summary',
      extract: extractAnnotationValue('summary'),
      resolve: mostRecent
    },
    rationale: {
      source: 'rationale',
      extract: extractAnnotationValue('rationale'),
      resolve: mostRecent
    },
    proposedBy: {
      source: 'proposedBy',
      extract: extractAnnotationValue('proposedBy'),
      resolve: mostRecent
    },
    decidedBy: {
      source: 'decidedBy',
      extract: extractAnnotationValue('decidedBy'),
      resolve: mostRecent
    },
    type: {
      source: 'type',
      extract: extractAnnotationValue('type'),
      resolve: mostRecent
    }
  }
};

// =============================================================================
// Observation ViewSchema
// =============================================================================

export const ObservationViewSchema: ViewSchema = {
  properties: {
    content: {
      source: 'content',
      extract: extractAnnotationValue('content'),
      resolve: mostRecent
    },
    significance: {
      source: 'significance',
      extract: extractAnnotationValue('significance'),
      resolve: mostRecent
    },
    observedBy: {
      source: 'observedBy',
      extract: extractAnnotationValue('observedBy'),
      resolve: mostRecent
    },
    type: {
      source: 'type',
      extract: extractAnnotationValue('type'),
      resolve: mostRecent
    }
  }
};

// =============================================================================
// Meeting ViewSchema
// =============================================================================

export const MeetingViewSchema: ViewSchema = {
  properties: {
    title: {
      source: 'title',
      extract: extractAnnotationValue('title'),
      resolve: mostRecent
    },
    date: {
      source: 'date',
      extract: extractAnnotationValue('date'),
      resolve: mostRecent
    },
    summary: {
      source: 'summary',
      extract: extractAnnotationValue('summary'),
      resolve: mostRecent
    },
    facilitatedBy: {
      source: 'facilitatedBy',
      extract: extractAnnotationValue('facilitatedBy'),
      resolve: mostRecent
    },
    type: {
      source: 'type',
      extract: extractAnnotationValue('type'),
      resolve: mostRecent
    }
  }
};

// =============================================================================
// Export all schemas
// =============================================================================

export const viewSchemas = {
  concept: ConceptViewSchema,
  question: QuestionViewSchema,
  decision: DecisionViewSchema,
  observation: ObservationViewSchema,
  meeting: MeetingViewSchema
};
