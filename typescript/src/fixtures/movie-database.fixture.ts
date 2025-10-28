/**
 * Movie Database Test Fixture
 *
 * Consolidated test data for demonstrating RhizomeDB with a rich movie dataset.
 * Includes 62+ films, 150+ people, 280+ roles spanning 1977-2019.
 *
 * **This is test/demo data only - not part of the core library.**
 */

import { Delta, HyperSchema, PrimitiveSchemas } from '../core/types';
import { RhizomeDB } from '../storage/instance';
import { selectByTargetContext } from '../schemas/hyperview';

export const personSchema: HyperSchema = {
  id: 'person_schema',
  name: 'Person',
  select: selectByTargetContext,
  transform: {
    name: {
      schema: PrimitiveSchemas.String,
      when: p => PrimitiveSchemas.String.validate(p.target)
    },
    birthYear: {
      schema: PrimitiveSchemas.Integer.Year,
      when: p => PrimitiveSchemas.Integer.Year.validate(p.target)
    }
  }
};

/**
 * Movie schema - represents films with relationships to people
 */
export const movieSchema: HyperSchema = {
  id: 'movie_schema',
  name: 'Movie',
  select: selectByTargetContext,
  transform: {
    title: {
      schema: PrimitiveSchemas.String,
      when: p => PrimitiveSchemas.String.validate(p.target)
    },
    year: {
      schema: PrimitiveSchemas.Integer.Year,
      when: p => PrimitiveSchemas.Integer.Year.validate(p.target)
    },
    runtime: {
      schema: PrimitiveSchemas.Integer,
      when: p => PrimitiveSchemas.Integer.validate(p.target)
    },
    director: {
      schema: 'person_schema',
      when: p => typeof p.target === 'object' && 'id' in p.target
    },
    producer: {
      schema: 'person_schema',
      when: p => typeof p.target === 'object' && 'id' in p.target
    },
    writer: {
      schema: 'person_schema',
      when: p => typeof p.target === 'object' && 'id' in p.target
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
    character: {
      schema: PrimitiveSchemas.String,
      when: p => PrimitiveSchemas.String.validate(p.target)
    },
    actor: {
      schema: 'person_schema',
      when: p => typeof p.target === 'object' && 'id' in p.target
    },
    movie: {
      schema: 'movie_schema',
      when: p => typeof p.target === 'object' && 'id' in p.target
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
    name: {
      schema: PrimitiveSchemas.String,
      when: p => PrimitiveSchemas.String.validate(p.target)
    },
    movie: {
      schema: 'movie_schema',
      when: p => typeof p.target === 'object' && 'id' in p.target
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

// ============================================================================
// DATA TYPES AND CORE MOVIE DATA
// ============================================================================

export interface MovieData {
  id: string;
  title: string;
  year: number;
  runtime: number;
  director: string;
  producers?: string[];
  writers?: string[];
}

export interface RoleData {
  id: string;
  actor: string;
  movie: string;
  character: string;
}

export interface PersonData {
  id: string;
  name: string;
  birthYear?: number;
}

/**
 * Generate deltas for a person
 */
function createPersonDeltas(db: RhizomeDB, person: PersonData): Delta[] {
  const deltas: Delta[] = [];

  // Name
  deltas.push(
    db.createDelta('seed', [
      { role: 'named', target: { id: person.id, context: 'name' } },
      { role: 'name', target: person.name }
    ])
  );

  // Birth year (if available)
  if (person.birthYear) {
    deltas.push(
      db.createDelta('seed', [
        { role: 'born', target: { id: person.id, context: 'birthYear' } },
        { role: 'birthYear', target: person.birthYear }
      ])
    );
  }

  return deltas;
}

/**
 * Generate deltas for a movie
 */
function createMovieDeltas(db: RhizomeDB, movie: MovieData): Delta[] {
  const deltas: Delta[] = [];

  // Title
  deltas.push(
    db.createDelta('seed', [
      { role: 'titled', target: { id: movie.id, context: 'title' } },
      { role: 'title', target: movie.title }
    ])
  );

  // Year
  deltas.push(
    db.createDelta('seed', [
      { role: 'released', target: { id: movie.id, context: 'year' } },
      { role: 'year', target: movie.year }
    ])
  );

  // Runtime
  deltas.push(
    db.createDelta('seed', [
      { role: 'runs', target: { id: movie.id, context: 'runtime' } },
      { role: 'runtime', target: movie.runtime }
    ])
  );

  // Director
  deltas.push(
    db.createDelta('seed', [
      { role: 'directed_by', target: { id: movie.id, context: 'director' } },
      { role: 'director', target: { id: movie.director } }
    ])
  );

  // Producers
  if (movie.producers) {
    for (const producer of movie.producers) {
      deltas.push(
        db.createDelta('seed', [
          { role: 'produced_by', target: { id: movie.id, context: 'producer' } },
          { role: 'producer', target: { id: producer } }
        ])
      );
    }
  }

  // Writers
  if (movie.writers) {
    for (const writer of movie.writers) {
      deltas.push(
        db.createDelta('seed', [
          { role: 'written_by', target: { id: movie.id, context: 'writer' } },
          { role: 'writer', target: { id: writer } }
        ])
      );
    }
  }

  return deltas;
}

/**
 * Generate deltas for a role (actor playing a character in a movie)
 */
function createRoleDeltas(db: RhizomeDB, role: RoleData): Delta[] {
  const deltas: Delta[] = [];

  // Actor
  deltas.push(
    db.createDelta('seed', [
      { role: 'performed_by', target: { id: role.id, context: 'actor' } },
      { role: 'actor', target: { id: role.actor } }
    ])
  );

  // Movie
  deltas.push(
    db.createDelta('seed', [
      { role: 'appears_in', target: { id: role.id, context: 'movie' } },
      { role: 'movie', target: { id: role.movie } }
    ])
  );

  // Character name
  deltas.push(
    db.createDelta('seed', [
      { role: 'portrays', target: { id: role.id, context: 'character' } },
      { role: 'character', target: role.character }
    ])
  );

  return deltas;
}

/**
 * Generate deltas for a trilogy
 */
function createTrilogyDeltas(
  db: RhizomeDB,
  trilogyId: string,
  name: string,
  movieIds: string[]
): Delta[] {
  const deltas: Delta[] = [];

  // Name
  deltas.push(
    db.createDelta('seed', [
      { role: 'named', target: { id: trilogyId, context: 'name' } },
      { role: 'name', target: name }
    ])
  );

  // Movies
  for (const movieId of movieIds) {
    deltas.push(
      db.createDelta('seed', [
        { role: 'contains', target: { id: trilogyId, context: 'movie' } },
        { role: 'movie', target: { id: movieId } }
      ])
    );
  }

  return deltas;
}

/**
 * The Matrix franchise data
 */
export const matrixPeople: PersonData[] = [
  { id: 'person_wachowski_lana', name: 'Lana Wachowski', birthYear: 1965 },
  { id: 'person_wachowski_lilly', name: 'Lilly Wachowski', birthYear: 1967 },
  { id: 'person_reeves_keanu', name: 'Keanu Reeves', birthYear: 1964 },
  { id: 'person_moss_carrie_anne', name: 'Carrie-Anne Moss', birthYear: 1967 },
  { id: 'person_fishburne_laurence', name: 'Laurence Fishburne', birthYear: 1961 },
  { id: 'person_weaving_hugo', name: 'Hugo Weaving', birthYear: 1960 },
  { id: 'person_pantoliano_joe', name: 'Joe Pantoliano', birthYear: 1951 },
  { id: 'person_belushi_monica', name: 'Monica Bellucci', birthYear: 1964 },
  { id: 'person_foster_gloria', name: 'Gloria Foster', birthYear: 1933 }
];

export const matrixMovies: MovieData[] = [
  {
    id: 'movie_matrix',
    title: 'The Matrix',
    year: 1999,
    runtime: 136,
    director: 'person_wachowski_lana',
    producers: ['person_silver_joel'],
    writers: ['person_wachowski_lana', 'person_wachowski_lilly']
  },
  {
    id: 'movie_matrix_reloaded',
    title: 'The Matrix Reloaded',
    year: 2003,
    runtime: 138,
    director: 'person_wachowski_lana',
    producers: ['person_silver_joel'],
    writers: ['person_wachowski_lana', 'person_wachowski_lilly']
  },
  {
    id: 'movie_matrix_revolutions',
    title: 'The Matrix Revolutions',
    year: 2003,
    runtime: 129,
    director: 'person_wachowski_lana',
    producers: ['person_silver_joel'],
    writers: ['person_wachowski_lana', 'person_wachowski_lilly']
  }
];

export const matrixRoles: RoleData[] = [
  { id: 'role_matrix_neo', actor: 'person_reeves_keanu', movie: 'movie_matrix', character: 'Neo' },
  {
    id: 'role_matrix_trinity',
    actor: 'person_moss_carrie_anne',
    movie: 'movie_matrix',
    character: 'Trinity'
  },
  {
    id: 'role_matrix_morpheus',
    actor: 'person_fishburne_laurence',
    movie: 'movie_matrix',
    character: 'Morpheus'
  },
  {
    id: 'role_matrix_smith',
    actor: 'person_weaving_hugo',
    movie: 'movie_matrix',
    character: 'Agent Smith'
  },
  {
    id: 'role_matrix_cypher',
    actor: 'person_pantoliano_joe',
    movie: 'movie_matrix',
    character: 'Cypher'
  },
  {
    id: 'role_matrix_oracle',
    actor: 'person_foster_gloria',
    movie: 'movie_matrix',
    character: 'The Oracle'
  },

  {
    id: 'role_reloaded_neo',
    actor: 'person_reeves_keanu',
    movie: 'movie_matrix_reloaded',
    character: 'Neo'
  },
  {
    id: 'role_reloaded_trinity',
    actor: 'person_moss_carrie_anne',
    movie: 'movie_matrix_reloaded',
    character: 'Trinity'
  },
  {
    id: 'role_reloaded_morpheus',
    actor: 'person_fishburne_laurence',
    movie: 'movie_matrix_reloaded',
    character: 'Morpheus'
  },
  {
    id: 'role_reloaded_smith',
    actor: 'person_weaving_hugo',
    movie: 'movie_matrix_reloaded',
    character: 'Agent Smith'
  },
  {
    id: 'role_reloaded_persephone',
    actor: 'person_belushi_monica',
    movie: 'movie_matrix_reloaded',
    character: 'Persephone'
  },

  {
    id: 'role_revolutions_neo',
    actor: 'person_reeves_keanu',
    movie: 'movie_matrix_revolutions',
    character: 'Neo'
  },
  {
    id: 'role_revolutions_trinity',
    actor: 'person_moss_carrie_anne',
    movie: 'movie_matrix_revolutions',
    character: 'Trinity'
  },
  {
    id: 'role_revolutions_morpheus',
    actor: 'person_fishburne_laurence',
    movie: 'movie_matrix_revolutions',
    character: 'Morpheus'
  },
  {
    id: 'role_revolutions_smith',
    actor: 'person_weaving_hugo',
    movie: 'movie_matrix_revolutions',
    character: 'Agent Smith'
  }
];

/**
 * Star Wars franchise data
 */
export const starWarsPeople: PersonData[] = [
  { id: 'person_lucas_george', name: 'George Lucas', birthYear: 1944 },
  { id: 'person_hamill_mark', name: 'Mark Hamill', birthYear: 1951 },
  { id: 'person_ford_harrison', name: 'Harrison Ford', birthYear: 1942 },
  { id: 'person_fisher_carrie', name: 'Carrie Fisher', birthYear: 1956 },
  { id: 'person_guinness_alec', name: 'Alec Guinness', birthYear: 1914 },
  { id: 'person_prowse_david', name: 'David Prowse', birthYear: 1935 },
  { id: 'person_baker_kenny', name: 'Kenny Baker', birthYear: 1934 },
  { id: 'person_daniels_anthony', name: 'Anthony Daniels', birthYear: 1946 },
  { id: 'person_mayhew_peter', name: 'Peter Mayhew', birthYear: 1944 },
  { id: 'person_mcgregor_ewan', name: 'Ewan McGregor', birthYear: 1971 },
  { id: 'person_portman_natalie', name: 'Natalie Portman', birthYear: 1981 },
  { id: 'person_neeson_liam', name: 'Liam Neeson', birthYear: 1952 },
  { id: 'person_lloyd_jake', name: 'Jake Lloyd', birthYear: 1989 },
  { id: 'person_christensen_hayden', name: 'Hayden Christensen', birthYear: 1981 },
  { id: 'person_mcdermid_ian', name: 'Ian McDiarmid', birthYear: 1944 },
  { id: 'person_lee_christopher', name: 'Christopher Lee', birthYear: 1922 },
  { id: 'person_jackson_samuel', name: 'Samuel L. Jackson', birthYear: 1948 }
];

export const starWarsMovies: MovieData[] = [
  // Original Trilogy
  {
    id: 'movie_star_wars_iv',
    title: 'Star Wars: Episode IV - A New Hope',
    year: 1977,
    runtime: 121,
    director: 'person_lucas_george',
    writers: ['person_lucas_george']
  },
  {
    id: 'movie_star_wars_v',
    title: 'Star Wars: Episode V - The Empire Strikes Back',
    year: 1980,
    runtime: 124,
    director: 'person_kershner_irvin',
    writers: ['person_lucas_george', 'person_kasdan_lawrence']
  },
  {
    id: 'movie_star_wars_vi',
    title: 'Star Wars: Episode VI - Return of the Jedi',
    year: 1983,
    runtime: 131,
    director: 'person_marquand_richard',
    writers: ['person_lucas_george', 'person_kasdan_lawrence']
  },
  // Prequel Trilogy
  {
    id: 'movie_star_wars_i',
    title: 'Star Wars: Episode I - The Phantom Menace',
    year: 1999,
    runtime: 136,
    director: 'person_lucas_george',
    writers: ['person_lucas_george']
  },
  {
    id: 'movie_star_wars_ii',
    title: 'Star Wars: Episode II - Attack of the Clones',
    year: 2002,
    runtime: 142,
    director: 'person_lucas_george',
    writers: ['person_lucas_george', 'person_hales_jonathan']
  },
  {
    id: 'movie_star_wars_iii',
    title: 'Star Wars: Episode III - Revenge of the Sith',
    year: 2005,
    runtime: 140,
    director: 'person_lucas_george',
    writers: ['person_lucas_george']
  }
];

export const starWarsRoles: RoleData[] = [
  // Episode IV
  {
    id: 'role_sw4_luke',
    actor: 'person_hamill_mark',
    movie: 'movie_star_wars_iv',
    character: 'Luke Skywalker'
  },
  {
    id: 'role_sw4_han',
    actor: 'person_ford_harrison',
    movie: 'movie_star_wars_iv',
    character: 'Han Solo'
  },
  {
    id: 'role_sw4_leia',
    actor: 'person_fisher_carrie',
    movie: 'movie_star_wars_iv',
    character: 'Princess Leia'
  },
  {
    id: 'role_sw4_obiwan',
    actor: 'person_guinness_alec',
    movie: 'movie_star_wars_iv',
    character: 'Obi-Wan Kenobi'
  },
  {
    id: 'role_sw4_vader',
    actor: 'person_prowse_david',
    movie: 'movie_star_wars_iv',
    character: 'Darth Vader'
  },
  {
    id: 'role_sw4_r2d2',
    actor: 'person_baker_kenny',
    movie: 'movie_star_wars_iv',
    character: 'R2-D2'
  },
  {
    id: 'role_sw4_c3po',
    actor: 'person_daniels_anthony',
    movie: 'movie_star_wars_iv',
    character: 'C-3PO'
  },
  {
    id: 'role_sw4_chewbacca',
    actor: 'person_mayhew_peter',
    movie: 'movie_star_wars_iv',
    character: 'Chewbacca'
  },

  // Episode V
  {
    id: 'role_sw5_luke',
    actor: 'person_hamill_mark',
    movie: 'movie_star_wars_v',
    character: 'Luke Skywalker'
  },
  {
    id: 'role_sw5_han',
    actor: 'person_ford_harrison',
    movie: 'movie_star_wars_v',
    character: 'Han Solo'
  },
  {
    id: 'role_sw5_leia',
    actor: 'person_fisher_carrie',
    movie: 'movie_star_wars_v',
    character: 'Princess Leia'
  },
  {
    id: 'role_sw5_vader',
    actor: 'person_prowse_david',
    movie: 'movie_star_wars_v',
    character: 'Darth Vader'
  },
  {
    id: 'role_sw5_r2d2',
    actor: 'person_baker_kenny',
    movie: 'movie_star_wars_v',
    character: 'R2-D2'
  },
  {
    id: 'role_sw5_c3po',
    actor: 'person_daniels_anthony',
    movie: 'movie_star_wars_v',
    character: 'C-3PO'
  },
  {
    id: 'role_sw5_chewbacca',
    actor: 'person_mayhew_peter',
    movie: 'movie_star_wars_v',
    character: 'Chewbacca'
  },

  // Episode VI
  {
    id: 'role_sw6_luke',
    actor: 'person_hamill_mark',
    movie: 'movie_star_wars_vi',
    character: 'Luke Skywalker'
  },
  {
    id: 'role_sw6_han',
    actor: 'person_ford_harrison',
    movie: 'movie_star_wars_vi',
    character: 'Han Solo'
  },
  {
    id: 'role_sw6_leia',
    actor: 'person_fisher_carrie',
    movie: 'movie_star_wars_vi',
    character: 'Princess Leia'
  },
  {
    id: 'role_sw6_vader',
    actor: 'person_prowse_david',
    movie: 'movie_star_wars_vi',
    character: 'Darth Vader'
  },
  {
    id: 'role_sw6_r2d2',
    actor: 'person_baker_kenny',
    movie: 'movie_star_wars_vi',
    character: 'R2-D2'
  },
  {
    id: 'role_sw6_c3po',
    actor: 'person_daniels_anthony',
    movie: 'movie_star_wars_vi',
    character: 'C-3PO'
  },
  {
    id: 'role_sw6_chewbacca',
    actor: 'person_mayhew_peter',
    movie: 'movie_star_wars_vi',
    character: 'Chewbacca'
  },

  // Episode I
  {
    id: 'role_sw1_obiwan',
    actor: 'person_mcgregor_ewan',
    movie: 'movie_star_wars_i',
    character: 'Obi-Wan Kenobi'
  },
  {
    id: 'role_sw1_quigon',
    actor: 'person_neeson_liam',
    movie: 'movie_star_wars_i',
    character: 'Qui-Gon Jinn'
  },
  {
    id: 'role_sw1_anakin',
    actor: 'person_lloyd_jake',
    movie: 'movie_star_wars_i',
    character: 'Anakin Skywalker'
  },
  {
    id: 'role_sw1_padme',
    actor: 'person_portman_natalie',
    movie: 'movie_star_wars_i',
    character: 'Padmé Amidala'
  },
  {
    id: 'role_sw1_palpatine',
    actor: 'person_mcdermid_ian',
    movie: 'movie_star_wars_i',
    character: 'Senator Palpatine'
  },
  {
    id: 'role_sw1_r2d2',
    actor: 'person_baker_kenny',
    movie: 'movie_star_wars_i',
    character: 'R2-D2'
  },
  {
    id: 'role_sw1_c3po',
    actor: 'person_daniels_anthony',
    movie: 'movie_star_wars_i',
    character: 'C-3PO'
  },

  // Episode II
  {
    id: 'role_sw2_obiwan',
    actor: 'person_mcgregor_ewan',
    movie: 'movie_star_wars_ii',
    character: 'Obi-Wan Kenobi'
  },
  {
    id: 'role_sw2_anakin',
    actor: 'person_christensen_hayden',
    movie: 'movie_star_wars_ii',
    character: 'Anakin Skywalker'
  },
  {
    id: 'role_sw2_padme',
    actor: 'person_portman_natalie',
    movie: 'movie_star_wars_ii',
    character: 'Padmé Amidala'
  },
  {
    id: 'role_sw2_palpatine',
    actor: 'person_mcdermid_ian',
    movie: 'movie_star_wars_ii',
    character: 'Supreme Chancellor Palpatine'
  },
  {
    id: 'role_sw2_dooku',
    actor: 'person_lee_christopher',
    movie: 'movie_star_wars_ii',
    character: 'Count Dooku'
  },
  {
    id: 'role_sw2_mace',
    actor: 'person_jackson_samuel',
    movie: 'movie_star_wars_ii',
    character: 'Mace Windu'
  },
  {
    id: 'role_sw2_r2d2',
    actor: 'person_baker_kenny',
    movie: 'movie_star_wars_ii',
    character: 'R2-D2'
  },
  {
    id: 'role_sw2_c3po',
    actor: 'person_daniels_anthony',
    movie: 'movie_star_wars_ii',
    character: 'C-3PO'
  },

  // Episode III
  {
    id: 'role_sw3_obiwan',
    actor: 'person_mcgregor_ewan',
    movie: 'movie_star_wars_iii',
    character: 'Obi-Wan Kenobi'
  },
  {
    id: 'role_sw3_anakin',
    actor: 'person_christensen_hayden',
    movie: 'movie_star_wars_iii',
    character: 'Anakin Skywalker / Darth Vader'
  },
  {
    id: 'role_sw3_padme',
    actor: 'person_portman_natalie',
    movie: 'movie_star_wars_iii',
    character: 'Padmé Amidala'
  },
  {
    id: 'role_sw3_palpatine',
    actor: 'person_mcdermid_ian',
    movie: 'movie_star_wars_iii',
    character: 'Emperor Palpatine'
  },
  {
    id: 'role_sw3_dooku',
    actor: 'person_lee_christopher',
    movie: 'movie_star_wars_iii',
    character: 'Count Dooku'
  },
  {
    id: 'role_sw3_mace',
    actor: 'person_jackson_samuel',
    movie: 'movie_star_wars_iii',
    character: 'Mace Windu'
  },
  {
    id: 'role_sw3_r2d2',
    actor: 'person_baker_kenny',
    movie: 'movie_star_wars_iii',
    character: 'R2-D2'
  },
  {
    id: 'role_sw3_c3po',
    actor: 'person_daniels_anthony',
    movie: 'movie_star_wars_iii',
    character: 'C-3PO'
  }
];

/**
 * Lord of the Rings franchise data
 */
export const lotrPeople: PersonData[] = [
  { id: 'person_jackson_peter', name: 'Peter Jackson', birthYear: 1961 },
  { id: 'person_wood_elijah', name: 'Elijah Wood', birthYear: 1981 },
  { id: 'person_mckellen_ian', name: 'Ian McKellen', birthYear: 1939 },
  { id: 'person_mortensen_viggo', name: 'Viggo Mortensen', birthYear: 1958 },
  { id: 'person_astin_sean', name: 'Sean Astin', birthYear: 1971 },
  { id: 'person_bean_sean', name: 'Sean Bean', birthYear: 1959 },
  { id: 'person_bloom_orlando', name: 'Orlando Bloom', birthYear: 1977 },
  { id: 'person_rhys_davies_john', name: 'John Rhys-Davies', birthYear: 1944 },
  { id: 'person_monaghan_dominic', name: 'Dominic Monaghan', birthYear: 1976 },
  { id: 'person_boyd_billy', name: 'Billy Boyd', birthYear: 1968 },
  { id: 'person_tyler_liv', name: 'Liv Tyler', birthYear: 1977 },
  { id: 'person_blanchett_cate', name: 'Cate Blanchett', birthYear: 1969 },
  { id: 'person_serkis_andy', name: 'Andy Serkis', birthYear: 1964 },
  { id: 'person_lee_christopher_lotr', name: 'Christopher Lee', birthYear: 1922 },
  { id: 'person_holm_ian', name: 'Ian Holm', birthYear: 1931 }
];

export const lotrMovies: MovieData[] = [
  {
    id: 'movie_lotr_fellowship',
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    year: 2001,
    runtime: 178,
    director: 'person_jackson_peter',
    writers: ['person_jackson_peter', 'person_walsh_fran', 'person_boyens_philippa']
  },
  {
    id: 'movie_lotr_two_towers',
    title: 'The Lord of the Rings: The Two Towers',
    year: 2002,
    runtime: 179,
    director: 'person_jackson_peter',
    writers: ['person_jackson_peter', 'person_walsh_fran', 'person_boyens_philippa']
  },
  {
    id: 'movie_lotr_return',
    title: 'The Lord of the Rings: The Return of the King',
    year: 2003,
    runtime: 201,
    director: 'person_jackson_peter',
    writers: ['person_jackson_peter', 'person_walsh_fran', 'person_boyens_philippa']
  }
];

export const lotrRoles: RoleData[] = [
  // Fellowship
  {
    id: 'role_fellowship_frodo',
    actor: 'person_wood_elijah',
    movie: 'movie_lotr_fellowship',
    character: 'Frodo Baggins'
  },
  {
    id: 'role_fellowship_gandalf',
    actor: 'person_mckellen_ian',
    movie: 'movie_lotr_fellowship',
    character: 'Gandalf'
  },
  {
    id: 'role_fellowship_aragorn',
    actor: 'person_mortensen_viggo',
    movie: 'movie_lotr_fellowship',
    character: 'Aragorn'
  },
  {
    id: 'role_fellowship_sam',
    actor: 'person_astin_sean',
    movie: 'movie_lotr_fellowship',
    character: 'Samwise Gamgee'
  },
  {
    id: 'role_fellowship_boromir',
    actor: 'person_bean_sean',
    movie: 'movie_lotr_fellowship',
    character: 'Boromir'
  },
  {
    id: 'role_fellowship_legolas',
    actor: 'person_bloom_orlando',
    movie: 'movie_lotr_fellowship',
    character: 'Legolas'
  },
  {
    id: 'role_fellowship_gimli',
    actor: 'person_rhys_davies_john',
    movie: 'movie_lotr_fellowship',
    character: 'Gimli'
  },
  {
    id: 'role_fellowship_merry',
    actor: 'person_monaghan_dominic',
    movie: 'movie_lotr_fellowship',
    character: 'Merry'
  },
  {
    id: 'role_fellowship_pippin',
    actor: 'person_boyd_billy',
    movie: 'movie_lotr_fellowship',
    character: 'Pippin'
  },
  {
    id: 'role_fellowship_arwen',
    actor: 'person_tyler_liv',
    movie: 'movie_lotr_fellowship',
    character: 'Arwen'
  },
  {
    id: 'role_fellowship_galadriel',
    actor: 'person_blanchett_cate',
    movie: 'movie_lotr_fellowship',
    character: 'Galadriel'
  },
  {
    id: 'role_fellowship_saruman',
    actor: 'person_lee_christopher_lotr',
    movie: 'movie_lotr_fellowship',
    character: 'Saruman'
  },
  {
    id: 'role_fellowship_bilbo',
    actor: 'person_holm_ian',
    movie: 'movie_lotr_fellowship',
    character: 'Bilbo Baggins'
  },

  // Two Towers
  {
    id: 'role_towers_frodo',
    actor: 'person_wood_elijah',
    movie: 'movie_lotr_two_towers',
    character: 'Frodo Baggins'
  },
  {
    id: 'role_towers_gandalf',
    actor: 'person_mckellen_ian',
    movie: 'movie_lotr_two_towers',
    character: 'Gandalf'
  },
  {
    id: 'role_towers_aragorn',
    actor: 'person_mortensen_viggo',
    movie: 'movie_lotr_two_towers',
    character: 'Aragorn'
  },
  {
    id: 'role_towers_sam',
    actor: 'person_astin_sean',
    movie: 'movie_lotr_two_towers',
    character: 'Samwise Gamgee'
  },
  {
    id: 'role_towers_legolas',
    actor: 'person_bloom_orlando',
    movie: 'movie_lotr_two_towers',
    character: 'Legolas'
  },
  {
    id: 'role_towers_gimli',
    actor: 'person_rhys_davies_john',
    movie: 'movie_lotr_two_towers',
    character: 'Gimli'
  },
  {
    id: 'role_towers_merry',
    actor: 'person_monaghan_dominic',
    movie: 'movie_lotr_two_towers',
    character: 'Merry'
  },
  {
    id: 'role_towers_pippin',
    actor: 'person_boyd_billy',
    movie: 'movie_lotr_two_towers',
    character: 'Pippin'
  },
  {
    id: 'role_towers_arwen',
    actor: 'person_tyler_liv',
    movie: 'movie_lotr_two_towers',
    character: 'Arwen'
  },
  {
    id: 'role_towers_gollum',
    actor: 'person_serkis_andy',
    movie: 'movie_lotr_two_towers',
    character: 'Gollum'
  },
  {
    id: 'role_towers_saruman',
    actor: 'person_lee_christopher_lotr',
    movie: 'movie_lotr_two_towers',
    character: 'Saruman'
  },

  // Return of the King
  {
    id: 'role_return_frodo',
    actor: 'person_wood_elijah',
    movie: 'movie_lotr_return',
    character: 'Frodo Baggins'
  },
  {
    id: 'role_return_gandalf',
    actor: 'person_mckellen_ian',
    movie: 'movie_lotr_return',
    character: 'Gandalf'
  },
  {
    id: 'role_return_aragorn',
    actor: 'person_mortensen_viggo',
    movie: 'movie_lotr_return',
    character: 'Aragorn'
  },
  {
    id: 'role_return_sam',
    actor: 'person_astin_sean',
    movie: 'movie_lotr_return',
    character: 'Samwise Gamgee'
  },
  {
    id: 'role_return_legolas',
    actor: 'person_bloom_orlando',
    movie: 'movie_lotr_return',
    character: 'Legolas'
  },
  {
    id: 'role_return_gimli',
    actor: 'person_rhys_davies_john',
    movie: 'movie_lotr_return',
    character: 'Gimli'
  },
  {
    id: 'role_return_merry',
    actor: 'person_monaghan_dominic',
    movie: 'movie_lotr_return',
    character: 'Merry'
  },
  {
    id: 'role_return_pippin',
    actor: 'person_boyd_billy',
    movie: 'movie_lotr_return',
    character: 'Pippin'
  },
  {
    id: 'role_return_arwen',
    actor: 'person_tyler_liv',
    movie: 'movie_lotr_return',
    character: 'Arwen'
  },
  {
    id: 'role_return_gollum',
    actor: 'person_serkis_andy',
    movie: 'movie_lotr_return',
    character: 'Gollum'
  },
  {
    id: 'role_return_galadriel',
    actor: 'person_blanchett_cate',
    movie: 'movie_lotr_return',
    character: 'Galadriel'
  },
  {
    id: 'role_return_saruman',
    actor: 'person_lee_christopher_lotr',
    movie: 'movie_lotr_return',
    character: 'Saruman'
  }
];

// Additional people for completeness (directors, writers, producers)
export const additionalPeople: PersonData[] = [
  { id: 'person_silver_joel', name: 'Joel Silver', birthYear: 1952 },
  { id: 'person_kershner_irvin', name: 'Irvin Kershner', birthYear: 1923 },
  { id: 'person_marquand_richard', name: 'Richard Marquand', birthYear: 1937 },
  { id: 'person_kasdan_lawrence', name: 'Lawrence Kasdan', birthYear: 1949 },
  { id: 'person_hales_jonathan', name: 'Jonathan Hales', birthYear: 1937 },
  { id: 'person_walsh_fran', name: 'Fran Walsh', birthYear: 1959 },
  { id: 'person_boyens_philippa', name: 'Philippa Boyens', birthYear: 1962 }
];

/**
 * Seed the database with all movie data
 */
export async function seedMovieDatabase(
  db: RhizomeDB,
  options?: { includeExpanded?: boolean }
): Promise<void> {
  const allDeltas: Delta[] = [];
  const includeExpanded = options?.includeExpanded ?? true;

  // Matrix franchise
  console.error('Seeding Matrix trilogy...');
  for (const person of [...matrixPeople, ...additionalPeople]) {
    allDeltas.push(...createPersonDeltas(db, person));
  }
  for (const movie of matrixMovies) {
    allDeltas.push(...createMovieDeltas(db, movie));
  }
  for (const role of matrixRoles) {
    allDeltas.push(...createRoleDeltas(db, role));
  }
  allDeltas.push(
    ...createTrilogyDeltas(db, 'trilogy_matrix', 'The Matrix Trilogy', [
      'movie_matrix',
      'movie_matrix_reloaded',
      'movie_matrix_revolutions'
    ])
  );

  // Star Wars franchise
  console.error('Seeding Star Wars saga...');
  for (const person of starWarsPeople) {
    allDeltas.push(...createPersonDeltas(db, person));
  }
  for (const movie of starWarsMovies) {
    allDeltas.push(...createMovieDeltas(db, movie));
  }
  for (const role of starWarsRoles) {
    allDeltas.push(...createRoleDeltas(db, role));
  }
  allDeltas.push(
    ...createTrilogyDeltas(db, 'trilogy_star_wars_original', 'Star Wars: Original Trilogy', [
      'movie_star_wars_iv',
      'movie_star_wars_v',
      'movie_star_wars_vi'
    ])
  );
  allDeltas.push(
    ...createTrilogyDeltas(db, 'trilogy_star_wars_prequel', 'Star Wars: Prequel Trilogy', [
      'movie_star_wars_i',
      'movie_star_wars_ii',
      'movie_star_wars_iii'
    ])
  );

  // Lord of the Rings franchise
  console.error('Seeding Lord of the Rings trilogy...');
  for (const person of lotrPeople) {
    allDeltas.push(...createPersonDeltas(db, person));
  }
  for (const movie of lotrMovies) {
    allDeltas.push(...createMovieDeltas(db, movie));
  }
  for (const role of lotrRoles) {
    allDeltas.push(...createRoleDeltas(db, role));
  }
  allDeltas.push(
    ...createTrilogyDeltas(db, 'trilogy_lotr', 'The Lord of the Rings Trilogy', [
      'movie_lotr_fellowship',
      'movie_lotr_two_towers',
      'movie_lotr_return'
    ])
  );

  // Expanded dataset (additional films from actors in core dataset)
  if (includeExpanded) {
    console.error('Seeding expanded filmography...');

    // Add all new people (all data is in this file now)
    for (const person of [...expandedPeople, ...additionalExpandedPeople, ...supportingActors]) {
      allDeltas.push(...createPersonDeltas(db, person));
    }

    // Add all expanded movies
    for (const movie of expandedMovies) {
      allDeltas.push(...createMovieDeltas(db, movie));
    }

    // Add all expanded roles
    for (const role of expandedRoles) {
      allDeltas.push(...createRoleDeltas(db, role));
    }

    // Add franchise collections
    allDeltas.push(
      ...createTrilogyDeltas(db, 'trilogy_john_wick', 'John Wick Series', [
        'movie_john_wick',
        'movie_john_wick_2',
        'movie_john_wick_3'
      ])
    );

    allDeltas.push(
      ...createTrilogyDeltas(db, 'trilogy_indiana_jones', 'Indiana Jones Trilogy', [
        'movie_raiders',
        'movie_temple_doom',
        'movie_last_crusade'
      ])
    );

    allDeltas.push(
      ...createTrilogyDeltas(db, 'trilogy_xmen_original', 'X-Men Original Trilogy', [
        'movie_xmen',
        'movie_xmen_2',
        'movie_xmen_last_stand'
      ])
    );

    allDeltas.push(
      ...createTrilogyDeltas(db, 'trilogy_pirates', 'Pirates of the Caribbean Original Trilogy', [
        'movie_pirates_curse',
        'movie_pirates_chest',
        'movie_pirates_world_end'
      ])
    );

    allDeltas.push(
      ...createTrilogyDeltas(db, 'trilogy_hobbit', 'The Hobbit Trilogy', [
        'movie_hobbit_journey',
        'movie_hobbit_smaug',
        'movie_hobbit_battle'
      ])
    );

    allDeltas.push(
      ...createTrilogyDeltas(db, 'trilogy_avengers', 'Avengers Series', [
        'movie_avengers',
        'movie_avengers_ultron'
      ])
    );
  }

  // Persist all deltas
  console.error(`Persisting ${allDeltas.length} deltas...`);
  await db.persistDeltas(allDeltas);
  console.error('Movie database seeded successfully!');
}

/**
 * Get statistics about seeded data
 */
export function getSeedStats(includeExpanded: boolean = true): {
  totalMovies: number;
  totalPeople: number;
  totalRoles: number;
  totalTrilogies: number;
} {
  let totalMovies = matrixMovies.length + starWarsMovies.length + lotrMovies.length;
  let totalPeople =
    matrixPeople.length + starWarsPeople.length + lotrPeople.length + additionalPeople.length;
  let totalRoles = matrixRoles.length + starWarsRoles.length + lotrRoles.length;
  let totalTrilogies = 4; // Matrix, SW Original, SW Prequel, LOTR

  if (includeExpanded) {
    // All data is in this file, so we can directly reference it
    totalMovies += expandedMovies.length;
    totalPeople +=
      expandedPeople.length + additionalExpandedPeople.length + supportingActors.length;
    totalRoles += expandedRoles.length;
    totalTrilogies += 6; // John Wick, Indiana Jones, X-Men, Pirates, Hobbit, Avengers
  }

  return {
    totalMovies,
    totalPeople,
    totalRoles,
    totalTrilogies
  };
}

// ============================================================================
// EXPANDED MOVIE DATA
// ============================================================================

export const expandedPeople: PersonData[] = [
  // John Wick franchise
  { id: 'person_reeves_keanu', name: 'Keanu Reeves', birthYear: 1964 }, // Already exists but referenced
  { id: 'person_stahelski_chad', name: 'Chad Stahelski', birthYear: 1968 },
  { id: 'person_mcshane_ian', name: 'Ian McShane', birthYear: 1942 },
  { id: 'person_dafoe_willem', name: 'Willem Dafoe', birthYear: 1955 },
  { id: 'person_fishburne_laurence', name: 'Laurence Fishburne', birthYear: 1961 }, // Already exists
  { id: 'person_leguizamo_john', name: 'John Leguizamo', birthYear: 1960 },

  // Speed & Point Break
  { id: 'person_bullock_sandra', name: 'Sandra Bullock', birthYear: 1964 },
  { id: 'person_hopper_dennis', name: 'Dennis Hopper', birthYear: 1936 },
  { id: 'person_swayze_patrick', name: 'Patrick Swayze', birthYear: 1952 },
  { id: 'person_petty_lori', name: 'Lori Petty', birthYear: 1963 },

  // Indiana Jones
  { id: 'person_spielberg_steven', name: 'Steven Spielberg', birthYear: 1946 },
  { id: 'person_allen_karen', name: 'Karen Allen', birthYear: 1951 },
  { id: 'person_capshaw_kate', name: 'Kate Capshaw', birthYear: 1953 },
  { id: 'person_connery_sean', name: 'Sean Connery', birthYear: 1930 },

  // Blade Runner
  { id: 'person_scott_ridley', name: 'Ridley Scott', birthYear: 1937 },
  { id: 'person_young_sean', name: 'Sean Young', birthYear: 1959 },
  { id: 'person_hauer_rutger', name: 'Rutger Hauer', birthYear: 1944 },
  { id: 'person_olmos_edward', name: 'Edward James Olmos', birthYear: 1947 },

  // X-Men
  { id: 'person_singer_bryan', name: 'Bryan Singer', birthYear: 1965 },
  { id: 'person_jackman_hugh', name: 'Hugh Jackman', birthYear: 1968 },
  { id: 'person_stewart_patrick', name: 'Patrick Stewart', birthYear: 1940 },
  { id: 'person_berry_halle', name: 'Halle Berry', birthYear: 1966 },
  { id: 'person_janssen_famke', name: 'Famke Janssen', birthYear: 1964 },
  { id: 'person_marsden_james', name: 'James Marsden', birthYear: 1973 },
  { id: 'person_paquin_anna', name: 'Anna Paquin', birthYear: 1982 },

  // Pirates of the Caribbean
  { id: 'person_verbinski_gore', name: 'Gore Verbinski', birthYear: 1964 },
  { id: 'person_depp_johnny', name: 'Johnny Depp', birthYear: 1963 },
  { id: 'person_rush_geoffrey', name: 'Geoffrey Rush', birthYear: 1951 },
  { id: 'person_knightley_keira', name: 'Keira Knightley', birthYear: 1985 },
  { id: 'person_pryce_jonathan', name: 'Jonathan Pryce', birthYear: 1947 },

  // The Hobbit trilogy
  { id: 'person_freeman_martin', name: 'Martin Freeman', birthYear: 1971 },
  { id: 'person_armitage_richard', name: 'Richard Armitage', birthYear: 1971 },
  { id: 'person_evangelista_lee_pace', name: 'Lee Pace', birthYear: 1979 },

  // King Kong (2005)
  { id: 'person_watts_naomi', name: 'Naomi Watts', birthYear: 1968 },
  { id: 'person_black_jack', name: 'Jack Black', birthYear: 1969 },
  { id: 'person_brody_adrien', name: 'Adrien Brody', birthYear: 1973 },

  // Natalie Portman films
  { id: 'person_aronofsky_darren', name: 'Darren Aronofsky', birthYear: 1969 },
  { id: 'person_kunis_mila', name: 'Mila Kunis', birthYear: 1983 },
  { id: 'person_cassel_vincent', name: 'Vincent Cassel', birthYear: 1966 },
  { id: 'person_mcteigue_james', name: 'James McTeigue', birthYear: 1967 },
  { id: 'person_branagh_kenneth', name: 'Kenneth Branagh', birthYear: 1960 },
  { id: 'person_hemsworth_chris', name: 'Chris Hemsworth', birthYear: 1983 },
  { id: 'person_hiddleston_tom', name: 'Tom Hiddleston', birthYear: 1981 },

  // Samuel L. Jackson films
  { id: 'person_tarantino_quentin', name: 'Quentin Tarantino', birthYear: 1963 },
  { id: 'person_travolta_john', name: 'John Travolta', birthYear: 1954 },
  { id: 'person_thurman_uma', name: 'Uma Thurman', birthYear: 1970 },
  { id: 'person_whedon_joss', name: 'Joss Whedon', birthYear: 1964 },
  { id: 'person_downey_robert', name: 'Robert Downey Jr.', birthYear: 1965 },
  { id: 'person_evans_chris', name: 'Chris Evans', birthYear: 1981 },
  { id: 'person_johansson_scarlett', name: 'Scarlett Johansson', birthYear: 1984 },
  { id: 'person_ruffalo_mark', name: 'Mark Ruffalo', birthYear: 1967 },
  { id: 'person_renner_jeremy', name: 'Jeremy Renner', birthYear: 1971 },

  // Memento (Carrie-Anne Moss)
  { id: 'person_nolan_christopher', name: 'Christopher Nolan', birthYear: 1970 },
  { id: 'person_pearce_guy', name: 'Guy Pearce', birthYear: 1967 },
  { id: 'person_pantoliano_joe', name: 'Joe Pantoliano', birthYear: 1951 }, // Already exists

  // Viggo Mortensen films
  { id: 'person_cronenberg_david', name: 'David Cronenberg', birthYear: 1943 },
  { id: 'person_harris_ed', name: 'Ed Harris', birthYear: 1950 },
  { id: 'person_bello_maria', name: 'Maria Bello', birthYear: 1967 },

  // Cate Blanchett films
  { id: 'person_kapur_shekhar', name: 'Shekhar Kapur', birthYear: 1945 },
  { id: 'person_rush_geoffrey', name: 'Geoffrey Rush', birthYear: 1951 }, // Duplicate
  { id: 'person_fincher_david', name: 'David Fincher', birthYear: 1962 },
  { id: 'person_pitt_brad', name: 'Brad Pitt', birthYear: 1963 },

  // Hugo Weaving - V for Vendetta & The Matrix already covered
  { id: 'person_portman_natalie', name: 'Natalie Portman', birthYear: 1981 }, // Already exists

  // Liam Neeson films
  { id: 'person_morel_pierre', name: 'Pierre Morel', birthYear: 1964 },
  { id: 'person_janssen_famke', name: 'Famke Janssen', birthYear: 1964 }, // Duplicate
  { id: 'person_grace_maggie', name: 'Maggie Grace', birthYear: 1983 },

  // Ewan McGregor films
  { id: 'person_boyle_danny', name: 'Danny Boyle', birthYear: 1956 },
  { id: 'person_carlyle_robert', name: 'Robert Carlyle', birthYear: 1961 },
  { id: 'person_miller_jonny_lee', name: 'Jonny Lee Miller', birthYear: 1972 },

  // Christopher Lee - already in Star Wars/LOTR, extensive career

  // Andy Serkis - additional films
  { id: 'person_wyatt_rupert', name: 'Rupert Wyatt', birthYear: 1972 },
  { id: 'person_franco_james', name: 'James Franco', birthYear: 1978 },
  { id: 'person_pinto_freida', name: 'Freida Pinto', birthYear: 1984 },

  // Elijah Wood - additional films
  { id: 'person_sonnenfeld_barry', name: 'Barry Sonnenfeld', birthYear: 1953 },
  { id: 'person_holm_ian', name: 'Ian Holm', birthYear: 1931 }, // Already exists

  // Sean Bean - additional films
  { id: 'person_boorman_john', name: 'John Boorman', birthYear: 1933 },
  { id: 'person_brosnan_pierce', name: 'Pierce Brosnan', birthYear: 1953 },

  // Mark Hamill - additional work (mostly voice acting but some live action)
  { id: 'person_johnson_rian', name: 'Rian Johnson', birthYear: 1973 },
  { id: 'person_abrams_jj', name: 'J.J. Abrams', birthYear: 1966 }
];

export const expandedMovies: MovieData[] = [
  // Keanu Reeves films
  {
    id: 'movie_john_wick',
    title: 'John Wick',
    year: 2014,
    runtime: 101,
    director: 'person_stahelski_chad',
    writers: ['person_kolstad_derek']
  },
  {
    id: 'movie_john_wick_2',
    title: 'John Wick: Chapter 2',
    year: 2017,
    runtime: 122,
    director: 'person_stahelski_chad',
    writers: ['person_kolstad_derek']
  },
  {
    id: 'movie_john_wick_3',
    title: 'John Wick: Chapter 3 - Parabellum',
    year: 2019,
    runtime: 130,
    director: 'person_stahelski_chad',
    writers: ['person_kolstad_derek']
  },
  {
    id: 'movie_speed',
    title: 'Speed',
    year: 1994,
    runtime: 116,
    director: 'person_de_bont_jan',
    writers: ['person_yost_graham']
  },
  {
    id: 'movie_point_break',
    title: 'Point Break',
    year: 1991,
    runtime: 122,
    director: 'person_bigelow_kathryn',
    writers: ['person_king_rick']
  },

  // Harrison Ford films
  {
    id: 'movie_raiders',
    title: 'Raiders of the Lost Ark',
    year: 1981,
    runtime: 115,
    director: 'person_spielberg_steven',
    writers: ['person_lucas_george', 'person_kasdan_lawrence']
  },
  {
    id: 'movie_temple_doom',
    title: 'Indiana Jones and the Temple of Doom',
    year: 1984,
    runtime: 118,
    director: 'person_spielberg_steven',
    writers: ['person_lucas_george']
  },
  {
    id: 'movie_last_crusade',
    title: 'Indiana Jones and the Last Crusade',
    year: 1989,
    runtime: 127,
    director: 'person_spielberg_steven',
    writers: ['person_lucas_george', 'person_kasdan_lawrence']
  },
  {
    id: 'movie_blade_runner',
    title: 'Blade Runner',
    year: 1982,
    runtime: 117,
    director: 'person_scott_ridley',
    writers: ['person_fancher_hampton', 'person_peoples_david']
  },

  // Ian McKellen - X-Men
  {
    id: 'movie_xmen',
    title: 'X-Men',
    year: 2000,
    runtime: 104,
    director: 'person_singer_bryan',
    writers: ['person_singer_bryan']
  },
  {
    id: 'movie_xmen_2',
    title: 'X2: X-Men United',
    year: 2003,
    runtime: 134,
    director: 'person_singer_bryan',
    writers: ['person_singer_bryan']
  },
  {
    id: 'movie_xmen_last_stand',
    title: 'X-Men: The Last Stand',
    year: 2006,
    runtime: 104,
    director: 'person_ratner_brett',
    writers: ['person_kinberg_simon']
  },

  // Orlando Bloom - Pirates
  {
    id: 'movie_pirates_curse',
    title: 'Pirates of the Caribbean: The Curse of the Black Pearl',
    year: 2003,
    runtime: 143,
    director: 'person_verbinski_gore',
    writers: ['person_elliott_ted', 'person_rossio_terry']
  },
  {
    id: 'movie_pirates_chest',
    title: "Pirates of the Caribbean: Dead Man's Chest",
    year: 2006,
    runtime: 151,
    director: 'person_verbinski_gore',
    writers: ['person_elliott_ted', 'person_rossio_terry']
  },
  {
    id: 'movie_pirates_world_end',
    title: "Pirates of the Caribbean: At World's End",
    year: 2007,
    runtime: 169,
    director: 'person_verbinski_gore',
    writers: ['person_elliott_ted', 'person_rossio_terry']
  },

  // Peter Jackson - The Hobbit
  {
    id: 'movie_hobbit_journey',
    title: 'The Hobbit: An Unexpected Journey',
    year: 2012,
    runtime: 169,
    director: 'person_jackson_peter',
    writers: ['person_jackson_peter', 'person_walsh_fran', 'person_boyens_philippa']
  },
  {
    id: 'movie_hobbit_smaug',
    title: 'The Hobbit: The Desolation of Smaug',
    year: 2013,
    runtime: 161,
    director: 'person_jackson_peter',
    writers: ['person_jackson_peter', 'person_walsh_fran', 'person_boyens_philippa']
  },
  {
    id: 'movie_hobbit_battle',
    title: 'The Hobbit: The Battle of the Five Armies',
    year: 2014,
    runtime: 144,
    director: 'person_jackson_peter',
    writers: ['person_jackson_peter', 'person_walsh_fran', 'person_boyens_philippa']
  },
  {
    id: 'movie_king_kong_2005',
    title: 'King Kong',
    year: 2005,
    runtime: 201,
    director: 'person_jackson_peter',
    writers: ['person_jackson_peter', 'person_walsh_fran', 'person_boyens_philippa']
  },

  // Natalie Portman films
  {
    id: 'movie_black_swan',
    title: 'Black Swan',
    year: 2010,
    runtime: 108,
    director: 'person_aronofsky_darren',
    writers: ['person_heinz_mark', 'person_mclaughlin_andres']
  },
  {
    id: 'movie_v_vendetta',
    title: 'V for Vendetta',
    year: 2005,
    runtime: 132,
    director: 'person_mcteigue_james',
    writers: ['person_wachowski_lana', 'person_wachowski_lilly']
  },
  {
    id: 'movie_thor',
    title: 'Thor',
    year: 2011,
    runtime: 115,
    director: 'person_branagh_kenneth',
    writers: ['person_straczynski_michael']
  },
  {
    id: 'movie_thor_dark_world',
    title: 'Thor: The Dark World',
    year: 2013,
    runtime: 112,
    director: 'person_taylor_alan',
    writers: ['person_payne_don']
  },

  // Samuel L. Jackson films
  {
    id: 'movie_pulp_fiction',
    title: 'Pulp Fiction',
    year: 1994,
    runtime: 154,
    director: 'person_tarantino_quentin',
    writers: ['person_tarantino_quentin', 'person_avary_roger']
  },
  {
    id: 'movie_avengers',
    title: 'The Avengers',
    year: 2012,
    runtime: 143,
    director: 'person_whedon_joss',
    writers: ['person_whedon_joss', 'person_penn_zak']
  },
  {
    id: 'movie_avengers_ultron',
    title: 'Avengers: Age of Ultron',
    year: 2015,
    runtime: 141,
    director: 'person_whedon_joss',
    writers: ['person_whedon_joss']
  },

  // Carrie-Anne Moss
  {
    id: 'movie_memento',
    title: 'Memento',
    year: 2000,
    runtime: 113,
    director: 'person_nolan_christopher',
    writers: ['person_nolan_christopher', 'person_nolan_jonathan']
  },

  // Viggo Mortensen
  {
    id: 'movie_history_violence',
    title: 'A History of Violence',
    year: 2005,
    runtime: 96,
    director: 'person_cronenberg_david',
    writers: ['person_olson_josh']
  },
  {
    id: 'movie_eastern_promises',
    title: 'Eastern Promises',
    year: 2007,
    runtime: 100,
    director: 'person_cronenberg_david',
    writers: ['person_knight_steven']
  },

  // Cate Blanchett
  {
    id: 'movie_elizabeth',
    title: 'Elizabeth',
    year: 1998,
    runtime: 124,
    director: 'person_kapur_shekhar',
    writers: ['person_hirst_michael']
  },
  {
    id: 'movie_curious_case',
    title: 'The Curious Case of Benjamin Button',
    year: 2008,
    runtime: 166,
    director: 'person_fincher_david',
    writers: ['person_roth_eric']
  },

  // Liam Neeson
  {
    id: 'movie_taken',
    title: 'Taken',
    year: 2008,
    runtime: 90,
    director: 'person_morel_pierre',
    writers: ['person_besson_luc', 'person_kamen_robert']
  },
  {
    id: 'movie_taken_2',
    title: 'Taken 2',
    year: 2012,
    runtime: 92,
    director: 'person_megaton_olivier',
    writers: ['person_besson_luc', 'person_kamen_robert']
  },

  // Ewan McGregor
  {
    id: 'movie_trainspotting',
    title: 'Trainspotting',
    year: 1996,
    runtime: 93,
    director: 'person_boyle_danny',
    writers: ['person_hodge_john']
  },
  {
    id: 'movie_moulin_rouge',
    title: 'Moulin Rouge!',
    year: 2001,
    runtime: 127,
    director: 'person_luhrmann_baz',
    writers: ['person_luhrmann_baz']
  },

  // Andy Serkis
  {
    id: 'movie_planet_apes_rise',
    title: 'Rise of the Planet of the Apes',
    year: 2011,
    runtime: 105,
    director: 'person_wyatt_rupert',
    writers: ['person_jaffa_rick', 'person_silver_amanda']
  },

  // Sean Bean
  {
    id: 'movie_goldeneye',
    title: 'GoldenEye',
    year: 1995,
    runtime: 130,
    director: 'person_campbell_martin',
    writers: ['person_france_michael', 'person_wade_jeffrey']
  },

  // Mark Hamill - sequel trilogy
  {
    id: 'movie_force_awakens',
    title: 'Star Wars: The Force Awakens',
    year: 2015,
    runtime: 138,
    director: 'person_abrams_jj',
    writers: ['person_abrams_jj', 'person_kasdan_lawrence']
  },
  {
    id: 'movie_last_jedi',
    title: 'Star Wars: The Last Jedi',
    year: 2017,
    runtime: 152,
    director: 'person_johnson_rian',
    writers: ['person_johnson_rian']
  }
];

// Additional people for these films (writers, additional cast)
export const additionalExpandedPeople: PersonData[] = [
  { id: 'person_kolstad_derek', name: 'Derek Kolstad', birthYear: 1974 },
  { id: 'person_de_bont_jan', name: 'Jan de Bont', birthYear: 1943 },
  { id: 'person_yost_graham', name: 'Graham Yost', birthYear: 1959 },
  { id: 'person_bigelow_kathryn', name: 'Kathryn Bigelow', birthYear: 1951 },
  { id: 'person_king_rick', name: 'W. Peter Iliff', birthYear: 1960 },
  { id: 'person_fancher_hampton', name: 'Hampton Fancher', birthYear: 1938 },
  { id: 'person_peoples_david', name: 'David Peoples', birthYear: 1940 },
  { id: 'person_elliott_ted', name: 'Ted Elliott', birthYear: 1961 },
  { id: 'person_rossio_terry', name: 'Terry Rossio', birthYear: 1960 },
  { id: 'person_ratner_brett', name: 'Brett Ratner', birthYear: 1969 },
  { id: 'person_kinberg_simon', name: 'Simon Kinberg', birthYear: 1973 },
  { id: 'person_heinz_mark', name: 'Mark Heyman', birthYear: 1977 },
  { id: 'person_mclaughlin_andres', name: 'Andres Heinz', birthYear: 1971 },
  { id: 'person_straczynski_michael', name: 'J. Michael Straczynski', birthYear: 1954 },
  { id: 'person_taylor_alan', name: 'Alan Taylor', birthYear: 1959 },
  { id: 'person_payne_don', name: 'Christopher Yost', birthYear: 1973 },
  { id: 'person_avary_roger', name: 'Roger Avary', birthYear: 1965 },
  { id: 'person_penn_zak', name: 'Zak Penn', birthYear: 1968 },
  { id: 'person_nolan_jonathan', name: 'Jonathan Nolan', birthYear: 1976 },
  { id: 'person_olson_josh', name: 'Josh Olson', birthYear: 1966 },
  { id: 'person_knight_steven', name: 'Steven Knight', birthYear: 1959 },
  { id: 'person_hirst_michael', name: 'Michael Hirst', birthYear: 1952 },
  { id: 'person_roth_eric', name: 'Eric Roth', birthYear: 1945 },
  { id: 'person_besson_luc', name: 'Luc Besson', birthYear: 1959 },
  { id: 'person_kamen_robert', name: 'Robert Mark Kamen', birthYear: 1947 },
  { id: 'person_megaton_olivier', name: 'Olivier Megaton', birthYear: 1965 },
  { id: 'person_hodge_john', name: 'John Hodge', birthYear: 1964 },
  { id: 'person_luhrmann_baz', name: 'Baz Luhrmann', birthYear: 1962 },
  { id: 'person_jaffa_rick', name: 'Rick Jaffa', birthYear: 1956 },
  { id: 'person_silver_amanda', name: 'Amanda Silver', birthYear: 1963 },
  { id: 'person_campbell_martin', name: 'Martin Campbell', birthYear: 1943 },
  { id: 'person_france_michael', name: 'Michael France', birthYear: 1962 },
  { id: 'person_wade_jeffrey', name: 'Jeffrey Caine', birthYear: 1944 }
];

// Expanded roles for new movies
export const expandedRoles: RoleData[] = [
  // John Wick trilogy
  {
    id: 'role_jw1_john',
    actor: 'person_reeves_keanu',
    movie: 'movie_john_wick',
    character: 'John Wick'
  },
  {
    id: 'role_jw1_marcus',
    actor: 'person_dafoe_willem',
    movie: 'movie_john_wick',
    character: 'Marcus'
  },
  {
    id: 'role_jw1_viggo',
    actor: 'person_nyqvist_michael',
    movie: 'movie_john_wick',
    character: 'Viggo Tarasov'
  },

  {
    id: 'role_jw2_john',
    actor: 'person_reeves_keanu',
    movie: 'movie_john_wick_2',
    character: 'John Wick'
  },
  {
    id: 'role_jw2_winston',
    actor: 'person_mcshane_ian',
    movie: 'movie_john_wick_2',
    character: 'Winston'
  },
  {
    id: 'role_jw2_bowery',
    actor: 'person_fishburne_laurence',
    movie: 'movie_john_wick_2',
    character: 'The Bowery King'
  },

  {
    id: 'role_jw3_john',
    actor: 'person_reeves_keanu',
    movie: 'movie_john_wick_3',
    character: 'John Wick'
  },
  {
    id: 'role_jw3_winston',
    actor: 'person_mcshane_ian',
    movie: 'movie_john_wick_3',
    character: 'Winston'
  },
  {
    id: 'role_jw3_bowery',
    actor: 'person_fishburne_laurence',
    movie: 'movie_john_wick_3',
    character: 'The Bowery King'
  },

  // Speed
  {
    id: 'role_speed_jack',
    actor: 'person_reeves_keanu',
    movie: 'movie_speed',
    character: 'Jack Traven'
  },
  {
    id: 'role_speed_annie',
    actor: 'person_bullock_sandra',
    movie: 'movie_speed',
    character: 'Annie Porter'
  },
  {
    id: 'role_speed_howard',
    actor: 'person_hopper_dennis',
    movie: 'movie_speed',
    character: 'Howard Payne'
  },
  {
    id: 'role_speed_harry',
    actor: 'person_daniels_jeff',
    movie: 'movie_speed',
    character: 'Harry Temple'
  },

  // Point Break
  {
    id: 'role_pb_johnny',
    actor: 'person_reeves_keanu',
    movie: 'movie_point_break',
    character: 'Johnny Utah'
  },
  {
    id: 'role_pb_bodhi',
    actor: 'person_swayze_patrick',
    movie: 'movie_point_break',
    character: 'Bodhi'
  },
  {
    id: 'role_pb_tyler',
    actor: 'person_petty_lori',
    movie: 'movie_point_break',
    character: 'Tyler'
  },
  {
    id: 'role_pb_pappas',
    actor: 'person_busey_gary',
    movie: 'movie_point_break',
    character: 'Angelo Pappas'
  },

  // Indiana Jones trilogy
  {
    id: 'role_raiders_indy',
    actor: 'person_ford_harrison',
    movie: 'movie_raiders',
    character: 'Indiana Jones'
  },
  {
    id: 'role_raiders_marion',
    actor: 'person_allen_karen',
    movie: 'movie_raiders',
    character: 'Marion Ravenwood'
  },
  {
    id: 'role_raiders_sallah',
    actor: 'person_rhys_davies_john',
    movie: 'movie_raiders',
    character: 'Sallah'
  },

  {
    id: 'role_temple_indy',
    actor: 'person_ford_harrison',
    movie: 'movie_temple_doom',
    character: 'Indiana Jones'
  },
  {
    id: 'role_temple_willie',
    actor: 'person_capshaw_kate',
    movie: 'movie_temple_doom',
    character: 'Willie Scott'
  },

  {
    id: 'role_crusade_indy',
    actor: 'person_ford_harrison',
    movie: 'movie_last_crusade',
    character: 'Indiana Jones'
  },
  {
    id: 'role_crusade_henry',
    actor: 'person_connery_sean',
    movie: 'movie_last_crusade',
    character: 'Henry Jones Sr.'
  },
  {
    id: 'role_crusade_sallah',
    actor: 'person_rhys_davies_john',
    movie: 'movie_last_crusade',
    character: 'Sallah'
  },

  // Blade Runner
  {
    id: 'role_br_deckard',
    actor: 'person_ford_harrison',
    movie: 'movie_blade_runner',
    character: 'Rick Deckard'
  },
  {
    id: 'role_br_rachael',
    actor: 'person_young_sean',
    movie: 'movie_blade_runner',
    character: 'Rachael'
  },
  {
    id: 'role_br_roy',
    actor: 'person_hauer_rutger',
    movie: 'movie_blade_runner',
    character: 'Roy Batty'
  },
  {
    id: 'role_br_gaff',
    actor: 'person_olmos_edward',
    movie: 'movie_blade_runner',
    character: 'Gaff'
  },

  // X-Men trilogy
  {
    id: 'role_xmen_magneto',
    actor: 'person_mckellen_ian',
    movie: 'movie_xmen',
    character: 'Magneto'
  },
  {
    id: 'role_xmen_xavier',
    actor: 'person_stewart_patrick',
    movie: 'movie_xmen',
    character: 'Professor X'
  },
  {
    id: 'role_xmen_wolverine',
    actor: 'person_jackman_hugh',
    movie: 'movie_xmen',
    character: 'Wolverine'
  },
  { id: 'role_xmen_storm', actor: 'person_berry_halle', movie: 'movie_xmen', character: 'Storm' },
  {
    id: 'role_xmen_jean',
    actor: 'person_janssen_famke',
    movie: 'movie_xmen',
    character: 'Jean Grey'
  },
  {
    id: 'role_xmen_cyclops',
    actor: 'person_marsden_james',
    movie: 'movie_xmen',
    character: 'Cyclops'
  },
  { id: 'role_xmen_rogue', actor: 'person_paquin_anna', movie: 'movie_xmen', character: 'Rogue' },

  {
    id: 'role_xmen2_magneto',
    actor: 'person_mckellen_ian',
    movie: 'movie_xmen_2',
    character: 'Magneto'
  },
  {
    id: 'role_xmen2_xavier',
    actor: 'person_stewart_patrick',
    movie: 'movie_xmen_2',
    character: 'Professor X'
  },
  {
    id: 'role_xmen2_wolverine',
    actor: 'person_jackman_hugh',
    movie: 'movie_xmen_2',
    character: 'Wolverine'
  },
  {
    id: 'role_xmen2_storm',
    actor: 'person_berry_halle',
    movie: 'movie_xmen_2',
    character: 'Storm'
  },
  {
    id: 'role_xmen2_jean',
    actor: 'person_janssen_famke',
    movie: 'movie_xmen_2',
    character: 'Jean Grey'
  },

  {
    id: 'role_xmen3_magneto',
    actor: 'person_mckellen_ian',
    movie: 'movie_xmen_last_stand',
    character: 'Magneto'
  },
  {
    id: 'role_xmen3_xavier',
    actor: 'person_stewart_patrick',
    movie: 'movie_xmen_last_stand',
    character: 'Professor X'
  },
  {
    id: 'role_xmen3_wolverine',
    actor: 'person_jackman_hugh',
    movie: 'movie_xmen_last_stand',
    character: 'Wolverine'
  },
  {
    id: 'role_xmen3_storm',
    actor: 'person_berry_halle',
    movie: 'movie_xmen_last_stand',
    character: 'Storm'
  },

  // Pirates trilogy
  {
    id: 'role_pirates1_jack',
    actor: 'person_depp_johnny',
    movie: 'movie_pirates_curse',
    character: 'Captain Jack Sparrow'
  },
  {
    id: 'role_pirates1_will',
    actor: 'person_bloom_orlando',
    movie: 'movie_pirates_curse',
    character: 'Will Turner'
  },
  {
    id: 'role_pirates1_elizabeth',
    actor: 'person_knightley_keira',
    movie: 'movie_pirates_curse',
    character: 'Elizabeth Swann'
  },
  {
    id: 'role_pirates1_barbossa',
    actor: 'person_rush_geoffrey',
    movie: 'movie_pirates_curse',
    character: 'Captain Barbossa'
  },

  {
    id: 'role_pirates2_jack',
    actor: 'person_depp_johnny',
    movie: 'movie_pirates_chest',
    character: 'Captain Jack Sparrow'
  },
  {
    id: 'role_pirates2_will',
    actor: 'person_bloom_orlando',
    movie: 'movie_pirates_chest',
    character: 'Will Turner'
  },
  {
    id: 'role_pirates2_elizabeth',
    actor: 'person_knightley_keira',
    movie: 'movie_pirates_chest',
    character: 'Elizabeth Swann'
  },

  {
    id: 'role_pirates3_jack',
    actor: 'person_depp_johnny',
    movie: 'movie_pirates_world_end',
    character: 'Captain Jack Sparrow'
  },
  {
    id: 'role_pirates3_will',
    actor: 'person_bloom_orlando',
    movie: 'movie_pirates_world_end',
    character: 'Will Turner'
  },
  {
    id: 'role_pirates3_elizabeth',
    actor: 'person_knightley_keira',
    movie: 'movie_pirates_world_end',
    character: 'Elizabeth Swann'
  },
  {
    id: 'role_pirates3_barbossa',
    actor: 'person_rush_geoffrey',
    movie: 'movie_pirates_world_end',
    character: 'Captain Barbossa'
  },

  // Hobbit trilogy
  {
    id: 'role_hobbit1_bilbo',
    actor: 'person_freeman_martin',
    movie: 'movie_hobbit_journey',
    character: 'Bilbo Baggins'
  },
  {
    id: 'role_hobbit1_gandalf',
    actor: 'person_mckellen_ian',
    movie: 'movie_hobbit_journey',
    character: 'Gandalf'
  },
  {
    id: 'role_hobbit1_thorin',
    actor: 'person_armitage_richard',
    movie: 'movie_hobbit_journey',
    character: 'Thorin Oakenshield'
  },
  {
    id: 'role_hobbit1_gollum',
    actor: 'person_serkis_andy',
    movie: 'movie_hobbit_journey',
    character: 'Gollum'
  },
  {
    id: 'role_hobbit1_elrond',
    actor: 'person_weaving_hugo',
    movie: 'movie_hobbit_journey',
    character: 'Elrond'
  },
  {
    id: 'role_hobbit1_galadriel',
    actor: 'person_blanchett_cate',
    movie: 'movie_hobbit_journey',
    character: 'Galadriel'
  },
  {
    id: 'role_hobbit1_saruman',
    actor: 'person_lee_christopher_lotr',
    movie: 'movie_hobbit_journey',
    character: 'Saruman'
  },

  {
    id: 'role_hobbit2_bilbo',
    actor: 'person_freeman_martin',
    movie: 'movie_hobbit_smaug',
    character: 'Bilbo Baggins'
  },
  {
    id: 'role_hobbit2_gandalf',
    actor: 'person_mckellen_ian',
    movie: 'movie_hobbit_smaug',
    character: 'Gandalf'
  },
  {
    id: 'role_hobbit2_thorin',
    actor: 'person_armitage_richard',
    movie: 'movie_hobbit_smaug',
    character: 'Thorin Oakenshield'
  },
  {
    id: 'role_hobbit2_legolas',
    actor: 'person_bloom_orlando',
    movie: 'movie_hobbit_smaug',
    character: 'Legolas'
  },
  {
    id: 'role_hobbit2_tauriel',
    actor: 'person_lilly_evangeline',
    movie: 'movie_hobbit_smaug',
    character: 'Tauriel'
  },

  {
    id: 'role_hobbit3_bilbo',
    actor: 'person_freeman_martin',
    movie: 'movie_hobbit_battle',
    character: 'Bilbo Baggins'
  },
  {
    id: 'role_hobbit3_gandalf',
    actor: 'person_mckellen_ian',
    movie: 'movie_hobbit_battle',
    character: 'Gandalf'
  },
  {
    id: 'role_hobbit3_thorin',
    actor: 'person_armitage_richard',
    movie: 'movie_hobbit_battle',
    character: 'Thorin Oakenshield'
  },
  {
    id: 'role_hobbit3_legolas',
    actor: 'person_bloom_orlando',
    movie: 'movie_hobbit_battle',
    character: 'Legolas'
  },
  {
    id: 'role_hobbit3_galadriel',
    actor: 'person_blanchett_cate',
    movie: 'movie_hobbit_battle',
    character: 'Galadriel'
  },
  {
    id: 'role_hobbit3_saruman',
    actor: 'person_lee_christopher_lotr',
    movie: 'movie_hobbit_battle',
    character: 'Saruman'
  },

  // King Kong
  {
    id: 'role_kong_ann',
    actor: 'person_watts_naomi',
    movie: 'movie_king_kong_2005',
    character: 'Ann Darrow'
  },
  {
    id: 'role_kong_carl',
    actor: 'person_black_jack',
    movie: 'movie_king_kong_2005',
    character: 'Carl Denham'
  },
  {
    id: 'role_kong_jack',
    actor: 'person_brody_adrien',
    movie: 'movie_king_kong_2005',
    character: 'Jack Driscoll'
  },
  {
    id: 'role_kong_andy',
    actor: 'person_serkis_andy',
    movie: 'movie_king_kong_2005',
    character: 'Kong / Lumpy'
  },

  // Black Swan
  {
    id: 'role_bs_nina',
    actor: 'person_portman_natalie',
    movie: 'movie_black_swan',
    character: 'Nina Sayers'
  },
  { id: 'role_bs_lily', actor: 'person_kunis_mila', movie: 'movie_black_swan', character: 'Lily' },
  {
    id: 'role_bs_thomas',
    actor: 'person_cassel_vincent',
    movie: 'movie_black_swan',
    character: 'Thomas Leroy'
  },

  // V for Vendetta
  { id: 'role_v_v', actor: 'person_weaving_hugo', movie: 'movie_v_vendetta', character: 'V' },
  {
    id: 'role_v_evey',
    actor: 'person_portman_natalie',
    movie: 'movie_v_vendetta',
    character: 'Evey Hammond'
  },
  {
    id: 'role_v_finch',
    actor: 'person_rea_stephen',
    movie: 'movie_v_vendetta',
    character: 'Inspector Finch'
  },

  // Thor films
  { id: 'role_thor_thor', actor: 'person_hemsworth_chris', movie: 'movie_thor', character: 'Thor' },
  {
    id: 'role_thor_jane',
    actor: 'person_portman_natalie',
    movie: 'movie_thor',
    character: 'Jane Foster'
  },
  { id: 'role_thor_loki', actor: 'person_hiddleston_tom', movie: 'movie_thor', character: 'Loki' },

  {
    id: 'role_thor2_thor',
    actor: 'person_hemsworth_chris',
    movie: 'movie_thor_dark_world',
    character: 'Thor'
  },
  {
    id: 'role_thor2_jane',
    actor: 'person_portman_natalie',
    movie: 'movie_thor_dark_world',
    character: 'Jane Foster'
  },
  {
    id: 'role_thor2_loki',
    actor: 'person_hiddleston_tom',
    movie: 'movie_thor_dark_world',
    character: 'Loki'
  },

  // Pulp Fiction
  {
    id: 'role_pf_jules',
    actor: 'person_jackson_samuel',
    movie: 'movie_pulp_fiction',
    character: 'Jules Winnfield'
  },
  {
    id: 'role_pf_vincent',
    actor: 'person_travolta_john',
    movie: 'movie_pulp_fiction',
    character: 'Vincent Vega'
  },
  {
    id: 'role_pf_mia',
    actor: 'person_thurman_uma',
    movie: 'movie_pulp_fiction',
    character: 'Mia Wallace'
  },

  // Avengers
  {
    id: 'role_avengers_fury',
    actor: 'person_jackson_samuel',
    movie: 'movie_avengers',
    character: 'Nick Fury'
  },
  {
    id: 'role_avengers_ironman',
    actor: 'person_downey_robert',
    movie: 'movie_avengers',
    character: 'Tony Stark / Iron Man'
  },
  {
    id: 'role_avengers_cap',
    actor: 'person_evans_chris',
    movie: 'movie_avengers',
    character: 'Steve Rogers / Captain America'
  },
  {
    id: 'role_avengers_thor',
    actor: 'person_hemsworth_chris',
    movie: 'movie_avengers',
    character: 'Thor'
  },
  {
    id: 'role_avengers_widow',
    actor: 'person_johansson_scarlett',
    movie: 'movie_avengers',
    character: 'Natasha Romanoff / Black Widow'
  },
  {
    id: 'role_avengers_hulk',
    actor: 'person_ruffalo_mark',
    movie: 'movie_avengers',
    character: 'Bruce Banner / Hulk'
  },
  {
    id: 'role_avengers_hawkeye',
    actor: 'person_renner_jeremy',
    movie: 'movie_avengers',
    character: 'Clint Barton / Hawkeye'
  },
  {
    id: 'role_avengers_loki',
    actor: 'person_hiddleston_tom',
    movie: 'movie_avengers',
    character: 'Loki'
  },

  {
    id: 'role_ultron_fury',
    actor: 'person_jackson_samuel',
    movie: 'movie_avengers_ultron',
    character: 'Nick Fury'
  },
  {
    id: 'role_ultron_ironman',
    actor: 'person_downey_robert',
    movie: 'movie_avengers_ultron',
    character: 'Tony Stark / Iron Man'
  },
  {
    id: 'role_ultron_cap',
    actor: 'person_evans_chris',
    movie: 'movie_avengers_ultron',
    character: 'Steve Rogers / Captain America'
  },
  {
    id: 'role_ultron_thor',
    actor: 'person_hemsworth_chris',
    movie: 'movie_avengers_ultron',
    character: 'Thor'
  },
  {
    id: 'role_ultron_widow',
    actor: 'person_johansson_scarlett',
    movie: 'movie_avengers_ultron',
    character: 'Natasha Romanoff / Black Widow'
  },
  {
    id: 'role_ultron_hulk',
    actor: 'person_ruffalo_mark',
    movie: 'movie_avengers_ultron',
    character: 'Bruce Banner / Hulk'
  },
  {
    id: 'role_ultron_hawkeye',
    actor: 'person_renner_jeremy',
    movie: 'movie_avengers_ultron',
    character: 'Clint Barton / Hawkeye'
  },

  // Memento
  {
    id: 'role_memento_leonard',
    actor: 'person_pearce_guy',
    movie: 'movie_memento',
    character: 'Leonard Shelby'
  },
  {
    id: 'role_memento_natalie',
    actor: 'person_moss_carrie_anne',
    movie: 'movie_memento',
    character: 'Natalie'
  },
  {
    id: 'role_memento_teddy',
    actor: 'person_pantoliano_joe',
    movie: 'movie_memento',
    character: 'Teddy Gammell'
  },

  // History of Violence
  {
    id: 'role_hov_tom',
    actor: 'person_mortensen_viggo',
    movie: 'movie_history_violence',
    character: 'Tom Stall'
  },
  {
    id: 'role_hov_edie',
    actor: 'person_bello_maria',
    movie: 'movie_history_violence',
    character: 'Edie Stall'
  },
  {
    id: 'role_hov_carl',
    actor: 'person_harris_ed',
    movie: 'movie_history_violence',
    character: 'Carl Fogarty'
  },

  // Eastern Promises
  {
    id: 'role_ep_nikolai',
    actor: 'person_mortensen_viggo',
    movie: 'movie_eastern_promises',
    character: 'Nikolai Luzhin'
  },
  {
    id: 'role_ep_anna',
    actor: 'person_watts_naomi',
    movie: 'movie_eastern_promises',
    character: 'Anna Khitrova'
  },

  // Elizabeth
  {
    id: 'role_eliz_elizabeth',
    actor: 'person_blanchett_cate',
    movie: 'movie_elizabeth',
    character: 'Elizabeth I'
  },
  {
    id: 'role_eliz_walsingham',
    actor: 'person_rush_geoffrey',
    movie: 'movie_elizabeth',
    character: 'Sir Francis Walsingham'
  },

  // Curious Case
  {
    id: 'role_ccbb_benjamin',
    actor: 'person_pitt_brad',
    movie: 'movie_curious_case',
    character: 'Benjamin Button'
  },
  {
    id: 'role_ccbb_daisy',
    actor: 'person_blanchett_cate',
    movie: 'movie_curious_case',
    character: 'Daisy'
  },

  // Taken films
  {
    id: 'role_taken_bryan',
    actor: 'person_neeson_liam',
    movie: 'movie_taken',
    character: 'Bryan Mills'
  },
  {
    id: 'role_taken_kim',
    actor: 'person_grace_maggie',
    movie: 'movie_taken',
    character: 'Kim Mills'
  },
  {
    id: 'role_taken_lenore',
    actor: 'person_janssen_famke',
    movie: 'movie_taken',
    character: 'Lenore'
  },

  {
    id: 'role_taken2_bryan',
    actor: 'person_neeson_liam',
    movie: 'movie_taken_2',
    character: 'Bryan Mills'
  },
  {
    id: 'role_taken2_kim',
    actor: 'person_grace_maggie',
    movie: 'movie_taken_2',
    character: 'Kim Mills'
  },
  {
    id: 'role_taken2_lenore',
    actor: 'person_janssen_famke',
    movie: 'movie_taken_2',
    character: 'Lenore'
  },

  // Trainspotting
  {
    id: 'role_train_renton',
    actor: 'person_mcgregor_ewan',
    movie: 'movie_trainspotting',
    character: 'Mark Renton'
  },
  {
    id: 'role_train_begbie',
    actor: 'person_carlyle_robert',
    movie: 'movie_trainspotting',
    character: 'Francis Begbie'
  },
  {
    id: 'role_train_spud',
    actor: 'person_bremner_ewen',
    movie: 'movie_trainspotting',
    character: 'Spud'
  },
  {
    id: 'role_train_sick_boy',
    actor: 'person_miller_jonny_lee',
    movie: 'movie_trainspotting',
    character: 'Sick Boy'
  },

  // Moulin Rouge
  {
    id: 'role_mr_christian',
    actor: 'person_mcgregor_ewan',
    movie: 'movie_moulin_rouge',
    character: 'Christian'
  },
  {
    id: 'role_mr_satine',
    actor: 'person_kidman_nicole',
    movie: 'movie_moulin_rouge',
    character: 'Satine'
  },

  // Rise Planet Apes
  {
    id: 'role_pota_caesar',
    actor: 'person_serkis_andy',
    movie: 'movie_planet_apes_rise',
    character: 'Caesar'
  },
  {
    id: 'role_pota_will',
    actor: 'person_franco_james',
    movie: 'movie_planet_apes_rise',
    character: 'Will Rodman'
  },
  {
    id: 'role_pota_caroline',
    actor: 'person_pinto_freida',
    movie: 'movie_planet_apes_rise',
    character: 'Caroline Aranha'
  },

  // GoldenEye
  {
    id: 'role_ge_alec',
    actor: 'person_bean_sean',
    movie: 'movie_goldeneye',
    character: 'Alec Trevelyan'
  },
  {
    id: 'role_ge_bond',
    actor: 'person_brosnan_pierce',
    movie: 'movie_goldeneye',
    character: 'James Bond'
  },

  // Star Wars sequels
  {
    id: 'role_tfa_luke',
    actor: 'person_hamill_mark',
    movie: 'movie_force_awakens',
    character: 'Luke Skywalker'
  },
  {
    id: 'role_tfa_han',
    actor: 'person_ford_harrison',
    movie: 'movie_force_awakens',
    character: 'Han Solo'
  },
  {
    id: 'role_tfa_leia',
    actor: 'person_fisher_carrie',
    movie: 'movie_force_awakens',
    character: 'General Leia Organa'
  },

  {
    id: 'role_tlj_luke',
    actor: 'person_hamill_mark',
    movie: 'movie_last_jedi',
    character: 'Luke Skywalker'
  },
  {
    id: 'role_tlj_leia',
    actor: 'person_fisher_carrie',
    movie: 'movie_last_jedi',
    character: 'General Leia Organa'
  }
];

// Additional supporting actors
export const supportingActors: PersonData[] = [
  { id: 'person_nyqvist_michael', name: 'Michael Nyqvist', birthYear: 1960 },
  { id: 'person_daniels_jeff', name: 'Jeff Daniels', birthYear: 1955 },
  { id: 'person_busey_gary', name: 'Gary Busey', birthYear: 1944 },
  { id: 'person_lilly_evangeline', name: 'Evangeline Lilly', birthYear: 1979 },
  { id: 'person_rea_stephen', name: 'Stephen Rea', birthYear: 1946 },
  { id: 'person_bremner_ewen', name: 'Ewen Bremner', birthYear: 1972 },
  { id: 'person_kidman_nicole', name: 'Nicole Kidman', birthYear: 1967 }
];
