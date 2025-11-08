# RhizomeDB MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes RhizomeDB capabilities to AI agents. This allows Claude and other MCP clients to use RhizomeDB as a persistent, queryable knowledge graph with full provenance and time-travel capabilities.

## Features

- **Persistent Knowledge Graph**: Store structured knowledge that persists across conversations
- **Full Provenance**: Every assertion has author, timestamp, and system metadata
- **Time-Travel Queries**: Query the database as it existed at any past timestamp
- **Delta-CRDT Architecture**: Conflict-free replicated data with eventual consistency
- **Flexible Storage**: In-memory (for development) or LevelDB (for persistence)
- **HyperView Queries**: Structured views of domain objects using schema transformations

## Installation

### From source

```bash
cd typescript/mcp-server
npm install
npm run build
npm link  # Makes rhizomedb-mcp-server available globally
```

## Configuration

### For Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

You have to create the .rhizomedb folder specified by `RHIZOME_PATH`.

```json
{
  "mcpServers": {
    "rhizomedb": {
      "command": "/Users/YOURNAME/.asdf/shims/node",
      "args": [
        "RHIZOME_CODE_ROOT/typescript/mcp-server/dist/index.js"
      ],
      "env": {
        "RHIZOME_STORAGE": "leveldb",
        "RHIZOME_PATH": "/Users/mykola/.rhizomedb"
      }
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RHIZOME_STORAGE` | `memory` | Storage backend: `memory` or `leveldb` |
| `RHIZOME_PATH` | `~/.rhizomedb` | Path for LevelDB storage |
| `RHIZOME_SYSTEM_ID` | (auto-generated) | Unique system identifier |
| `RHIZOME_CACHE_SIZE` | `10000` | Cache size for materialized views |
| `RHIZOME_ENABLE_INDEXING` | `true` | Enable indexing for faster queries |
| `RHIZOME_VALIDATE_SCHEMAS` | `false` | Validate schemas on registration |

## Usage Examples

### Basic Object Storage

```javascript
// Create a person object
{
  "tool": "create_object",
  "arguments": {
    "objectId": "person_alice",
    "properties": {
      "name": "Alice Smith",
      "age": 30,
      "email": "alice@example.com"
    }
  }
}
```

### Creating Relationships

```javascript
// Create a parent-child relationship
{
  "tool": "create_relationship",
  "arguments": {
    "fromId": "person_alice",
    "fromRole": "parent",
    "fromContext": "children",
    "toId": "person_bob",
    "toRole": "child",
    "toContext": "parents"
  }
}
```

### Querying Deltas

```javascript
// Get all deltas about Alice
{
  "tool": "query_deltas",
  "arguments": {
    "targetIds": ["person_alice"]
  }
}

// Get deltas from a specific time range
{
  "tool": "query_deltas",
  "arguments": {
    "timestampStart": 1704067200000,
    "timestampEnd": 1704153600000
  }
}
```

### Time-Travel Queries

```javascript
// See what the database knew about Alice yesterday
{
  "tool": "time_travel_query",
  "arguments": {
    "objectId": "person_alice",
    "timestamp": 1704067200000  // Yesterday's timestamp
  }
}
```

### Negating (Retracting) Data

```javascript
// Retract a delta that contained incorrect information
{
  "tool": "negate_delta",
  "arguments": {
    "deltaId": "delta_abc123",
    "reason": "Incorrect email address"
  }
}
```

### Advanced: Custom Deltas

```javascript
// Create a complex assertion with multiple pointers
{
  "tool": "create_delta",
  "arguments": {
    "pointers": [
      {
        "role": "movie",
        "target": { "id": "movie_matrix", "context": "cast" }
      },
      {
        "role": "actor",
        "target": { "id": "person_keanu", "context": "roles" }
      },
      {
        "role": "character",
        "target": "Neo"
      }
    ]
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `create_delta` | Create a new delta (assertion) with custom pointers |
| `query_deltas` | Query deltas by filters (author, system, timestamp, targets) |
| `create_object` | Convenience: create a simple object with properties |
| `create_relationship` | Create a bidirectional relationship between objects |
| `get_object_deltas` | Get all deltas referencing a specific object |
| `negate_delta` | Retract a delta with an optional reason |
| `time_travel_query` | Query the database as it existed at a timestamp |
| `get_stats` | Get database statistics and performance metrics |
| `register_schema` | Register a HyperSchema for structured queries (advanced) |
| `materialize_view` | Materialize a HyperView using a schema (advanced) |

## Available Resources

Resources allow you to browse domain objects stored in RhizomeDB:

- `rhizome://object/{objectId}` - View a domain object and its properties
- `rhizome://delta/{deltaId}` - View a specific delta

## Use Cases

### Knowledge Management
Store facts, relationships, and metadata that persists across conversations. Perfect for building a personal knowledge graph.

### Audit Trails
Every assertion has full provenance (who, when, where). Time-travel queries let you see historical state.

### Collaborative Data
Multiple agents or users can contribute data. Conflicts are preserved and can be resolved at query time.

### Debugging & Development
Time-travel queries help debug how knowledge evolved. Negations provide undo without losing history.

## Architecture

RhizomeDB uses a **delta-CRDT** architecture where:

- **Deltas** are immutable assertions with unique IDs, timestamps, and pointers
- **Pointers** connect deltas to domain objects or primitive values
- **HyperViews** provide structured views of domain objects by applying schemas
- **Negations** are deltas that retract other deltas (append-only)
- **Time-travel** is built-in via timestamp filtering

See the [main RhizomeDB README](../../README.md) for detailed technical documentation.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Watch mode (rebuilds on changes)
npm run watch
```

## Troubleshooting

### Server won't start

Check that the storage path exists and is writable:

```bash
mkdir -p ~/.rhizomedb
chmod 755 ~/.rhizomedb
```

### Claude Desktop can't connect

1. Check the Claude Desktop logs for errors
2. Verify the configuration JSON is valid
3. Try running manually: `npx rhizomedb-mcp-server`
4. Check stderr output for startup messages

### Performance issues

- Increase cache size: `RHIZOME_CACHE_SIZE=50000`
- Ensure indexing is enabled: `RHIZOME_ENABLE_INDEXING=true`
- Use LevelDB instead of memory for large datasets
- Check stats with `get_stats` tool

## License

ISC

## Contributing

See the main [RhizomeDB repository](https://github.com/mbilokonsky/rhizomedb) for contribution guidelines.
