/**
 * Scenario 8: Collaborative Worldbuilding for a Tabletop RPG
 *
 * 6 players and a DM building a shared fictional universe. Players create
 * characters, locations, factions, and history. The DM retains narrative
 * authority via negation and selective schemas.
 *
 * Tests: collaborative creation, DM negation as narrative authority,
 * selective views (player secrets), provenance, history reconstruction.
 */

import {
  RhizomeDB,
  Delta,
  HyperSchema,
  annotate,
  relate,
  resolveEntity,
  allValuesFor,
  relatedIds,
  buildHyperView,
  resolveHyperView,
  mostRecent,
  trustedAuthor,
  enableTimeTravel
} from './helpers';

describe('Scenario 8: Collaborative Worldbuilding', () => {
  let db: RhizomeDB;
  const dm = 'dungeon-master';
  const playerA = 'player-alice';
  const playerB = 'player-bob';

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory', systemId: 'game-table' });
  });

  it('should let players and DM collaboratively build a world', async () => {
    // Player A creates their character
    await db.persistDelta(annotate(db, 'char-1', 'name', 'Elara Moonwhisper', playerA));
    await db.persistDelta(annotate(db, 'char-1', 'class', 'Ranger', playerA));
    await db.persistDelta(annotate(db, 'char-1', 'level', 5, playerA));

    // Player A proposes their hometown
    await db.persistDelta(annotate(db, 'loc-brightwater', 'name', 'Brightwater', playerA));
    await db.persistDelta(annotate(db, 'loc-brightwater', 'description',
      'A quiet fishing village on the southern coast', playerA));
    await db.persistDelta(relate(db,
      'character', 'char-1', 'hometown',
      'location', 'loc-brightwater', 'residents',
      playerA
    ));

    // DM enriches the location with history and NPCs
    await db.persistDelta(annotate(db, 'loc-brightwater', 'history',
      'Founded 200 years ago by refugees from the Cataclysm', dm));
    await db.persistDelta(annotate(db, 'npc-mayor', 'name', 'Harlan Tidecaller', dm));
    await db.persistDelta(relate(db,
      'location', 'loc-brightwater', 'npcs',
      'npc', 'npc-mayor', 'location',
      dm
    ));

    // Player B creates their character
    await db.persistDelta(annotate(db, 'char-2', 'name', 'Grimjaw', playerB));
    await db.persistDelta(annotate(db, 'char-2', 'class', 'Barbarian', playerB));

    // Verify everyone's contributions are visible
    const elara = resolveEntity(db, 'char-1');
    expect(elara.name).toBe('Elara Moonwhisper');
    expect(elara.class).toBe('Ranger');

    const brightwater = resolveEntity(db, 'loc-brightwater');
    expect(brightwater.name).toBe('Brightwater');
    expect(brightwater.history).toBe('Founded 200 years ago by refugees from the Cataclysm');

    // Brightwater has both player-created description and DM-created history
    const bwNpcs = relatedIds(db, 'loc-brightwater', 'npcs', 'npc');
    expect(bwNpcs).toContain('npc-mayor');
  });

  it('should let the DM negate player contributions (narrative authority)', async () => {
    // Player A proposes a location that conflicts with the DM's world
    const dragonLair = annotate(db, 'loc-dragon-lair', 'name',
      'Ancient Dragon Lair of Doom', playerA, 1000);
    await db.persistDelta(dragonLair);
    const dragonDesc = annotate(db, 'loc-dragon-lair', 'description',
      'A massive cave full of gold and a sleeping dragon', playerA, 1000);
    await db.persistDelta(dragonDesc);

    // DM negates: "There are no dragons in this setting"
    const negation = db.negateDelta(dm, dragonLair.id, 'Dragons are extinct in this world');
    negation.timestamp = 2000;
    await db.persistDelta(negation);

    // The name delta is negated, but the description still exists
    // (each delta is independent)
    const view = resolveEntity(db, 'loc-dragon-lair');
    expect(view.name).toBeUndefined();
    expect(view.description).toBe('A massive cave full of gold and a sleeping dragon');

    // DM also negates the description
    const negation2 = db.negateDelta(dm, dragonDesc.id, 'Location rejected');
    negation2.timestamp = 2001;
    await db.persistDelta(negation2);

    // Now nothing remains
    const view2 = resolveEntity(db, 'loc-dragon-lair');
    expect(view2.name).toBeUndefined();
    expect(view2.description).toBeUndefined();

    // But time-travel shows it was once proposed
    const pastView = resolveEntity(db, 'loc-dragon-lair', 1500);
    expect(pastView.name).toBe('Ancient Dragon Lair of Doom');
  });

  it('should support DM secrets via selective schemas', async () => {
    // DM creates a villain with a secret true name
    await db.persistDelta(annotate(db, 'villain-1', 'known_as', 'The Shadow King', dm));
    await db.persistDelta(annotate(db, 'villain-1', 'true_name', 'Aldric the Betrayer', dm));
    await db.persistDelta(annotate(db, 'villain-1', 'weakness', 'sunlight', dm));
    await db.persistDelta(annotate(db, 'villain-1', 'motivation',
      'Seeks the Orb of Undoing to reverse the Cataclysm', dm));

    // Player-facing schema: only shows known_as and motivation
    const playerSchema: HyperSchema = {
      id: 'player-villain',
      name: 'PlayerVillain',
      select: (objectId, delta) => {
        const props: string[] = [];
        const allowedContexts = ['known_as', 'motivation'];
        for (const p of delta.pointers) {
          if (typeof p.target === 'object' && 'id' in p.target &&
              p.target.id === objectId && p.target.context &&
              allowedContexts.includes(p.target.context)) {
            props.push(p.target.context);
          }
        }
        return props.length > 0 ? props : false;
      },
      transform: {}
    };

    // DM schema: shows everything
    const dmSchema: HyperSchema = {
      id: 'dm-villain',
      name: 'DMVillain',
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

    const playerView = buildHyperView(db, 'villain-1', playerSchema);
    const dmView = buildHyperView(db, 'villain-1', dmSchema);

    // Player sees limited info
    expect(playerView.known_as).toBeDefined();
    expect(playerView.motivation).toBeDefined();
    expect(playerView.true_name).toBeUndefined();
    expect(playerView.weakness).toBeUndefined();

    // DM sees everything
    expect(dmView.known_as).toBeDefined();
    expect(dmView.motivation).toBeDefined();
    expect(dmView.true_name).toBeDefined();
    expect(dmView.weakness).toBeDefined();
  });

  it('should track full session history via provenance', async () => {
    const t1 = 1000; // Session 1
    const t2 = 2000; // Session 2
    const t3 = 3000; // Session 3

    // Session 1: introduce the quest
    await db.persistDelta(annotate(db, 'quest-1', 'name', 'The Missing Merchant', dm, t1));
    await db.persistDelta(annotate(db, 'quest-1', 'status', 'active', dm, t1));

    // Session 2: players discover a clue
    await db.persistDelta(annotate(db, 'clue-1', 'content',
      'Bloodstained ledger found in warehouse', playerA, t2));
    await db.persistDelta(relate(db,
      'quest', 'quest-1', 'clues',
      'clue', 'clue-1', 'quest',
      playerA, t2
    ));

    // Session 3: quest resolved
    await db.persistDelta(annotate(db, 'quest-1', 'status', 'completed', dm, t3));
    await db.persistDelta(annotate(db, 'quest-1', 'resolution',
      'The merchant was kidnapped by the thieves guild', dm, t3));

    // Query quest state at each session
    const questS1 = resolveEntity(db, 'quest-1', t1);
    expect(questS1.status).toBe('active');
    expect(questS1.resolution).toBeUndefined();

    const questS2 = resolveEntity(db, 'quest-1', t2);
    expect(questS2.status).toBe('active'); // still active in session 2

    const questS3 = resolveEntity(db, 'quest-1', t3);
    expect(questS3.status).toBe('completed');
    expect(questS3.resolution).toBe('The merchant was kidnapped by the thieves guild');

    // Track which clues were found by session 2
    const cluesS2 = relatedIds(db, 'quest-1', 'clues', 'clue');
    expect(cluesS2).toContain('clue-1');

    // Provenance: who found the clue?
    const allDeltas = db.queryDeltas({ targetIds: ['clue-1'] });
    const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];
    const clueAuthors = deltasArray.map(d => d.author);
    expect(clueAuthors).toContain(playerA);
  });

  it('should resolve competing player claims using DM as trusted author', async () => {
    // Two players claim different origins for a location
    await db.persistDelta(annotate(db, 'loc-ruins', 'origin',
      'Built by elves in the First Age', playerA, 1000));
    await db.persistDelta(annotate(db, 'loc-ruins', 'origin',
      'Built by dwarves before the Cataclysm', playerB, 1001));

    // DM settles it
    await db.persistDelta(annotate(db, 'loc-ruins', 'origin',
      'Built by an unknown civilization predating both elves and dwarves', dm, 2000));

    // With trustedAuthor resolution, DM's version wins
    const strategy = trustedAuthor([dm, playerA, playerB]);
    const view = resolveHyperView(
      buildHyperView(db, 'loc-ruins'),
      strategy
    );
    expect(view.origin).toBe('Built by an unknown civilization predating both elves and dwarves');

    // All three claims are preserved
    const origins = allValuesFor(db, 'loc-ruins', 'origin');
    expect(origins).toHaveLength(3);
  });
});
