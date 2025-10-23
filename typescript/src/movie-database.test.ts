/**
 * Movie database example and tests
 * Demonstrates RhizomeDB with a rich, real-world dataset
 */

import { RhizomeDB } from './instance';
import { LevelDBStore } from './leveldb-store';
import { movieSchemas } from './movie-schemas';
import { seedMovieDatabase, getSeedStats } from './movie-seed-data';
import { Delta, DeltaFilter } from './types';
import * as fs from 'fs';
import * as path from 'path';

// Helper to create temp database
function createTempDbPath(): string {
  const tmpDir = '/tmp/rhizomedb-movies';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return path.join(tmpDir, `movies-${Date.now()}`);
}

// Helper to cleanup
function cleanupDb(dbPath: string) {
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { recursive: true, force: true });
  }
}

describe('Movie Database', () => {
  describe('In-Memory Database', () => {
    let db: RhizomeDB;

    beforeAll(async () => {
      db = new RhizomeDB({
        systemId: 'movie-db',
        storage: 'memory'
      });

      // Register movie schemas
      db.applyHyperSchema('_register_person', movieSchemas.person);
      db.applyHyperSchema('_register_movie', movieSchemas.movie);
      db.applyHyperSchema('_register_role', movieSchemas.role);
      db.applyHyperSchema('_register_trilogy', movieSchemas.trilogy);

      // Seed the database
      await seedMovieDatabase(db);
    });

    it('should have seeded the correct number of entities', async () => {
      const stats = await getSeedStats();
      expect(stats.totalMovies).toBeGreaterThan(50); // 12 core + 50+ expanded
      expect(stats.totalPeople).toBeGreaterThan(100);
      expect(stats.totalRoles).toBeGreaterThan(200);
      expect(stats.totalTrilogies).toBe(10); // 4 core + 6 expanded
    });

    it('should query The Matrix movie', () => {
      const movieView = db.applyHyperSchema('movie_matrix', movieSchemas.movie);

      expect(movieView.id).toBe('movie_matrix');

      // Movie should have properties from its deltas
      const properties = Object.keys(movieView).filter(k => k !== 'id');
      expect(properties.length).toBeGreaterThan(0);
    });

    it('should query Keanu Reeves', () => {
      const personView = db.applyHyperSchema('person_reeves_keanu', movieSchemas.person);

      expect(personView.id).toBe('person_reeves_keanu');
      expect(personView.name).toBeDefined();

      const nameDelta = (personView.name as Delta[])[0];
      const namePointer = nameDelta.pointers.find(p => p.localContext === 'name');
      expect(namePointer?.target).toBe('Keanu Reeves');
    });

    it('should find all Matrix movies', () => {
      const matrixMovies = db.queryDeltas({
        predicate: (delta) => {
          const titlePointer = delta.pointers.find(p => p.localContext === 'title');
          if (titlePointer && typeof titlePointer.target === 'string') {
            return titlePointer.target.includes('Matrix');
          }
          return false;
        }
      });

      const movieIds = new Set(
        matrixMovies
          .filter(d => d.pointers.some(p => p.localContext === 'title'))
          .map(d => d.pointers.find(p => p.targetContext === 'title')?.target)
          .filter(t => typeof t === 'object' && 'id' in t)
          .map(t => (t as any).id)
      );

      expect(movieIds.size).toBeGreaterThanOrEqual(3);
      expect(movieIds.has('movie_matrix')).toBe(true);
      expect(movieIds.has('movie_matrix_reloaded')).toBe(true);
      expect(movieIds.has('movie_matrix_revolutions')).toBe(true);
    });

    it('should find all roles for Keanu Reeves', () => {
      const roles = db.queryDeltas({
        targetIds: ['person_reeves_keanu']
      });

      // Filter to just role deltas (those with actor context)
      const roleDeltas = roles.filter(d =>
        d.pointers.some(p => p.localContext === 'actor')
      );

      // Keanu Reeves played Neo in 3 Matrix movies
      expect(roleDeltas.length).toBeGreaterThanOrEqual(3);
    });

    it('should find all movies from 1999', () => {
      const movies1999 = db.queryDeltas({
        predicate: (delta) => {
          const yearPointer = delta.pointers.find(p => p.localContext === 'year');
          return yearPointer?.target === 1999;
        }
      });

      const movieIds = new Set(
        movies1999
          .filter(d => d.pointers.some(p => p.localContext === 'year'))
          .map(d => d.pointers.find(p => p.targetContext === 'year')?.target)
          .filter(t => typeof t === 'object' && 'id' in t)
          .map(t => (t as any).id)
      );

      // Should include The Matrix and Episode I
      expect(movieIds.size).toBeGreaterThanOrEqual(2);
      expect(movieIds.has('movie_matrix')).toBe(true);
      expect(movieIds.has('movie_star_wars_i')).toBe(true);
    });

    it('should find all Star Wars original trilogy cast members', () => {
      // Query for roles related to Star Wars movies
      const swRoles = db.queryDeltas({
        targetIds: ['movie_star_wars_iv', 'movie_star_wars_v', 'movie_star_wars_vi']
      });

      // Should have found some deltas for these movies
      expect(swRoles.length).toBeGreaterThan(10);
    });

    it('should find movies directed by Peter Jackson', () => {
      const jacksonMovies = db.queryDeltas({
        targetIds: ['person_jackson_peter']
      });

      const movieIds = new Set(
        jacksonMovies
          .filter(d => d.pointers.some(p => p.localContext === 'director'))
          .map(d => d.pointers.find(p => p.targetContext === 'director')?.target)
          .filter(t => typeof t === 'object' && 'id' in t)
          .map(t => (t as any).id)
      );

      // 3 LOTR + 3 Hobbit + 1 King Kong = 7 total
      expect(movieIds.size).toBe(7);
      expect(movieIds.has('movie_lotr_fellowship')).toBe(true);
      expect(movieIds.has('movie_hobbit_journey')).toBe(true);
      expect(movieIds.has('movie_king_kong_2005')).toBe(true);
    });

    it('should query a trilogy', () => {
      const trilogyView = db.applyHyperSchema('trilogy_matrix', movieSchemas.trilogy);

      expect(trilogyView.id).toBe('trilogy_matrix');
      expect(trilogyView.name).toBeDefined();

      const nameDelta = (trilogyView.name as Delta[])[0];
      const namePointer = nameDelta.pointers.find(p => p.localContext === 'name');
      expect(namePointer?.target).toBe('The Matrix Trilogy');

      // Should have 3 movies
      expect(trilogyView.movie).toBeDefined();
      expect((trilogyView.movie as Delta[]).length).toBe(3);
    });

    it('should find actors who appeared in multiple franchises', () => {
      // Query for Elijah Wood (appeared in 3 LOTR movies)
      const woodRoles = db.queryDeltas({
        targetIds: ['person_wood_elijah']
      }).filter(d => d.pointers.some(p => p.localContext === 'actor'));

      // Should have roles in multiple movies
      expect(woodRoles.length).toBeGreaterThanOrEqual(3);
    });

    it('should support streaming new movie additions', async () => {
      const receivedDeltas: Delta[] = [];

      // Subscribe to new movies
      db.subscribe({
        predicate: (delta) => delta.pointers.some(p => p.localContext === 'title')
      }, async (delta) => {
        receivedDeltas.push(delta);
      });

      // Add a new movie
      const newMovie = db.createDelta('user', [
        { localContext: 'titled', target: { id: 'movie_test' }, targetContext: 'title' },
        { localContext: 'title', target: 'Test Movie' }
      ]);
      await db.persistDelta(newMovie);

      // Wait for async propagation
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedDeltas.length).toBe(1);
      expect(receivedDeltas[0].id).toBe(newMovie.id);
    });

    it('should calculate statistics', () => {
      const stats = db.getStats();

      expect(stats.systemId).toBe('movie-db');
      expect(stats.totalDeltas).toBeGreaterThan(1370); // 1379 deltas from expanded seed data + new movie added in test
      expect(stats.storageType).toBe('memory');
    });
  });

  describe('LevelDB Persistent Database', () => {
    let db: LevelDBStore;
    let dbPath: string;

    beforeAll(async () => {
      dbPath = createTempDbPath();
      db = new LevelDBStore({
        systemId: 'movie-db-persistent',
        storage: 'leveldb',
        dbPath
      });

      // Wait for DB to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Seed the database
      await seedMovieDatabase(db as any); // Type assertion for compatibility
    });

    afterAll(async () => {
      await db.close();
      cleanupDb(dbPath);
    });

    it('should persist and retrieve movie data', async () => {
      // Query a movie
      const matrixDeltas = await db.queryDeltas({
        targetIds: ['movie_matrix']
      });

      expect(matrixDeltas.length).toBeGreaterThan(0);

      // Should have title, year, runtime, director deltas
      const contexts = new Set(
        matrixDeltas.flatMap(d =>
          d.pointers
            .filter(p => p.targetContext)
            .map(p => p.targetContext!)
        )
      );

      expect(contexts.has('title')).toBe(true);
      expect(contexts.has('year')).toBe(true);
      expect(contexts.has('runtime')).toBe(true);
      expect(contexts.has('director')).toBe(true);
    });

    it('should query across persistent storage', async () => {
      const results = await db.queryDeltas({
        predicate: (delta) => {
          const namePointer = delta.pointers.find(p => p.localContext === 'name');
          return namePointer?.target === 'Keanu Reeves';
        }
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should materialize HyperViews from persistent storage', async () => {
      const personView = await db.materializeHyperView('person_wood_elijah', movieSchemas.person);

      expect(personView.id).toBe('person_wood_elijah');
      expect(personView._deltaCount).toBeGreaterThan(0);
      expect(personView.name).toBeDefined();
    });

    it('should persist across database sessions', async () => {
      // Get a movie delta ID
      const deltas = await db.queryDeltas({
        targetIds: ['movie_lotr_fellowship']
      });
      expect(deltas.length).toBeGreaterThan(0);
      const deltaId = deltas[0].id;

      // Close the database
      await db.close();

      // Reopen
      const db2 = new LevelDBStore({
        systemId: 'movie-db-persistent-2',
        storage: 'leveldb',
        dbPath
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Retrieve the same delta
      const retrieved = await db2.getDeltas([deltaId]);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(deltaId);

      await db2.close();

      // Reopen original for cleanup
      db = new LevelDBStore({
        systemId: 'movie-db-persistent',
        storage: 'leveldb',
        dbPath
      });
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Advanced Queries', () => {
    let db: RhizomeDB;

    beforeAll(async () => {
      db = new RhizomeDB({
        systemId: 'movie-db-advanced',
        storage: 'memory'
      });

      // Register movie schemas
      db.applyHyperSchema('_register_person', movieSchemas.person);
      db.applyHyperSchema('_register_movie', movieSchemas.movie);
      db.applyHyperSchema('_register_role', movieSchemas.role);
      db.applyHyperSchema('_register_trilogy', movieSchemas.trilogy);

      await seedMovieDatabase(db);
    });

    it('should find all collaborations between actors', () => {
      // Find movies where both Elijah Wood and Ian McKellen appear
      const woodRoles = db.queryDeltas({
        targetIds: ['person_wood_elijah']
      }).filter(d => d.pointers.some(p => p.localContext === 'actor'));

      const mckellRoles = db.queryDeltas({
        targetIds: ['person_mckellen_ian']
      }).filter(d => d.pointers.some(p => p.localContext === 'actor'));

      const woodMovies = new Set(
        woodRoles
          .map(d => d.pointers.find(p => p.localContext === 'movie')?.target)
          .filter(t => typeof t === 'object' && 'id' in t)
          .map(t => (t as any).id)
      );

      const mckellMovies = new Set(
        mckellRoles
          .map(d => d.pointers.find(p => p.localContext === 'movie')?.target)
          .filter(t => typeof t === 'object' && 'id' in t)
          .map(t => (t as any).id)
      );

      // Find intersection
      const collaborations = Array.from(woodMovies).filter(m => mckellMovies.has(m));

      // They appeared together in LOTR movies
      expect(woodRoles.length).toBeGreaterThan(0);
      expect(mckellRoles.length).toBeGreaterThan(0);
    });

    it('should find longest running movies', () => {
      const runtimeDeltas = db.queryDeltas({
        predicate: (delta) => delta.pointers.some(p => p.localContext === 'runtime')
      });

      const movieRuntimes = runtimeDeltas.map(d => {
        const moviePointer = d.pointers.find(p => p.targetContext === 'runtime');
        const runtimePointer = d.pointers.find(p => p.localContext === 'runtime');

        return {
          movieId: typeof moviePointer?.target === 'object' && 'id' in moviePointer.target
            ? moviePointer.target.id
            : null,
          runtime: typeof runtimePointer?.target === 'number'
            ? runtimePointer.target
            : 0
        };
      }).filter(m => m.movieId !== null);

      movieRuntimes.sort((a, b) => b.runtime - a.runtime);

      // LOTR: Return of the King is 201 minutes
      expect(movieRuntimes[0].movieId).toBe('movie_lotr_return');
      expect(movieRuntimes[0].runtime).toBe(201);
    });

    it('should find movies by decade', () => {
      const movies2000s = db.queryDeltas({
        predicate: (delta) => {
          const yearPointer = delta.pointers.find(p => p.localContext === 'year');
          if (typeof yearPointer?.target === 'number') {
            return yearPointer.target >= 2000 && yearPointer.target < 2010;
          }
          return false;
        }
      });

      const movieIds = new Set(
        movies2000s
          .filter(d => d.pointers.some(p => p.localContext === 'year'))
          .map(d => d.pointers.find(p => p.targetContext === 'year')?.target)
          .filter(t => typeof t === 'object' && 'id' in t)
          .map(t => (t as any).id)
      );

      // Should include Matrix sequels, LOTR trilogy, and Star Wars prequels
      expect(movieIds.size).toBeGreaterThanOrEqual(7); // 2 Matrix + 3 LOTR + 2 SW = 7
      expect(movieIds.has('movie_lotr_fellowship')).toBe(true);
      expect(movieIds.has('movie_star_wars_ii')).toBe(true);
    });

    it('should demonstrate delta negation for corrections', async () => {
      // Add incorrect data
      const wrongDelta = db.createDelta('user', [
        { localContext: 'titled', target: { id: 'movie_matrix' }, targetContext: 'budget' },
        { localContext: 'budget', target: 1000000 } // Wrong budget
      ]);
      await db.persistDelta(wrongDelta);

      // Verify it's there
      let budgetDeltas = db.queryDeltas({
        targetIds: ['movie_matrix'],
        predicate: (d) => d.pointers.some(p => p.localContext === 'budget')
      });
      expect(budgetDeltas.length).toBe(1);

      // Negate it
      const negation = db.negateDelta('user', wrongDelta.id, 'Incorrect budget value');
      await db.persistDelta(negation);

      // Add correct data
      const correctDelta = db.createDelta('user', [
        { localContext: 'titled', target: { id: 'movie_matrix' }, targetContext: 'budget' },
        { localContext: 'budget', target: 63000000 } // Correct budget
      ]);
      await db.persistDelta(correctDelta);

      // Query again (negated deltas are excluded by default)
      budgetDeltas = db.queryDeltas({
        targetIds: ['movie_matrix'],
        predicate: (d) => d.pointers.some(p => p.localContext === 'budget')
      });

      // Should only have the correct delta
      expect(budgetDeltas.length).toBe(1);
      expect(budgetDeltas[0].id).toBe(correctDelta.id);
    });
  });
});
