/**
 * EXPANDED movie seed data
 * Adds other notable films from all people in the original dataset
 */

import { MovieData, PersonData, RoleData } from './movie-seed-data';

// Additional people who appear in expanded films
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
  { id: 'role_jw1_john', actor: 'person_reeves_keanu', movie: 'movie_john_wick', character: 'John Wick' },
  { id: 'role_jw1_marcus', actor: 'person_dafoe_willem', movie: 'movie_john_wick', character: 'Marcus' },
  { id: 'role_jw1_viggo', actor: 'person_nyqvist_michael', movie: 'movie_john_wick', character: 'Viggo Tarasov' },

  { id: 'role_jw2_john', actor: 'person_reeves_keanu', movie: 'movie_john_wick_2', character: 'John Wick' },
  { id: 'role_jw2_winston', actor: 'person_mcshane_ian', movie: 'movie_john_wick_2', character: 'Winston' },
  { id: 'role_jw2_bowery', actor: 'person_fishburne_laurence', movie: 'movie_john_wick_2', character: 'The Bowery King' },

  { id: 'role_jw3_john', actor: 'person_reeves_keanu', movie: 'movie_john_wick_3', character: 'John Wick' },
  { id: 'role_jw3_winston', actor: 'person_mcshane_ian', movie: 'movie_john_wick_3', character: 'Winston' },
  { id: 'role_jw3_bowery', actor: 'person_fishburne_laurence', movie: 'movie_john_wick_3', character: 'The Bowery King' },

  // Speed
  { id: 'role_speed_jack', actor: 'person_reeves_keanu', movie: 'movie_speed', character: 'Jack Traven' },
  { id: 'role_speed_annie', actor: 'person_bullock_sandra', movie: 'movie_speed', character: 'Annie Porter' },
  { id: 'role_speed_howard', actor: 'person_hopper_dennis', movie: 'movie_speed', character: 'Howard Payne' },
  { id: 'role_speed_harry', actor: 'person_daniels_jeff', movie: 'movie_speed', character: 'Harry Temple' },

  // Point Break
  { id: 'role_pb_johnny', actor: 'person_reeves_keanu', movie: 'movie_point_break', character: 'Johnny Utah' },
  { id: 'role_pb_bodhi', actor: 'person_swayze_patrick', movie: 'movie_point_break', character: 'Bodhi' },
  { id: 'role_pb_tyler', actor: 'person_petty_lori', movie: 'movie_point_break', character: 'Tyler' },
  { id: 'role_pb_pappas', actor: 'person_busey_gary', movie: 'movie_point_break', character: 'Angelo Pappas' },

  // Indiana Jones trilogy
  { id: 'role_raiders_indy', actor: 'person_ford_harrison', movie: 'movie_raiders', character: 'Indiana Jones' },
  { id: 'role_raiders_marion', actor: 'person_allen_karen', movie: 'movie_raiders', character: 'Marion Ravenwood' },
  { id: 'role_raiders_sallah', actor: 'person_rhys_davies_john', movie: 'movie_raiders', character: 'Sallah' },

  { id: 'role_temple_indy', actor: 'person_ford_harrison', movie: 'movie_temple_doom', character: 'Indiana Jones' },
  { id: 'role_temple_willie', actor: 'person_capshaw_kate', movie: 'movie_temple_doom', character: 'Willie Scott' },

  { id: 'role_crusade_indy', actor: 'person_ford_harrison', movie: 'movie_last_crusade', character: 'Indiana Jones' },
  { id: 'role_crusade_henry', actor: 'person_connery_sean', movie: 'movie_last_crusade', character: 'Henry Jones Sr.' },
  { id: 'role_crusade_sallah', actor: 'person_rhys_davies_john', movie: 'movie_last_crusade', character: 'Sallah' },

  // Blade Runner
  { id: 'role_br_deckard', actor: 'person_ford_harrison', movie: 'movie_blade_runner', character: 'Rick Deckard' },
  { id: 'role_br_rachael', actor: 'person_young_sean', movie: 'movie_blade_runner', character: 'Rachael' },
  { id: 'role_br_roy', actor: 'person_hauer_rutger', movie: 'movie_blade_runner', character: 'Roy Batty' },
  { id: 'role_br_gaff', actor: 'person_olmos_edward', movie: 'movie_blade_runner', character: 'Gaff' },

  // X-Men trilogy
  { id: 'role_xmen_magneto', actor: 'person_mckellen_ian', movie: 'movie_xmen', character: 'Magneto' },
  { id: 'role_xmen_xavier', actor: 'person_stewart_patrick', movie: 'movie_xmen', character: 'Professor X' },
  { id: 'role_xmen_wolverine', actor: 'person_jackman_hugh', movie: 'movie_xmen', character: 'Wolverine' },
  { id: 'role_xmen_storm', actor: 'person_berry_halle', movie: 'movie_xmen', character: 'Storm' },
  { id: 'role_xmen_jean', actor: 'person_janssen_famke', movie: 'movie_xmen', character: 'Jean Grey' },
  { id: 'role_xmen_cyclops', actor: 'person_marsden_james', movie: 'movie_xmen', character: 'Cyclops' },
  { id: 'role_xmen_rogue', actor: 'person_paquin_anna', movie: 'movie_xmen', character: 'Rogue' },

  { id: 'role_xmen2_magneto', actor: 'person_mckellen_ian', movie: 'movie_xmen_2', character: 'Magneto' },
  { id: 'role_xmen2_xavier', actor: 'person_stewart_patrick', movie: 'movie_xmen_2', character: 'Professor X' },
  { id: 'role_xmen2_wolverine', actor: 'person_jackman_hugh', movie: 'movie_xmen_2', character: 'Wolverine' },
  { id: 'role_xmen2_storm', actor: 'person_berry_halle', movie: 'movie_xmen_2', character: 'Storm' },
  { id: 'role_xmen2_jean', actor: 'person_janssen_famke', movie: 'movie_xmen_2', character: 'Jean Grey' },

  { id: 'role_xmen3_magneto', actor: 'person_mckellen_ian', movie: 'movie_xmen_last_stand', character: 'Magneto' },
  { id: 'role_xmen3_xavier', actor: 'person_stewart_patrick', movie: 'movie_xmen_last_stand', character: 'Professor X' },
  { id: 'role_xmen3_wolverine', actor: 'person_jackman_hugh', movie: 'movie_xmen_last_stand', character: 'Wolverine' },
  { id: 'role_xmen3_storm', actor: 'person_berry_halle', movie: 'movie_xmen_last_stand', character: 'Storm' },

  // Pirates trilogy
  { id: 'role_pirates1_jack', actor: 'person_depp_johnny', movie: 'movie_pirates_curse', character: 'Captain Jack Sparrow' },
  { id: 'role_pirates1_will', actor: 'person_bloom_orlando', movie: 'movie_pirates_curse', character: 'Will Turner' },
  { id: 'role_pirates1_elizabeth', actor: 'person_knightley_keira', movie: 'movie_pirates_curse', character: 'Elizabeth Swann' },
  { id: 'role_pirates1_barbossa', actor: 'person_rush_geoffrey', movie: 'movie_pirates_curse', character: 'Captain Barbossa' },

  { id: 'role_pirates2_jack', actor: 'person_depp_johnny', movie: 'movie_pirates_chest', character: 'Captain Jack Sparrow' },
  { id: 'role_pirates2_will', actor: 'person_bloom_orlando', movie: 'movie_pirates_chest', character: 'Will Turner' },
  { id: 'role_pirates2_elizabeth', actor: 'person_knightley_keira', movie: 'movie_pirates_chest', character: 'Elizabeth Swann' },

  { id: 'role_pirates3_jack', actor: 'person_depp_johnny', movie: 'movie_pirates_world_end', character: 'Captain Jack Sparrow' },
  { id: 'role_pirates3_will', actor: 'person_bloom_orlando', movie: 'movie_pirates_world_end', character: 'Will Turner' },
  { id: 'role_pirates3_elizabeth', actor: 'person_knightley_keira', movie: 'movie_pirates_world_end', character: 'Elizabeth Swann' },
  { id: 'role_pirates3_barbossa', actor: 'person_rush_geoffrey', movie: 'movie_pirates_world_end', character: 'Captain Barbossa' },

  // Hobbit trilogy
  { id: 'role_hobbit1_bilbo', actor: 'person_freeman_martin', movie: 'movie_hobbit_journey', character: 'Bilbo Baggins' },
  { id: 'role_hobbit1_gandalf', actor: 'person_mckellen_ian', movie: 'movie_hobbit_journey', character: 'Gandalf' },
  { id: 'role_hobbit1_thorin', actor: 'person_armitage_richard', movie: 'movie_hobbit_journey', character: 'Thorin Oakenshield' },
  { id: 'role_hobbit1_gollum', actor: 'person_serkis_andy', movie: 'movie_hobbit_journey', character: 'Gollum' },
  { id: 'role_hobbit1_elrond', actor: 'person_weaving_hugo', movie: 'movie_hobbit_journey', character: 'Elrond' },
  { id: 'role_hobbit1_galadriel', actor: 'person_blanchett_cate', movie: 'movie_hobbit_journey', character: 'Galadriel' },
  { id: 'role_hobbit1_saruman', actor: 'person_lee_christopher_lotr', movie: 'movie_hobbit_journey', character: 'Saruman' },

  { id: 'role_hobbit2_bilbo', actor: 'person_freeman_martin', movie: 'movie_hobbit_smaug', character: 'Bilbo Baggins' },
  { id: 'role_hobbit2_gandalf', actor: 'person_mckellen_ian', movie: 'movie_hobbit_smaug', character: 'Gandalf' },
  { id: 'role_hobbit2_thorin', actor: 'person_armitage_richard', movie: 'movie_hobbit_smaug', character: 'Thorin Oakenshield' },
  { id: 'role_hobbit2_legolas', actor: 'person_bloom_orlando', movie: 'movie_hobbit_smaug', character: 'Legolas' },
  { id: 'role_hobbit2_tauriel', actor: 'person_lilly_evangeline', movie: 'movie_hobbit_smaug', character: 'Tauriel' },

  { id: 'role_hobbit3_bilbo', actor: 'person_freeman_martin', movie: 'movie_hobbit_battle', character: 'Bilbo Baggins' },
  { id: 'role_hobbit3_gandalf', actor: 'person_mckellen_ian', movie: 'movie_hobbit_battle', character: 'Gandalf' },
  { id: 'role_hobbit3_thorin', actor: 'person_armitage_richard', movie: 'movie_hobbit_battle', character: 'Thorin Oakenshield' },
  { id: 'role_hobbit3_legolas', actor: 'person_bloom_orlando', movie: 'movie_hobbit_battle', character: 'Legolas' },
  { id: 'role_hobbit3_galadriel', actor: 'person_blanchett_cate', movie: 'movie_hobbit_battle', character: 'Galadriel' },
  { id: 'role_hobbit3_saruman', actor: 'person_lee_christopher_lotr', movie: 'movie_hobbit_battle', character: 'Saruman' },

  // King Kong
  { id: 'role_kong_ann', actor: 'person_watts_naomi', movie: 'movie_king_kong_2005', character: 'Ann Darrow' },
  { id: 'role_kong_carl', actor: 'person_black_jack', movie: 'movie_king_kong_2005', character: 'Carl Denham' },
  { id: 'role_kong_jack', actor: 'person_brody_adrien', movie: 'movie_king_kong_2005', character: 'Jack Driscoll' },
  { id: 'role_kong_andy', actor: 'person_serkis_andy', movie: 'movie_king_kong_2005', character: 'Kong / Lumpy' },

  // Black Swan
  { id: 'role_bs_nina', actor: 'person_portman_natalie', movie: 'movie_black_swan', character: 'Nina Sayers' },
  { id: 'role_bs_lily', actor: 'person_kunis_mila', movie: 'movie_black_swan', character: 'Lily' },
  { id: 'role_bs_thomas', actor: 'person_cassel_vincent', movie: 'movie_black_swan', character: 'Thomas Leroy' },

  // V for Vendetta
  { id: 'role_v_v', actor: 'person_weaving_hugo', movie: 'movie_v_vendetta', character: 'V' },
  { id: 'role_v_evey', actor: 'person_portman_natalie', movie: 'movie_v_vendetta', character: 'Evey Hammond' },
  { id: 'role_v_finch', actor: 'person_rea_stephen', movie: 'movie_v_vendetta', character: 'Inspector Finch' },

  // Thor films
  { id: 'role_thor_thor', actor: 'person_hemsworth_chris', movie: 'movie_thor', character: 'Thor' },
  { id: 'role_thor_jane', actor: 'person_portman_natalie', movie: 'movie_thor', character: 'Jane Foster' },
  { id: 'role_thor_loki', actor: 'person_hiddleston_tom', movie: 'movie_thor', character: 'Loki' },

  { id: 'role_thor2_thor', actor: 'person_hemsworth_chris', movie: 'movie_thor_dark_world', character: 'Thor' },
  { id: 'role_thor2_jane', actor: 'person_portman_natalie', movie: 'movie_thor_dark_world', character: 'Jane Foster' },
  { id: 'role_thor2_loki', actor: 'person_hiddleston_tom', movie: 'movie_thor_dark_world', character: 'Loki' },

  // Pulp Fiction
  { id: 'role_pf_jules', actor: 'person_jackson_samuel', movie: 'movie_pulp_fiction', character: 'Jules Winnfield' },
  { id: 'role_pf_vincent', actor: 'person_travolta_john', movie: 'movie_pulp_fiction', character: 'Vincent Vega' },
  { id: 'role_pf_mia', actor: 'person_thurman_uma', movie: 'movie_pulp_fiction', character: 'Mia Wallace' },

  // Avengers
  { id: 'role_avengers_fury', actor: 'person_jackson_samuel', movie: 'movie_avengers', character: 'Nick Fury' },
  { id: 'role_avengers_ironman', actor: 'person_downey_robert', movie: 'movie_avengers', character: 'Tony Stark / Iron Man' },
  { id: 'role_avengers_cap', actor: 'person_evans_chris', movie: 'movie_avengers', character: 'Steve Rogers / Captain America' },
  { id: 'role_avengers_thor', actor: 'person_hemsworth_chris', movie: 'movie_avengers', character: 'Thor' },
  { id: 'role_avengers_widow', actor: 'person_johansson_scarlett', movie: 'movie_avengers', character: 'Natasha Romanoff / Black Widow' },
  { id: 'role_avengers_hulk', actor: 'person_ruffalo_mark', movie: 'movie_avengers', character: 'Bruce Banner / Hulk' },
  { id: 'role_avengers_hawkeye', actor: 'person_renner_jeremy', movie: 'movie_avengers', character: 'Clint Barton / Hawkeye' },
  { id: 'role_avengers_loki', actor: 'person_hiddleston_tom', movie: 'movie_avengers', character: 'Loki' },

  { id: 'role_ultron_fury', actor: 'person_jackson_samuel', movie: 'movie_avengers_ultron', character: 'Nick Fury' },
  { id: 'role_ultron_ironman', actor: 'person_downey_robert', movie: 'movie_avengers_ultron', character: 'Tony Stark / Iron Man' },
  { id: 'role_ultron_cap', actor: 'person_evans_chris', movie: 'movie_avengers_ultron', character: 'Steve Rogers / Captain America' },
  { id: 'role_ultron_thor', actor: 'person_hemsworth_chris', movie: 'movie_avengers_ultron', character: 'Thor' },
  { id: 'role_ultron_widow', actor: 'person_johansson_scarlett', movie: 'movie_avengers_ultron', character: 'Natasha Romanoff / Black Widow' },
  { id: 'role_ultron_hulk', actor: 'person_ruffalo_mark', movie: 'movie_avengers_ultron', character: 'Bruce Banner / Hulk' },
  { id: 'role_ultron_hawkeye', actor: 'person_renner_jeremy', movie: 'movie_avengers_ultron', character: 'Clint Barton / Hawkeye' },

  // Memento
  { id: 'role_memento_leonard', actor: 'person_pearce_guy', movie: 'movie_memento', character: 'Leonard Shelby' },
  { id: 'role_memento_natalie', actor: 'person_moss_carrie_anne', movie: 'movie_memento', character: 'Natalie' },
  { id: 'role_memento_teddy', actor: 'person_pantoliano_joe', movie: 'movie_memento', character: 'Teddy Gammell' },

  // History of Violence
  { id: 'role_hov_tom', actor: 'person_mortensen_viggo', movie: 'movie_history_violence', character: 'Tom Stall' },
  { id: 'role_hov_edie', actor: 'person_bello_maria', movie: 'movie_history_violence', character: 'Edie Stall' },
  { id: 'role_hov_carl', actor: 'person_harris_ed', movie: 'movie_history_violence', character: 'Carl Fogarty' },

  // Eastern Promises
  { id: 'role_ep_nikolai', actor: 'person_mortensen_viggo', movie: 'movie_eastern_promises', character: 'Nikolai Luzhin' },
  { id: 'role_ep_anna', actor: 'person_watts_naomi', movie: 'movie_eastern_promises', character: 'Anna Khitrova' },

  // Elizabeth
  { id: 'role_eliz_elizabeth', actor: 'person_blanchett_cate', movie: 'movie_elizabeth', character: 'Elizabeth I' },
  { id: 'role_eliz_walsingham', actor: 'person_rush_geoffrey', movie: 'movie_elizabeth', character: 'Sir Francis Walsingham' },

  // Curious Case
  { id: 'role_ccbb_benjamin', actor: 'person_pitt_brad', movie: 'movie_curious_case', character: 'Benjamin Button' },
  { id: 'role_ccbb_daisy', actor: 'person_blanchett_cate', movie: 'movie_curious_case', character: 'Daisy' },

  // Taken films
  { id: 'role_taken_bryan', actor: 'person_neeson_liam', movie: 'movie_taken', character: 'Bryan Mills' },
  { id: 'role_taken_kim', actor: 'person_grace_maggie', movie: 'movie_taken', character: 'Kim Mills' },
  { id: 'role_taken_lenore', actor: 'person_janssen_famke', movie: 'movie_taken', character: 'Lenore' },

  { id: 'role_taken2_bryan', actor: 'person_neeson_liam', movie: 'movie_taken_2', character: 'Bryan Mills' },
  { id: 'role_taken2_kim', actor: 'person_grace_maggie', movie: 'movie_taken_2', character: 'Kim Mills' },
  { id: 'role_taken2_lenore', actor: 'person_janssen_famke', movie: 'movie_taken_2', character: 'Lenore' },

  // Trainspotting
  { id: 'role_train_renton', actor: 'person_mcgregor_ewan', movie: 'movie_trainspotting', character: 'Mark Renton' },
  { id: 'role_train_begbie', actor: 'person_carlyle_robert', movie: 'movie_trainspotting', character: 'Francis Begbie' },
  { id: 'role_train_spud', actor: 'person_bremner_ewen', movie: 'movie_trainspotting', character: 'Spud' },
  { id: 'role_train_sick_boy', actor: 'person_miller_jonny_lee', movie: 'movie_trainspotting', character: 'Sick Boy' },

  // Moulin Rouge
  { id: 'role_mr_christian', actor: 'person_mcgregor_ewan', movie: 'movie_moulin_rouge', character: 'Christian' },
  { id: 'role_mr_satine', actor: 'person_kidman_nicole', movie: 'movie_moulin_rouge', character: 'Satine' },

  // Rise Planet Apes
  { id: 'role_pota_caesar', actor: 'person_serkis_andy', movie: 'movie_planet_apes_rise', character: 'Caesar' },
  { id: 'role_pota_will', actor: 'person_franco_james', movie: 'movie_planet_apes_rise', character: 'Will Rodman' },
  { id: 'role_pota_caroline', actor: 'person_pinto_freida', movie: 'movie_planet_apes_rise', character: 'Caroline Aranha' },

  // GoldenEye
  { id: 'role_ge_alec', actor: 'person_bean_sean', movie: 'movie_goldeneye', character: 'Alec Trevelyan' },
  { id: 'role_ge_bond', actor: 'person_brosnan_pierce', movie: 'movie_goldeneye', character: 'James Bond' },

  // Star Wars sequels
  { id: 'role_tfa_luke', actor: 'person_hamill_mark', movie: 'movie_force_awakens', character: 'Luke Skywalker' },
  { id: 'role_tfa_han', actor: 'person_ford_harrison', movie: 'movie_force_awakens', character: 'Han Solo' },
  { id: 'role_tfa_leia', actor: 'person_fisher_carrie', movie: 'movie_force_awakens', character: 'General Leia Organa' },

  { id: 'role_tlj_luke', actor: 'person_hamill_mark', movie: 'movie_last_jedi', character: 'Luke Skywalker' },
  { id: 'role_tlj_leia', actor: 'person_fisher_carrie', movie: 'movie_last_jedi', character: 'General Leia Organa' }
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
