# RhizomeDB Federation Examples

This directory contains examples demonstrating **instance-to-instance federation** in RhizomeDB, as specified in spec §8.

## What is Federation?

Federation allows separate RhizomeDB instances to synchronize deltas over WebSocket connections, enabling:

- **Distributed operation** without central authority
- **Eventual consistency** across instances
- **Partial replication** with filtered delta streams
- **Trust boundaries** to control which deltas are accepted
- **Conflict-free convergence** via delta CRDTs

## Prerequisites

Make sure you have the following dependencies installed:

```bash
npm install ws uuid
npm install --save-dev @types/ws
```

## Examples

### 1. Simple Client-Server (`simple/`)

Basic federation setup with one server and one client.

**Server:**
```bash
npx ts-node examples/federation/simple/server.ts
```

**Client (in a separate terminal):**
```bash
npx ts-node examples/federation/simple/client.ts
```

**What it demonstrates:**
- Creating a federation server
- Connecting a client to a server
- Bidirectional delta synchronization
- Initial sync (client receives all existing deltas)
- Auto-broadcast (server broadcasts local deltas to clients)
- Reconnection with exponential backoff

**Key concepts:**
```typescript
// Server with federation enabled
const server = new FederatedRhizomeDB({
  storage: 'memory',
  systemId: 'my-server',
  federation: {
    enableServer: true,
    serverConfig: { port: 8080 },
    autoBroadcast: true
  }
});

// Client connecting to server
const client = new FederatedRhizomeDB({
  storage: 'memory',
  systemId: 'my-client'
});

await client.connectToRemote('ws://localhost:8080/federation', {
  mode: 'bidirectional',
  initialSync: 'full'
});
```

---

### 2. Hub-and-Spoke Topology (`hub-and-spoke/`)

Demonstrates the hub-and-spoke pattern with multiple clients connecting to a central server.

**Run:**
```bash
npx ts-node examples/federation/hub-and-spoke/index.ts
```

**What it demonstrates:**
- Central hub server with multiple spoke clients
- Collaborative editing across instances
- Delta broadcasting to all connected clients
- Eventual consistency verification
- All spokes converging to the same state

**Topology:**
```
    [Hub Server]
      /    |    \
   [A]   [B]   [C]
```

**Use cases:**
- Collaborative applications
- Real-time dashboards
- Multi-user editing

---

### 3. Trust Policies (`trust-policies/`)

Demonstrates how to control which deltas are accepted using trust policies.

**Run:**
```bash
npx ts-node examples/federation/trust-policies/index.ts
```

**What it demonstrates:**
- System-based trust (only accept from specific systems)
- Author-based trust (only accept from specific authors)
- Custom trust policies (arbitrary verification logic)
- Combined trust policies (multiple policies AND-ed together)
- Delta rejection tracking

**Trust policy types:**

```typescript
// 1. Author-based trust
const policy = createAuthorTrustPolicy(['alice', 'bob']);

// 2. System-based trust
const policy = createSystemTrustPolicy(['trusted-system-1']);

// 3. Custom verification
const policy = createCustomTrustPolicy((delta) => {
  return delta.pointers.some(p => p.localContext === 'verified');
});

// 4. Combined policies (must pass ALL)
const policy = combineTrustPolicies(
  createAuthorTrustPolicy(['alice']),
  createSystemTrustPolicy(['trusted-client-1'])
);
```

**Use cases:**
- Public/private network boundaries
- Multi-tenant systems
- Security-sensitive applications
- Content moderation

---

## Federation Configuration

### Server Configuration

```typescript
const server = new FederatedRhizomeDB({
  storage: 'memory',
  systemId: 'my-server',
  federation: {
    // Enable WebSocket server
    enableServer: true,

    // Server options
    serverConfig: {
      port: 8080,                    // Port to listen on
      path: '/federation',           // WebSocket endpoint path
      maxConnections: 1000,          // Max concurrent clients
      trustPolicy: myTrustPolicy     // Server-wide trust policy
    },

    // Auto-broadcast local deltas to all clients
    autoBroadcast: true
  }
});
```

### Client Configuration

```typescript
await client.connectToRemote('ws://localhost:8080/federation', {
  // Sync mode
  mode: 'push' | 'pull' | 'bidirectional',

  // Initial sync strategy
  initialSync: 'full' | 'from_timestamp' | 'none',
  syncFromTimestamp: Date.now() - 86400000, // Last 24 hours

  // Filter which deltas to send
  pushFilter: {
    authors: ['alice'],
    contexts: ['public']
  },

  // Filter which deltas to receive
  pullFilter: {
    contexts: ['public', 'shared']
  },

  // Trust policy
  trustPolicy: createAuthorTrustPolicy(['alice', 'bob']),

  // Reconnection settings
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  }
});
```

