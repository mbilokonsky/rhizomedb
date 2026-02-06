/**
 * CLI Integration Tests
 *
 * Tests execute CLI scripts as child processes and parse JSON stdout.
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
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rhizome-cli-test-'));
  dataDir = path.join(testDir, 'data');
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('CLI: init', () => {
  it('should initialize a data directory', () => {
    const { parsed } = cli('init.ts');
    const result = parsed as { systemId: string; dataDir: string };
    expect(result.systemId).toBeDefined();
    expect(result.dataDir).toBeDefined();
    expect(fs.existsSync(dataDir)).toBe(true);
  });

  it('should be idempotent', () => {
    const { parsed: first } = cli('init.ts');
    const { parsed: second } = cli('init.ts');
    const r1 = first as { systemId: string };
    const r2 = second as { systemId: string };
    expect(r1.systemId).toBe(r2.systemId);
  });
});

describe('CLI: status', () => {
  it('should fail if not initialized', () => {
    const stderr = cliFail('status.ts');
    expect(stderr).toContain('Not initialized');
  });

  it('should return stats after init', () => {
    cli('init.ts');
    const { parsed } = cli('status.ts');
    const result = parsed as { systemId: string; totalDeltas: number; storageType: string };
    expect(result.systemId).toBeDefined();
    expect(result.totalDeltas).toBe(0);
    expect(result.storageType).toBe('leveldb');
  });
});

describe('CLI: delta-create', () => {
  beforeEach(() => { cli('init.ts'); });

  it('should create a delta with valid input', () => {
    const { parsed } = cli('delta-create.ts', {
      author: 'test-agent',
      pointers: [
        { role: 'named', target: { id: 'alice', context: 'name' } },
        { role: 'name', target: 'Alice Smith' }
      ]
    });
    const delta = parsed as { id: string; author: string; pointers: unknown[] };
    expect(delta.id).toBeDefined();
    expect(delta.author).toBe('test-agent');
    expect(delta.pointers).toHaveLength(2);
  });

  it('should fail with missing author', () => {
    const stderr = cliFail('delta-create.ts', {
      pointers: [{ role: 'test', target: 'value' }]
    });
    expect(stderr).toContain('author');
  });

  it('should fail with invalid pointers', () => {
    const stderr = cliFail('delta-create.ts', {
      author: 'test',
      pointers: [{ role: '', target: 'value' }]
    });
    expect(stderr).toContain('Invalid pointer');
  });
});

describe('CLI: delta-get', () => {
  beforeEach(() => { cli('init.ts'); });

  it('should retrieve an existing delta', () => {
    const { parsed: created } = cli('delta-create.ts', {
      author: 'test',
      pointers: [{ role: 'test', target: 'value' }]
    });
    const deltaId = (created as { id: string }).id;

    const { parsed: fetched } = cli('delta-get.ts', { id: deltaId });
    expect((fetched as { id: string }).id).toBe(deltaId);
  });

  it('should fail for nonexistent delta', () => {
    const stderr = cliFail('delta-get.ts', { id: 'nonexistent-id' });
    expect(stderr).toContain('not found');
  });
});

describe('CLI: delta-list', () => {
  beforeEach(() => { cli('init.ts'); });

  it('should list all deltas', () => {
    cli('delta-create.ts', { author: 'a1', pointers: [{ role: 'r', target: 'v1' }] });
    cli('delta-create.ts', { author: 'a2', pointers: [{ role: 'r', target: 'v2' }] });

    const { parsed } = cli('delta-list.ts');
    const result = parsed as { deltas: unknown[]; count: number };
    expect(result.count).toBe(2);
    expect(result.deltas).toHaveLength(2);
  });

  it('should filter by author', () => {
    cli('delta-create.ts', { author: 'a1', pointers: [{ role: 'r', target: 'v1' }] });
    cli('delta-create.ts', { author: 'a2', pointers: [{ role: 'r', target: 'v2' }] });

    const { parsed } = cli('delta-list.ts', { author: 'a1' });
    const result = parsed as { count: number };
    expect(result.count).toBe(1);
  });

  it('should respect limit', () => {
    cli('delta-create.ts', { author: 'a', pointers: [{ role: 'r', target: 'v1' }] });
    cli('delta-create.ts', { author: 'a', pointers: [{ role: 'r', target: 'v2' }] });
    cli('delta-create.ts', { author: 'a', pointers: [{ role: 'r', target: 'v3' }] });

    const { parsed } = cli('delta-list.ts', { limit: 2 });
    const result = parsed as { count: number };
    expect(result.count).toBe(2);
  });
});

describe('CLI: negate', () => {
  beforeEach(() => { cli('init.ts'); });

  it('should negate an existing delta', () => {
    const { parsed: created } = cli('delta-create.ts', {
      author: 'test',
      pointers: [{ role: 'test', target: 'value' }]
    });
    const deltaId = (created as { id: string }).id;

    const { parsed: negation } = cli('negate.ts', {
      deltaId,
      author: 'test'
    });
    const neg = negation as { id: string; pointers: Array<{ role: string }> };
    expect(neg.id).toBeDefined();
    expect(neg.pointers.some(p => p.role === 'negates')).toBe(true);
  });

  it('should fail for nonexistent delta', () => {
    const stderr = cliFail('negate.ts', {
      deltaId: 'nonexistent',
      author: 'test'
    });
    expect(stderr).toContain('not found');
  });
});

describe('CLI: query', () => {
  beforeEach(() => { cli('init.ts'); });

  it('should return resolved view', () => {
    cli('delta-create.ts', {
      author: 'test',
      pointers: [
        { role: 'named', target: { id: 'alice', context: 'name' } },
        { role: 'name', target: 'Alice Smith' }
      ]
    });

    const { parsed } = cli('query.ts', { objectId: 'alice' });
    const view = parsed as { id: string; name: string };
    expect(view.id).toBe('alice');
    expect(view.name).toBe('Alice Smith');
  });

  it('should return raw HyperView when resolve=false', () => {
    cli('delta-create.ts', {
      author: 'test',
      pointers: [
        { role: 'named', target: { id: 'bob', context: 'name' } },
        { role: 'name', target: 'Bob' }
      ]
    });

    const { parsed } = cli('query.ts', { objectId: 'bob', resolve: false });
    const view = parsed as { id: string; name: unknown[] };
    expect(view.id).toBe('bob');
    expect(Array.isArray(view.name)).toBe(true);
  });

  it('should return empty object for nonexistent entity', () => {
    const { parsed } = cli('query.ts', { objectId: 'nonexistent' });
    const view = parsed as { id: string };
    expect(view.id).toBe('nonexistent');
  });
});

describe('CLI: time-travel', () => {
  beforeEach(() => { cli('init.ts'); });

  it('should query at a past timestamp', () => {
    const before = Date.now();

    cli('delta-create.ts', {
      author: 'test',
      pointers: [
        { role: 'named', target: { id: 'entity1', context: 'name' } },
        { role: 'name', target: 'First' }
      ]
    });

    // Query at a timestamp before the delta was created
    const { parsed } = cli('time-travel.ts', {
      objectId: 'entity1',
      timestamp: before - 1000
    });
    const view = parsed as { id: string; name?: unknown[] };
    expect(view.id).toBe('entity1');
    // Should not have name since delta was after the query timestamp
    expect(view.name).toBeUndefined();
  });
});

describe('CLI: schema-register + schema-list', () => {
  beforeEach(() => { cli('init.ts'); });

  it('should register and list schemas', () => {
    cli('schema-register.ts', {
      id: 'person_schema',
      name: 'Person',
      properties: ['name', 'age']
    });

    const { parsed } = cli('schema-list.ts');
    const result = parsed as { schemas: Array<{ id: string; name: string; properties: string[] }>; count: number };
    expect(result.count).toBe(1);
    expect(result.schemas[0].id).toBe('person_schema');
    expect(result.schemas[0].name).toBe('Person');
    expect(result.schemas[0].properties).toContain('name');
    expect(result.schemas[0].properties).toContain('age');
  });
});

describe('CLI: full round-trip', () => {
  beforeEach(() => { cli('init.ts'); });

  it('should init -> create -> query -> negate -> query', () => {
    // Create
    const { parsed: created } = cli('delta-create.ts', {
      author: 'agent-1',
      pointers: [
        { role: 'named', target: { id: 'entity_x', context: 'name' } },
        { role: 'name', target: 'Entity X' }
      ]
    });
    const deltaId = (created as { id: string }).id;

    // Query — should see the name
    const { parsed: view1 } = cli('query.ts', { objectId: 'entity_x' });
    expect((view1 as { name: string }).name).toBe('Entity X');

    // Negate
    cli('negate.ts', { deltaId, author: 'agent-1' });

    // Query again — name should be gone
    const { parsed: view2 } = cli('query.ts', { objectId: 'entity_x' });
    expect((view2 as { id: string }).id).toBe('entity_x');
    expect((view2 as Record<string, unknown>).name).toBeUndefined();
  });
});
