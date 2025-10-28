# RhizomeDB Federation

This module implements instance-to-instance delta synchronization for RhizomeDB, as specified in **spec §8: Federation Primitives**.

## Overview

Federation allows separate RhizomeDB instances to sync deltas over WebSocket connections, enabling distributed operation with eventual consistency.

### Key Features

- **WebSocket-based protocol** - Real-time delta synchronization
- **Bidirectional sync** - Push, pull, or both
- **Trust policies** - Control which deltas are accepted
- **Initial sync** - Multiple strategies for bootstrapping
- **Reconnection** - Automatic reconnection with exponential backoff
- **Filtering** - Sync only relevant deltas
- **Conflict-free** - Delta CRDTs naturally merge without coordination

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FederatedRhizomeDB                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              FederationManager                       │  │
│  │                                                      │  │
│  │  ┌──────────────┐        ┌──────────────────────┐  │  │
│  │  │   Server     │        │    Connections       │  │  │
│  │  │              │        │  (FederationLink[])  │  │  │
│  │  │ - Incoming   │        │                      │  │  │
│  │  │   clients    │        │ - Outgoing links     │  │  │
│  │  │ - Broadcast  │        │ - WebSocket clients  │  │  │
│  │  └──────────────┘        └──────────────────────┘  │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │         Trust & Filter Framework             │  │  │
│  │  │  - Author/System trust policies              │  │  │
│  │  │  - Custom verification functions             │  │  │
│  │  │  - Delta filtering (push/pull)               │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  RhizomeDB Core                      │  │
│  │  - Delta storage & querying                          │  │
│  │  - Subscription management                           │  │
│  │  - HyperView materialization                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

```
federation/
├── types.ts                    # Core type definitions
├── trust.ts                    # Trust policy framework
├── manager.ts                  # Federation manager (orchestrates server + clients)
├── protocol/
│   ├── messages.ts             # WebSocket protocol messages
│   └── codec.ts                # Message encoding/decoding
├── server/
│   └── server.ts               # WebSocket server for incoming connections
├── client/
│   └── connection.ts           # WebSocket client for outgoing connections
└── index.ts                    # Public API exports
```

## Quick Start

### Server

```typescript
import { FederatedRhizomeDB } from './storage/federated-instance';

const server = new FederatedRhizomeDB({
  storage: 'memory',
  systemId: 'my-server',
  federation: {
    enableServer: true,
    serverConfig: { port: 8080 },
    autoBroadcast: true
  }
});

// Listen to federation events
server.onFederationEvent((event) => {
  console.log('Federation event:', event);
});
```

### Client

```typescript
import { FederatedRhizomeDB } from './storage/federated-instance';

const client = new FederatedRhizomeDB({
  storage: 'memory',
  systemId: 'my-client'
});

// Connect to server
const link = await client.connectToRemote('ws://localhost:8080/federation', {
  mode: 'bidirectional',
  initialSync: 'full'
});

console.log('Connected!', link.stats);
```

## API Reference

### FederatedRhizomeDB

Extends `RhizomeDB` with federation capabilities.

```typescript
class FederatedRhizomeDB extends RhizomeDB implements FederatedInstance {
  constructor(config: FederatedRhizomeConfig);

  // Connect to remote instance
  connectToRemote(url: string, config: FederationConfig): Promise<FederationLink>;

  // Get all federation links
  getFederationLinks(): FederationLink[];

  // Get specific link
  getFederationLink(linkId: string): FederationLink | undefined;

  // Disconnect from remote
  disconnectFromRemote(linkId: string): Promise<void>;

  // Listen to events
  onFederationEvent(handler: FederationEventHandler): () => void;

  // Close all connections
  close(): Promise<void>;
}
```

### FederationConfig

```typescript
interface FederationConfig {
  // Sync mode
  mode: 'push' | 'pull' | 'bidirectional';

  // Initial sync
  initialSync?: 'full' | 'from_timestamp' | 'none';
  syncFromTimestamp?: number;

  // Filters
  pushFilter?: DeltaFilter;
  pullFilter?: DeltaFilter;

  // Trust
  trustPolicy?: TrustPolicy;

  // Reconnection
  reconnect?: {
    enabled: boolean;
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  };
}
```