## Sync Modes

| Mode | Client Sends | Client Receives | Use Case |
|------|--------------|-----------------|----------|
| **push** | ✅ Yes | ❌ No | Upload-only (e.g., logging, metrics) |
| **pull** | ❌ No | ✅ Yes | Download-only (e.g., read replicas) |
| **bidirectional** | ✅ Yes | ✅ Yes | Full sync (e.g., collaborative editing) |

## Initial Sync Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **full** | Receive all existing deltas | New client needs complete state |
| **from_timestamp** | Receive deltas after timestamp | Reconnecting client with local state |
| **none** | No initial sync | Client only wants new deltas |

## Federation Events

Listen to federation events to monitor connections and data flow:

```typescript
client.onFederationEvent((event) => {
  switch (event.type) {
    case 'link:connecting':
      console.log(`Connecting to ${event.remoteUrl}`);
      break;
    case 'link:connected':
      console.log(`Connected to ${event.remoteSystemId}`);
      break;
    case 'link:disconnected':
      console.log('Disconnected');
      break;
    case 'link:error':
      console.error('Error:', event.error);
      break;
    case 'delta:sent':
      console.log(`Sent delta ${event.deltaId}`);
      break;
    case 'delta:received':
      console.log(`Received delta ${event.deltaId}`);
      break;
    case 'delta:rejected':
      console.log(`Rejected delta ${event.deltaId}: ${event.reason}`);
      break;
    case 'sync:started':
      console.log('Initial sync started');
      break;
    case 'sync:completed':
      console.log(`Sync complete (${event.deltasProcessed} deltas)`);
      break;
  }
});
```

## Federation Link Management

```typescript
// Get all active federation links
const links = client.getFederationLinks();

// Get a specific link
const link = client.getFederationLink(linkId);

// Link status
console.log(link.status); // 'connected' | 'disconnected' | 'syncing' | ...

// Link statistics
console.log(link.stats.deltasSent);
console.log(link.stats.deltasReceived);
console.log(link.stats.deltasRejected);

// Pause/resume delta sync
link.pause();
link.resume();

// Disconnect
await link.disconnect();
```

## Federation Topology Patterns

### 1. Hub-and-Spoke
```
    [Central Server]
      /    |    \
   [A]   [B]   [C]
```
- Central authority with edge instances
- All communication goes through hub
- Hub can filter and moderate deltas

### 2. Peer-to-Peer
```
   [A] ─── [B]
    │   ×   │
   [D] ─── [C]
```
- Fully distributed collaboration
- Each instance connects to multiple peers
- No single point of failure

### 3. Hierarchical
```
      [Global]
       /    \
   [US]    [EU]
   /  \    /  \
  [A] [B][C] [D]
```
- Multi-level federation
- Regional aggregation
- Geographic distribution

### 4. Selective (Trust Boundary)
```
   [Public] ←→ [Bridge] ←→ [Private]
```
- Trust-based federation
- Bridge enforces trust policies
- Filters deltas between networks

## Protocol Details

RhizomeDB federation uses a WebSocket-based protocol (`rhizomedb-federation-v1`) with the following message types:

- **HELLO / HELLO_ACK** - Initial handshake
- **DELTA / DELTA_ACK / DELTA_NACK** - Delta synchronization
- **SYNC_REQUEST / SYNC_START / SYNC_BATCH / SYNC_COMPLETE** - Initial sync
- **PAUSE / RESUME** - Flow control
- **PING / PONG** - Heartbeat
- **ERROR** - Error handling

## Best Practices

1. **Always use trust policies in production** - Don't blindly accept all deltas
2. **Enable reconnection** - Network failures are common
3. **Use filters for large datasets** - Reduce bandwidth and memory
4. **Monitor federation events** - Track connection health and data flow
5. **Choose appropriate sync mode** - Not all clients need bidirectional sync
6. **Consider initial sync strategy** - Full sync can be expensive for large datasets
7. **Use hierarchical topology for scale** - Reduces connections at each level

## Troubleshooting

### Connection refused
- Make sure the server is running
- Check firewall settings
- Verify WebSocket URL (ws:// not http://)

### Deltas not syncing
- Check sync mode (push/pull/bidirectional)
- Verify trust policies aren't rejecting deltas
- Check filters (pushFilter/pullFilter)
- Monitor federation events for errors

### High memory usage
- Reduce cacheSize
- Use filters to limit delta replication
- Consider LevelDB storage instead of in-memory
- Implement delta archival/cleanup

## Further Reading

- **Spec §8**: Federation Primitives
- **Spec §3.3**: Instance Archetypes
- **Spec §4**: Delta CRDTs and conflict-free convergence
