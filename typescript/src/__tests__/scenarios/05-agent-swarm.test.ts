/**
 * Scenario 5: Autonomous Agent Swarm Coordination
 *
 * A fleet of AI coding agents working on a shared codebase. Each agent emits
 * deltas about observations, intentions, and actions. The coordination layer
 * resolves conflicting task claims and detects semantic conflicts.
 *
 * Tests: multiple agents writing to same entity, conflicting task claims,
 * resolution strategies, rapid delta accumulation, provenance tracking.
 */

import {
  RhizomeDB,
  Delta,
  annotate,
  relate,
  resolveEntity,
  resolveEntityWith,
  allValuesFor,
  relatedIds,
  buildHyperView,
  mostRecent,
  firstWrite,
  trustedAuthor,
  enableTimeTravel
} from './helpers';

describe('Scenario 5: Autonomous Agent Swarm Coordination', () => {
  let db: RhizomeDB;
  const agents = ['agent-alpha', 'agent-beta', 'agent-gamma', 'agent-delta', 'agent-epsilon'];

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory', systemId: 'swarm-coordinator' });
  });

  it('should handle multiple agents writing different properties of shared entities', async () => {
    const fileId = 'file-src/auth.ts';

    // Agent Alpha analyzes the file
    await db.persistDelta(annotate(db, fileId, 'language', 'typescript', agents[0]));
    await db.persistDelta(annotate(db, fileId, 'loc', 245, agents[0]));

    // Agent Beta identifies dependencies
    await db.persistDelta(relate(db,
      'file', fileId, 'imports',
      'module', 'module-jwt', 'imported_by',
      agents[1]
    ));
    await db.persistDelta(relate(db,
      'file', fileId, 'imports',
      'module', 'module-bcrypt', 'imported_by',
      agents[1]
    ));

    // Agent Gamma identifies issues
    await db.persistDelta(annotate(db, fileId, 'issue',
      'Missing rate limiting on login endpoint', agents[2]));

    // All observations converge
    const view = resolveEntity(db, fileId);
    expect(view.language).toBe('typescript');
    expect(view.loc).toBe(245);
    expect(view.issue).toBe('Missing rate limiting on login endpoint');

    const imports = relatedIds(db, fileId, 'imports', 'module');
    expect(imports).toContain('module-jwt');
    expect(imports).toContain('module-bcrypt');
  });

  it('should detect and surface conflicting task claims', async () => {
    const bugId = 'bug-auth-bypass';

    // Two agents independently claim the same bug
    await db.persistDelta(annotate(db, bugId, 'claimed_by', 'agent-alpha', agents[0], 1000));
    await db.persistDelta(annotate(db, bugId, 'claimed_by', 'agent-beta', agents[1], 1001));

    // Both claims are visible
    const claims = allValuesFor(db, bugId, 'claimed_by');
    expect(claims).toHaveLength(2);
    expect(claims).toContain('agent-alpha');
    expect(claims).toContain('agent-beta');

    // firstWrite resolution: first claim wins
    const firstClaimView = resolveEntityWith(db, bugId, firstWrite);
    expect(firstClaimView.claimed_by).toBe('agent-alpha');

    // mostRecent resolution: latest claim wins
    const latestClaimView = resolveEntity(db, bugId);
    expect(latestClaimView.claimed_by).toBe('agent-beta');
  });

  it('should track agent actions with full provenance chain', async () => {
    const taskId = 'task-refactor-auth';
    const t1 = 1000;
    const t2 = 2000;
    const t3 = 3000;
    const t4 = 4000;

    // Agent claims task
    await db.persistDelta(annotate(db, taskId, 'status', 'claimed', agents[0], t1));
    await db.persistDelta(annotate(db, taskId, 'assignee', 'agent-alpha', agents[0], t1));

    // Agent starts work
    await db.persistDelta(annotate(db, taskId, 'status', 'in_progress', agents[0], t2));

    // Agent records an edit
    await db.persistDelta(relate(db,
      'task', taskId, 'edits',
      'edit', 'edit-001', 'task',
      agents[0], t3
    ));
    await db.persistDelta(annotate(db, 'edit-001', 'file', 'src/auth.ts', agents[0], t3));
    await db.persistDelta(annotate(db, 'edit-001', 'description',
      'Added rate limiting middleware', agents[0], t3));

    // Agent completes task
    await db.persistDelta(annotate(db, taskId, 'status', 'completed', agents[0], t4));

    // Verify timeline
    const timeDB = enableTimeTravel(db);
    const timeline = timeDB.getObjectTimeline(taskId);
    expect(timeline).toEqual([t1, t2, t3, t4]);

    // At t2, task is in_progress
    const viewAtT2 = resolveEntity(db, taskId, t2);
    expect(viewAtT2.status).toBe('in_progress');

    // At t4, task is completed
    const viewAtT4 = resolveEntity(db, taskId, t4);
    expect(viewAtT4.status).toBe('completed');
  });

  it('should handle rapid delta accumulation from many agents', async () => {
    // 5 agents each emit 20 observations = 100 deltas
    const entityId = 'codebase-health';

    for (let agentIdx = 0; agentIdx < agents.length; agentIdx++) {
      for (let i = 0; i < 20; i++) {
        const property = `metric_${agentIdx}_${i}`;
        await db.persistDelta(annotate(
          db, entityId, property, i * (agentIdx + 1), agents[agentIdx]
        ));
      }
    }

    // All 100 deltas recorded
    const allDeltas = db.queryDeltas({ targetIds: [entityId] });
    const deltasArray = Array.isArray(allDeltas) ? allDeltas : [];
    expect(deltasArray.length).toBe(100);

    // Each agent contributed exactly 20
    for (const agent of agents) {
      const agentDeltas = deltasArray.filter(d => d.author === agent);
      expect(agentDeltas.length).toBe(20);
    }
  });

  it('should resolve conflicting edits using scoped authority', async () => {
    const fileId = 'file-config.json';

    // Two agents edit the same configuration value
    await db.persistDelta(annotate(db, fileId, 'max_retries', 3, agents[0], 1000));
    await db.persistDelta(annotate(db, fileId, 'max_retries', 5, agents[1], 1001));

    // The coordination layer designates agent-alpha as authoritative for config
    const configAuthority = trustedAuthor([agents[0]]);
    const view = resolveEntityWith(db, fileId, configAuthority);
    expect(view.max_retries).toBe(3); // alpha's value wins

    // But without authority, the most recent wins
    const defaultView = resolveEntity(db, fileId);
    expect(defaultView.max_retries).toBe(5); // beta's (later) value wins
  });

  it('should negate a rogue agent assertion and track the correction', async () => {
    const fileId = 'file-main.ts';

    // Rogue agent makes an incorrect assertion
    const rogueDelta = annotate(db, fileId, 'status', 'deleted', agents[4], 1000);
    await db.persistDelta(rogueDelta);

    // Coordinator detects and negates
    const correction = db.negateDelta('swarm-coordinator', rogueDelta.id,
      'Agent epsilon made incorrect assertion; file still exists');
    correction.timestamp = 2000;
    await db.persistDelta(correction);

    // Correct status asserted by another agent
    await db.persistDelta(annotate(db, fileId, 'status', 'modified', agents[0], 2000));

    // Current view shows corrected status
    const view = resolveEntity(db, fileId);
    expect(view.status).toBe('modified');
  });
});
