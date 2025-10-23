/**
 * Seed data generator for movie database
 * Creates deltas for The Matrix, Star Wars, and Lord of the Rings franchises
 */

import { Delta, Pointer } from './types';
import { RhizomeDB } from './instance';

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
  deltas.push(db.createDelta('seed', [
    { localContext: 'named', target: { id: person.id }, targetContext: 'name' },
    { localContext: 'name', target: person.name }
  ]));

  // Birth year (if available)
  if (person.birthYear) {
    deltas.push(db.createDelta('seed', [
      { localContext: 'born', target: { id: person.id }, targetContext: 'birthYear' },
      { localContext: 'birthYear', target: person.birthYear }
    ]));
  }

  return deltas;
}

/**
 * Generate deltas for a movie
 */
function createMovieDeltas(db: RhizomeDB, movie: MovieData): Delta[] {
  const deltas: Delta[] = [];

  // Title
  deltas.push(db.createDelta('seed', [
    { localContext: 'titled', target: { id: movie.id }, targetContext: 'title' },
    { localContext: 'title', target: movie.title }
  ]));

  // Year
  deltas.push(db.createDelta('seed', [
    { localContext: 'released', target: { id: movie.id }, targetContext: 'year' },
    { localContext: 'year', target: movie.year }
  ]));

  // Runtime
  deltas.push(db.createDelta('seed', [
    { localContext: 'runs', target: { id: movie.id }, targetContext: 'runtime' },
    { localContext: 'runtime', target: movie.runtime }
  ]));

  // Director
  deltas.push(db.createDelta('seed', [
    { localContext: 'directed_by', target: { id: movie.id }, targetContext: 'director' },
    { localContext: 'director', target: { id: movie.director } }
  ]));

  // Producers
  if (movie.producers) {
    for (const producer of movie.producers) {
      deltas.push(db.createDelta('seed', [
        { localContext: 'produced_by', target: { id: movie.id }, targetContext: 'producer' },
        { localContext: 'producer', target: { id: producer } }
      ]));
    }
  }

  // Writers
  if (movie.writers) {
    for (const writer of movie.writers) {
      deltas.push(db.createDelta('seed', [
        { localContext: 'written_by', target: { id: movie.id }, targetContext: 'writer' },
        { localContext: 'writer', target: { id: writer } }
      ]));
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
  deltas.push(db.createDelta('seed', [
    { localContext: 'performed_by', target: { id: role.id }, targetContext: 'actor' },
    { localContext: 'actor', target: { id: role.actor } }
  ]));

  // Movie
  deltas.push(db.createDelta('seed', [
    { localContext: 'appears_in', target: { id: role.id }, targetContext: 'movie' },
    { localContext: 'movie', target: { id: role.movie } }
  ]));

  // Character name
  deltas.push(db.createDelta('seed', [
    { localContext: 'portrays', target: { id: role.id }, targetContext: 'character' },
    { localContext: 'character', target: role.character }
  ]));

  return deltas;
}

/**
 * Generate deltas for a trilogy
 */
function createTrilogyDeltas(db: RhizomeDB, trilogyId: string, name: string, movieIds: string[]): Delta[] {
  const deltas: Delta[] = [];

  // Name
  deltas.push(db.createDelta('seed', [
    { localContext: 'named', target: { id: trilogyId }, targetContext: 'name' },
    { localContext: 'name', target: name }
  ]));

  // Movies
  for (const movieId of movieIds) {
    deltas.push(db.createDelta('seed', [
      { localContext: 'contains', target: { id: trilogyId }, targetContext: 'movie' },
      { localContext: 'movie', target: { id: movieId } }
    ]));
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
  { id: 'role_matrix_trinity', actor: 'person_moss_carrie_anne', movie: 'movie_matrix', character: 'Trinity' },
  { id: 'role_matrix_morpheus', actor: 'person_fishburne_laurence', movie: 'movie_matrix', character: 'Morpheus' },
  { id: 'role_matrix_smith', actor: 'person_weaving_hugo', movie: 'movie_matrix', character: 'Agent Smith' },
  { id: 'role_matrix_cypher', actor: 'person_pantoliano_joe', movie: 'movie_matrix', character: 'Cypher' },
  { id: 'role_matrix_oracle', actor: 'person_foster_gloria', movie: 'movie_matrix', character: 'The Oracle' },

  { id: 'role_reloaded_neo', actor: 'person_reeves_keanu', movie: 'movie_matrix_reloaded', character: 'Neo' },
  { id: 'role_reloaded_trinity', actor: 'person_moss_carrie_anne', movie: 'movie_matrix_reloaded', character: 'Trinity' },
  { id: 'role_reloaded_morpheus', actor: 'person_fishburne_laurence', movie: 'movie_matrix_reloaded', character: 'Morpheus' },
  { id: 'role_reloaded_smith', actor: 'person_weaving_hugo', movie: 'movie_matrix_reloaded', character: 'Agent Smith' },
  { id: 'role_reloaded_persephone', actor: 'person_belushi_monica', movie: 'movie_matrix_reloaded', character: 'Persephone' },

  { id: 'role_revolutions_neo', actor: 'person_reeves_keanu', movie: 'movie_matrix_revolutions', character: 'Neo' },
  { id: 'role_revolutions_trinity', actor: 'person_moss_carrie_anne', movie: 'movie_matrix_revolutions', character: 'Trinity' },
  { id: 'role_revolutions_morpheus', actor: 'person_fishburne_laurence', movie: 'movie_matrix_revolutions', character: 'Morpheus' },
  { id: 'role_revolutions_smith', actor: 'person_weaving_hugo', movie: 'movie_matrix_revolutions', character: 'Agent Smith' }
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
  { id: 'role_sw4_luke', actor: 'person_hamill_mark', movie: 'movie_star_wars_iv', character: 'Luke Skywalker' },
  { id: 'role_sw4_han', actor: 'person_ford_harrison', movie: 'movie_star_wars_iv', character: 'Han Solo' },
  { id: 'role_sw4_leia', actor: 'person_fisher_carrie', movie: 'movie_star_wars_iv', character: 'Princess Leia' },
  { id: 'role_sw4_obiwan', actor: 'person_guinness_alec', movie: 'movie_star_wars_iv', character: 'Obi-Wan Kenobi' },
  { id: 'role_sw4_vader', actor: 'person_prowse_david', movie: 'movie_star_wars_iv', character: 'Darth Vader' },
  { id: 'role_sw4_r2d2', actor: 'person_baker_kenny', movie: 'movie_star_wars_iv', character: 'R2-D2' },
  { id: 'role_sw4_c3po', actor: 'person_daniels_anthony', movie: 'movie_star_wars_iv', character: 'C-3PO' },
  { id: 'role_sw4_chewbacca', actor: 'person_mayhew_peter', movie: 'movie_star_wars_iv', character: 'Chewbacca' },

  // Episode V
  { id: 'role_sw5_luke', actor: 'person_hamill_mark', movie: 'movie_star_wars_v', character: 'Luke Skywalker' },
  { id: 'role_sw5_han', actor: 'person_ford_harrison', movie: 'movie_star_wars_v', character: 'Han Solo' },
  { id: 'role_sw5_leia', actor: 'person_fisher_carrie', movie: 'movie_star_wars_v', character: 'Princess Leia' },
  { id: 'role_sw5_vader', actor: 'person_prowse_david', movie: 'movie_star_wars_v', character: 'Darth Vader' },
  { id: 'role_sw5_r2d2', actor: 'person_baker_kenny', movie: 'movie_star_wars_v', character: 'R2-D2' },
  { id: 'role_sw5_c3po', actor: 'person_daniels_anthony', movie: 'movie_star_wars_v', character: 'C-3PO' },
  { id: 'role_sw5_chewbacca', actor: 'person_mayhew_peter', movie: 'movie_star_wars_v', character: 'Chewbacca' },

  // Episode VI
  { id: 'role_sw6_luke', actor: 'person_hamill_mark', movie: 'movie_star_wars_vi', character: 'Luke Skywalker' },
  { id: 'role_sw6_han', actor: 'person_ford_harrison', movie: 'movie_star_wars_vi', character: 'Han Solo' },
  { id: 'role_sw6_leia', actor: 'person_fisher_carrie', movie: 'movie_star_wars_vi', character: 'Princess Leia' },
  { id: 'role_sw6_vader', actor: 'person_prowse_david', movie: 'movie_star_wars_vi', character: 'Darth Vader' },
  { id: 'role_sw6_r2d2', actor: 'person_baker_kenny', movie: 'movie_star_wars_vi', character: 'R2-D2' },
  { id: 'role_sw6_c3po', actor: 'person_daniels_anthony', movie: 'movie_star_wars_vi', character: 'C-3PO' },
  { id: 'role_sw6_chewbacca', actor: 'person_mayhew_peter', movie: 'movie_star_wars_vi', character: 'Chewbacca' },

  // Episode I
  { id: 'role_sw1_obiwan', actor: 'person_mcgregor_ewan', movie: 'movie_star_wars_i', character: 'Obi-Wan Kenobi' },
  { id: 'role_sw1_quigon', actor: 'person_neeson_liam', movie: 'movie_star_wars_i', character: 'Qui-Gon Jinn' },
  { id: 'role_sw1_anakin', actor: 'person_lloyd_jake', movie: 'movie_star_wars_i', character: 'Anakin Skywalker' },
  { id: 'role_sw1_padme', actor: 'person_portman_natalie', movie: 'movie_star_wars_i', character: 'Padmé Amidala' },
  { id: 'role_sw1_palpatine', actor: 'person_mcdermid_ian', movie: 'movie_star_wars_i', character: 'Senator Palpatine' },
  { id: 'role_sw1_r2d2', actor: 'person_baker_kenny', movie: 'movie_star_wars_i', character: 'R2-D2' },
  { id: 'role_sw1_c3po', actor: 'person_daniels_anthony', movie: 'movie_star_wars_i', character: 'C-3PO' },

  // Episode II
  { id: 'role_sw2_obiwan', actor: 'person_mcgregor_ewan', movie: 'movie_star_wars_ii', character: 'Obi-Wan Kenobi' },
  { id: 'role_sw2_anakin', actor: 'person_christensen_hayden', movie: 'movie_star_wars_ii', character: 'Anakin Skywalker' },
  { id: 'role_sw2_padme', actor: 'person_portman_natalie', movie: 'movie_star_wars_ii', character: 'Padmé Amidala' },
  { id: 'role_sw2_palpatine', actor: 'person_mcdermid_ian', movie: 'movie_star_wars_ii', character: 'Supreme Chancellor Palpatine' },
  { id: 'role_sw2_dooku', actor: 'person_lee_christopher', movie: 'movie_star_wars_ii', character: 'Count Dooku' },
  { id: 'role_sw2_mace', actor: 'person_jackson_samuel', movie: 'movie_star_wars_ii', character: 'Mace Windu' },
  { id: 'role_sw2_r2d2', actor: 'person_baker_kenny', movie: 'movie_star_wars_ii', character: 'R2-D2' },
  { id: 'role_sw2_c3po', actor: 'person_daniels_anthony', movie: 'movie_star_wars_ii', character: 'C-3PO' },

  // Episode III
  { id: 'role_sw3_obiwan', actor: 'person_mcgregor_ewan', movie: 'movie_star_wars_iii', character: 'Obi-Wan Kenobi' },
  { id: 'role_sw3_anakin', actor: 'person_christensen_hayden', movie: 'movie_star_wars_iii', character: 'Anakin Skywalker / Darth Vader' },
  { id: 'role_sw3_padme', actor: 'person_portman_natalie', movie: 'movie_star_wars_iii', character: 'Padmé Amidala' },
  { id: 'role_sw3_palpatine', actor: 'person_mcdermid_ian', movie: 'movie_star_wars_iii', character: 'Emperor Palpatine' },
  { id: 'role_sw3_dooku', actor: 'person_lee_christopher', movie: 'movie_star_wars_iii', character: 'Count Dooku' },
  { id: 'role_sw3_mace', actor: 'person_jackson_samuel', movie: 'movie_star_wars_iii', character: 'Mace Windu' },
  { id: 'role_sw3_r2d2', actor: 'person_baker_kenny', movie: 'movie_star_wars_iii', character: 'R2-D2' },
  { id: 'role_sw3_c3po', actor: 'person_daniels_anthony', movie: 'movie_star_wars_iii', character: 'C-3PO' }
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
  { id: 'role_fellowship_frodo', actor: 'person_wood_elijah', movie: 'movie_lotr_fellowship', character: 'Frodo Baggins' },
  { id: 'role_fellowship_gandalf', actor: 'person_mckellen_ian', movie: 'movie_lotr_fellowship', character: 'Gandalf' },
  { id: 'role_fellowship_aragorn', actor: 'person_mortensen_viggo', movie: 'movie_lotr_fellowship', character: 'Aragorn' },
  { id: 'role_fellowship_sam', actor: 'person_astin_sean', movie: 'movie_lotr_fellowship', character: 'Samwise Gamgee' },
  { id: 'role_fellowship_boromir', actor: 'person_bean_sean', movie: 'movie_lotr_fellowship', character: 'Boromir' },
  { id: 'role_fellowship_legolas', actor: 'person_bloom_orlando', movie: 'movie_lotr_fellowship', character: 'Legolas' },
  { id: 'role_fellowship_gimli', actor: 'person_rhys_davies_john', movie: 'movie_lotr_fellowship', character: 'Gimli' },
  { id: 'role_fellowship_merry', actor: 'person_monaghan_dominic', movie: 'movie_lotr_fellowship', character: 'Merry' },
  { id: 'role_fellowship_pippin', actor: 'person_boyd_billy', movie: 'movie_lotr_fellowship', character: 'Pippin' },
  { id: 'role_fellowship_arwen', actor: 'person_tyler_liv', movie: 'movie_lotr_fellowship', character: 'Arwen' },
  { id: 'role_fellowship_galadriel', actor: 'person_blanchett_cate', movie: 'movie_lotr_fellowship', character: 'Galadriel' },
  { id: 'role_fellowship_saruman', actor: 'person_lee_christopher_lotr', movie: 'movie_lotr_fellowship', character: 'Saruman' },
  { id: 'role_fellowship_bilbo', actor: 'person_holm_ian', movie: 'movie_lotr_fellowship', character: 'Bilbo Baggins' },

  // Two Towers
  { id: 'role_towers_frodo', actor: 'person_wood_elijah', movie: 'movie_lotr_two_towers', character: 'Frodo Baggins' },
  { id: 'role_towers_gandalf', actor: 'person_mckellen_ian', movie: 'movie_lotr_two_towers', character: 'Gandalf' },
  { id: 'role_towers_aragorn', actor: 'person_mortensen_viggo', movie: 'movie_lotr_two_towers', character: 'Aragorn' },
  { id: 'role_towers_sam', actor: 'person_astin_sean', movie: 'movie_lotr_two_towers', character: 'Samwise Gamgee' },
  { id: 'role_towers_legolas', actor: 'person_bloom_orlando', movie: 'movie_lotr_two_towers', character: 'Legolas' },
  { id: 'role_towers_gimli', actor: 'person_rhys_davies_john', movie: 'movie_lotr_two_towers', character: 'Gimli' },
  { id: 'role_towers_merry', actor: 'person_monaghan_dominic', movie: 'movie_lotr_two_towers', character: 'Merry' },
  { id: 'role_towers_pippin', actor: 'person_boyd_billy', movie: 'movie_lotr_two_towers', character: 'Pippin' },
  { id: 'role_towers_arwen', actor: 'person_tyler_liv', movie: 'movie_lotr_two_towers', character: 'Arwen' },
  { id: 'role_towers_gollum', actor: 'person_serkis_andy', movie: 'movie_lotr_two_towers', character: 'Gollum' },
  { id: 'role_towers_saruman', actor: 'person_lee_christopher_lotr', movie: 'movie_lotr_two_towers', character: 'Saruman' },

  // Return of the King
  { id: 'role_return_frodo', actor: 'person_wood_elijah', movie: 'movie_lotr_return', character: 'Frodo Baggins' },
  { id: 'role_return_gandalf', actor: 'person_mckellen_ian', movie: 'movie_lotr_return', character: 'Gandalf' },
  { id: 'role_return_aragorn', actor: 'person_mortensen_viggo', movie: 'movie_lotr_return', character: 'Aragorn' },
  { id: 'role_return_sam', actor: 'person_astin_sean', movie: 'movie_lotr_return', character: 'Samwise Gamgee' },
  { id: 'role_return_legolas', actor: 'person_bloom_orlando', movie: 'movie_lotr_return', character: 'Legolas' },
  { id: 'role_return_gimli', actor: 'person_rhys_davies_john', movie: 'movie_lotr_return', character: 'Gimli' },
  { id: 'role_return_merry', actor: 'person_monaghan_dominic', movie: 'movie_lotr_return', character: 'Merry' },
  { id: 'role_return_pippin', actor: 'person_boyd_billy', movie: 'movie_lotr_return', character: 'Pippin' },
  { id: 'role_return_arwen', actor: 'person_tyler_liv', movie: 'movie_lotr_return', character: 'Arwen' },
  { id: 'role_return_gollum', actor: 'person_serkis_andy', movie: 'movie_lotr_return', character: 'Gollum' },
  { id: 'role_return_galadriel', actor: 'person_blanchett_cate', movie: 'movie_lotr_return', character: 'Galadriel' },
  { id: 'role_return_saruman', actor: 'person_lee_christopher_lotr', movie: 'movie_lotr_return', character: 'Saruman' }
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
export async function seedMovieDatabase(db: RhizomeDB): Promise<void> {
  const allDeltas: Delta[] = [];

  // Matrix franchise
  console.log('Seeding Matrix trilogy...');
  for (const person of [...matrixPeople, ...additionalPeople]) {
    allDeltas.push(...createPersonDeltas(db, person));
  }
  for (const movie of matrixMovies) {
    allDeltas.push(...createMovieDeltas(db, movie));
  }
  for (const role of matrixRoles) {
    allDeltas.push(...createRoleDeltas(db, role));
  }
  allDeltas.push(...createTrilogyDeltas(
    db,
    'trilogy_matrix',
    'The Matrix Trilogy',
    ['movie_matrix', 'movie_matrix_reloaded', 'movie_matrix_revolutions']
  ));

  // Star Wars franchise
  console.log('Seeding Star Wars saga...');
  for (const person of starWarsPeople) {
    allDeltas.push(...createPersonDeltas(db, person));
  }
  for (const movie of starWarsMovies) {
    allDeltas.push(...createMovieDeltas(db, movie));
  }
  for (const role of starWarsRoles) {
    allDeltas.push(...createRoleDeltas(db, role));
  }
  allDeltas.push(...createTrilogyDeltas(
    db,
    'trilogy_star_wars_original',
    'Star Wars: Original Trilogy',
    ['movie_star_wars_iv', 'movie_star_wars_v', 'movie_star_wars_vi']
  ));
  allDeltas.push(...createTrilogyDeltas(
    db,
    'trilogy_star_wars_prequel',
    'Star Wars: Prequel Trilogy',
    ['movie_star_wars_i', 'movie_star_wars_ii', 'movie_star_wars_iii']
  ));

  // Lord of the Rings franchise
  console.log('Seeding Lord of the Rings trilogy...');
  for (const person of lotrPeople) {
    allDeltas.push(...createPersonDeltas(db, person));
  }
  for (const movie of lotrMovies) {
    allDeltas.push(...createMovieDeltas(db, movie));
  }
  for (const role of lotrRoles) {
    allDeltas.push(...createRoleDeltas(db, role));
  }
  allDeltas.push(...createTrilogyDeltas(
    db,
    'trilogy_lotr',
    'The Lord of the Rings Trilogy',
    ['movie_lotr_fellowship', 'movie_lotr_two_towers', 'movie_lotr_return']
  ));

  // Persist all deltas
  console.log(`Persisting ${allDeltas.length} deltas...`);
  await db.persistDeltas(allDeltas);
  console.log('Movie database seeded successfully!');
}

/**
 * Get statistics about seeded data
 */
export function getSeedStats(): {
  totalMovies: number;
  totalPeople: number;
  totalRoles: number;
  totalTrilogies: number;
} {
  return {
    totalMovies: matrixMovies.length + starWarsMovies.length + lotrMovies.length,
    totalPeople: matrixPeople.length + starWarsPeople.length + lotrPeople.length + additionalPeople.length,
    totalRoles: matrixRoles.length + starWarsRoles.length + lotrRoles.length,
    totalTrilogies: 4 // Matrix, SW Original, SW Prequel, LOTR
  };
}