### FederationLink

```typescript
interface FederationLink {
  readonly id: string;
  readonly remoteSystemId: string;
  readonly remoteUrl: string;
  readonly status: FederationLinkStatus;
  readonly stats: FederationStats;

  pause(): void;
  resume(): void;
  disconnect(): Promise<void>;
  sendDelta(delta: Delta): Promise<void>;
}
```

### Trust Policies

```typescript
// Author-based trust
const policy = createAuthorTrustPolicy(['alice', 'bob']);

// System-based trust
const policy = createSystemTrustPolicy(['trusted-system-1']);

// Custom verification
const policy = createCustomTrustPolicy((delta) => {
  return delta.pointers.some(p => p.role === 'verified');
});

// Combined policies
const policy = combineTrustPolicies(
  createAuthorTrustPolicy(['alice']),
  createSystemTrustPolicy(['trusted-system'])
);
```

## Protocol

The federation protocol (`rhizomedb-federation-v1`) uses WebSocket with JSON messages.

### Message Types

- **HELLO** / **HELLO_ACK** - Initial handshake
- **DELTA** / **DELTA_ACK** / **DELTA_NACK** - Delta synchronization
- **SYNC_REQUEST** / **SYNC_START** / **SYNC_BATCH** / **SYNC_COMPLETE** - Initial sync
- **PAUSE** / **RESUME** - Flow control
- **PING** / **PONG** - Heartbeat
- **ERROR** - Error handling

### Example Handshake

```
Client → Server: HELLO
  {
    type: 'hello',
    systemId: 'client-123',
    config: { mode: 'bidirectional', ... },
    protocol: 'rhizomedb-federation-v1'
  }

Server → Client: HELLO_ACK
  {
    type: 'hello_ack',
    systemId: 'server-001',
    linkId: 'link-abc',
    protocol: 'rhizomedb-federation-v1'
  }

Client → Server: SYNC_REQUEST (if initialSync is enabled)
  {
    type: 'sync_request',
    filter: { ... },
    fromTimestamp: 1234567890
  }

Server → Client: SYNC_START
Server → Client: SYNC_BATCH (multiple)
Server → Client: SYNC_COMPLETE

[Ongoing delta sync begins]
```

## Examples

See `examples/federation/` for detailed examples:

1. **simple/** - Basic client-server federation
2. **hub-and-spoke/** - Multiple clients with central hub
3. **trust-policies/** - Trust policy demonstrations

## Testing

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run examples
npx ts-node examples/federation/simple/server.ts
npx ts-node examples/federation/simple/client.ts  # separate terminal
```

## Performance Considerations

- **Initial sync** can be expensive for large datasets - consider `from_timestamp` or `none`
- **Auto-broadcast** broadcasts to ALL connected clients - use filters for optimization
- **Trust policies** are evaluated for every delta - keep verification logic fast
- **Reconnection** uses exponential backoff to avoid overwhelming servers
- **Heartbeat** runs every 30 seconds to detect stale connections

## Security

⚠️ **Important security considerations:**

1. **Always use trust policies in production** - The default policy accepts all deltas
2. **Validate author and system fields** - These can be spoofed without verification
3. **Use TLS (wss://)** - WebSocket connections should be encrypted in production
4. **Rate limiting** - Implement application-level rate limiting for delta creation
5. **Authentication** - Add authentication layer before WebSocket handshake
6. **Input validation** - Validate delta structure and content

## Limitations

Current implementation:

- ✅ WebSocket protocol
- ✅ Push/pull/bidirectional sync
- ✅ Trust policies
- ✅ Reconnection
- ✅ Initial sync
- ❌ Delta compression (future work)
- ❌ Delta batching optimization (future work)
- ❌ Built-in authentication (use application layer)
- ❌ TLS/WSS support (use reverse proxy)

## See Also

- **Spec §8**: Federation Primitives
- **examples/federation/**: Working examples
- **examples/README.md**: Instance archetypes
