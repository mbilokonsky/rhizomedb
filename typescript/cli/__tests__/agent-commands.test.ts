/**
 * Agent Coordination Command Tests
 *
 * Tests for claim, relate, retract — the semantic layer on top of raw deltas.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const ROOT = path.resolve(__dirname, '../..');
const TS_NODE = path.join(ROOT, 'node_modules', '.bin', 'ts-node');

let testDir: string;
let dataDir: string;

function cli(script: string, input?: Record<string, unknown>): { stdout: string; parsed: unknown } {
  const scriptPath = path.join(ROOT, 'cli', script);
  const args = input ? [JSON.stringify(input)] : [];
  const result = execSync(
    `"${TS_NODE}" "${scriptPath}" ${args.map(a => `'${a}'`).join(' ')}`,
    {
      cwd: ROOT,
      env: { ...process.env, RHIZOME_DATA: dataDir },
      encoding: 'utf-8',
      timeout: 30000
    }
  );
  return { stdout: result, parsed: JSON.parse(result) };
}

function cliFail(script: string, input?: Record<string, unknown>): string {
  const scriptPath = path.join(ROOT, 'cli', script);
  const args = input ? [JSON.stringify(input)] : [];
  try {
    execSync(
      `"${TS_NODE}" "${scriptPath}" ${args.map(a => `'${a}'`).join(' ')}`,
      {
        cwd: ROOT,
        env: { ...process.env, RHIZOME_DATA: dataDir },
        encoding: 'utf-8',
        timeout: 30000
      }
    );
    throw new Error('Expected command to fail');
  } catch (err: unknown) {
    const error = err as { stderr?: string; status?: number };
    return error.stderr || '';
  }
}

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rhizome-agent-test-'));
  dataDir = path.join(testDir, 'data');
  cli('init.ts');
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('CLI: claim', () => {
  it('should assert a fact about an entity', () => {
    const { parsed } = cli('claim.ts', {
      entity: 'alice',
      property: 'name',
      value: 'Alice Smith',
      author: 'agent-1'
    });
    const result = parsed as { deltaId: string; entity: string; property: string; value: string };
    expect(result.deltaId).toBeDefined();
    expect(result.entity).toBe('alice');
    expect(result.property).toBe('name');
    expect(result.value).toBe('Alice Smith');
  });

  it('should create queryable data', () => {
    cli('claim.ts', {
      entity: 'alice',
      property: 'name',
      value: 'Alice Smith',
      author: 'agent-1'
    });

    const { parsed } = cli('query.ts', { objectId: 'alice' });
    const view = parsed as { id: string; name: string };
    expect(view.id).toBe('alice');
    expect(view.name).toBe('Alice Smith');
  });

  it('should support numeric values', () => {
    cli('claim.ts', {
      entity: 'alice',
      property: 'age',
      value: 30,
      author: 'agent-1'
    });

    const { parsed } = cli('query.ts', { objectId: 'alice' });
    const view = parsed as { id: string; age: number };
    expect(view.age).toBe(30);
  });

  it('should accept custom role override', () => {
    cli('claim.ts', {
      entity: 'alice',
      property: 'name',
      value: 'Alice',
      author: 'agent-1',
      role: 'called'
    });

    // Verify the delta was created (query should still work since the context is the same)
    const { parsed } = cli('query.ts', { objectId: 'alice' });
    const view = parsed as { id: string; name: string };
    expect(view.name).toBe('Alice');
  });

  it('should fail with missing fields', () => {
    const stderr = cliFail('claim.ts', { entity: 'alice', property: 'name', author: 'a' });
    expect(stderr).toContain('value');
  });
});

describe('CLI: relate', () => {
  it('should create a relationship between entities', () => {
    const { parsed } = cli('relate.ts', {
      from: 'alice',
      fromContext: 'posts',
      fromRole: 'author',
      to: 'post_1',
      toContext: 'author',
      toRole: 'post',
      author: 'agent-1'
    });
    const result = parsed as { deltaId: string; from: string; to: string };
    expect(result.deltaId).toBeDefined();
    expect(result.from).toBe('alice');
    expect(result.to).toBe('post_1');
  });

  it('should be visible from both sides via query', () => {
    cli('relate.ts', {
      from: 'alice',
      fromContext: 'posts',
      fromRole: 'author',
      to: 'post_1',
      toContext: 'author',
      toRole: 'post',
      author: 'agent-1'
    });

    // Query alice — should see 'posts' context
    const { parsed: aliceView } = cli('query.ts', { objectId: 'alice', resolve: false });
    const alice = aliceView as { id: string; posts?: unknown[] };
    expect(alice.posts).toBeDefined();
    expect(Array.isArray(alice.posts)).toBe(true);

    // Query post_1 — should see 'author' context
    const { parsed: postView } = cli('query.ts', { objectId: 'post_1', resolve: false });
    const post = postView as { id: string; author?: unknown[] };
    expect(post.author).toBeDefined();
    expect(Array.isArray(post.author)).toBe(true);
  });

  it('should fail with missing fields', () => {
    const stderr = cliFail('relate.ts', {
      from: 'alice',
      fromContext: 'posts',
      fromRole: 'author',
      author: 'agent-1'
    });
    expect(stderr).toContain('to');
  });
});

describe('CLI: retract', () => {
  it('should retract a claimed property', () => {
    cli('claim.ts', {
      entity: 'alice',
      property: 'name',
      value: 'Alice Smith',
      author: 'agent-1'
    });

    const { parsed } = cli('retract.ts', {
      entity: 'alice',
      property: 'name',
      author: 'agent-1'
    });
    const result = parsed as { negatedDeltaIds: string[]; count: number };
    expect(result.count).toBe(1);
    expect(result.negatedDeltaIds).toHaveLength(1);
  });

  it('should make property disappear from query', () => {
    cli('claim.ts', {
      entity: 'alice',
      property: 'name',
      value: 'Alice Smith',
      author: 'agent-1'
    });

    // Verify name is present
    const { parsed: before } = cli('query.ts', { objectId: 'alice' });
    expect((before as { name: string }).name).toBe('Alice Smith');

    // Retract
    cli('retract.ts', { entity: 'alice', property: 'name', author: 'agent-1' });

    // Verify name is gone
    const { parsed: after } = cli('query.ts', { objectId: 'alice' });
    expect((after as Record<string, unknown>).name).toBeUndefined();
  });

  it('should fail when no matching deltas exist', () => {
    const stderr = cliFail('retract.ts', {
      entity: 'nonexistent',
      property: 'name',
      author: 'agent-1'
    });
    expect(stderr).toContain('No active deltas');
  });
});

describe('Agent round-trip: claim -> query -> retract -> query', () => {
  it('should complete semantic lifecycle', () => {
    // Claim multiple properties
    cli('claim.ts', { entity: 'bob', property: 'name', value: 'Bob Jones', author: 'agent-1' });
    cli('claim.ts', { entity: 'bob', property: 'age', value: 42, author: 'agent-1' });

    // Query — both properties present
    const { parsed: view1 } = cli('query.ts', { objectId: 'bob' });
    const v1 = view1 as { name: string; age: number };
    expect(v1.name).toBe('Bob Jones');
    expect(v1.age).toBe(42);

    // Retract name only
    cli('retract.ts', { entity: 'bob', property: 'name', author: 'agent-1' });

    // Query — name gone, age remains
    const { parsed: view2 } = cli('query.ts', { objectId: 'bob' });
    const v2 = view2 as Record<string, unknown>;
    expect(v2.name).toBeUndefined();
    expect(v2.age).toBe(42);
  });
});
