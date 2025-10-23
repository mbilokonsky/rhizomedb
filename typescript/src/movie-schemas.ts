/**
 * Movie domain schemas for RhizomeDB
 * Demonstrates real-world data modeling with movies, people, and roles
 */

import { HyperSchema } from './types';
import { selectByTargetContext } from './hyperview';

/**
 * Person schema - represents actors, directors, producers, etc.
 */
export const personSchema: HyperSchema = {
  id: 'person_schema',
  name: 'Person',
  select: selectByTargetContext,
  transform: {}
};

/**
 * Movie schema - represents films with relationships to people
 */
export const movieSchema: HyperSchema = {
  id: 'movie_schema',
  name: 'Movie',
  select: selectByTargetContext,
  transform: {
    director: {
      schema: 'person_schema',
      when: (p) => typeof p.target === 'object' && 'id' in p.target
    },
    producer: {
      schema: 'person_schema',
      when: (p) => typeof p.target === 'object' && 'id' in p.target
    },
    writer: {
      schema: 'person_schema',
      when: (p) => typeof p.target === 'object' && 'id' in p.target
    }
  }
};

/**
 * Role schema - represents an actor's role in a specific movie
 */
export const roleSchema: HyperSchema = {
  id: 'role_schema',
  name: 'Role',
  select: selectByTargetContext,
  transform: {
    actor: {
      schema: 'person_schema',
      when: (p) => typeof p.target === 'object' && 'id' in p.target
    },
    movie: {
      schema: 'movie_schema',
      when: (p) => typeof p.target === 'object' && 'id' in p.target
    }
  }
};

/**
 * Trilogy schema - represents a collection of related movies
 */
export const trilogySchema: HyperSchema = {
  id: 'trilogy_schema',
  name: 'Trilogy',
  select: selectByTargetContext,
  transform: {
    movie: {
      schema: 'movie_schema',
      when: (p) => typeof p.target === 'object' && 'id' in p.target
    }
  }
};

/**
 * All movie domain schemas
 */
export const movieSchemas = {
  person: personSchema,
  movie: movieSchema,
  role: roleSchema,
  trilogy: trilogySchema
};
