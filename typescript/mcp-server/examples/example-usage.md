# RhizomeDB MCP Server - Example Usage

This document provides example interactions with the RhizomeDB MCP server when using Claude Desktop or another MCP client.

## Example 1: Building a Personal Knowledge Graph

### Conversation with Claude

**You**: "I want to start tracking information about books I'm reading. Can you create a book entry for 'Dune' by Frank Herbert?"

**Claude** (using MCP tools):
```json
{
  "tool": "create_object",
  "arguments": {
    "objectId": "book_dune",
    "properties": {
      "title": "Dune",
      "author": "Frank Herbert",
      "year": 1965,
      "genre": "Science Fiction"
    }
  }
}
```

**You**: "Great! I finished reading it last week. Can you add a reading record?"

**Claude**:
```json
{
  "tool": "create_relationship",
  "arguments": {
    "fromId": "user_me",
    "fromRole": "reader",
    "fromContext": "books_read",
    "toId": "book_dune",
    "toRole": "book",
    "toContext": "readers"
  }
}
```

**You**: "What books have I tracked so far?"

**Claude**:
```json
{
  "tool": "query_deltas",
  "arguments": {
    "targetContexts": ["books_read"]
  }
}
```

## Example 2: Meeting Notes with Relationships

**You**: "I had a meeting with Alice about the Q4 planning. Can you store that?"

**Claude**:
```json
// Create people
{
  "tool": "create_object",
  "arguments": {
    "objectId": "person_alice",
    "properties": {
      "name": "Alice Smith",
      "role": "Product Manager"
    }
  }
}

// Create meeting
{
  "tool": "create_object",
  "arguments": {
    "objectId": "meeting_q4_planning_001",
    "properties": {
      "topic": "Q4 Planning",
      "date": "2024-01-15",
      "notes": "Discussed launch timeline and resource allocation"
    }
  }
}

// Link attendees
{
  "tool": "create_relationship",
  "arguments": {
    "fromId": "person_alice",
    "fromRole": "attendee",
    "fromContext": "meetings",
    "toId": "meeting_q4_planning_001",
    "toRole": "meeting",
    "toContext": "attendees"
  }
}
```

## Example 3: Correcting Information

**You**: "Actually, I got Alice's role wrong - she's a Senior Product Manager."

**Claude**:
```json
// First, find the delta with the incorrect information
{
  "tool": "get_object_deltas",
  "arguments": {
    "objectId": "person_alice"
  }
}

// Negate the incorrect delta
{
  "tool": "negate_delta",
  "arguments": {
    "deltaId": "delta_abc123",
    "reason": "Incorrect role - should be Senior Product Manager"
  }
}

// Create corrected information
{
  "tool": "create_delta",
  "arguments": {
    "pointers": [
      {
        "role": "person",
        "target": { "id": "person_alice", "context": "role" }
      },
      {
        "role": "role",
        "target": "Senior Product Manager"
      }
    ]
  }
}
```

## Example 4: Time-Travel Debugging

**You**: "What did I know about the Q4 planning meeting yesterday?"

**Claude**:
```json
{
  "tool": "time_travel_query",
  "arguments": {
    "objectId": "meeting_q4_planning_001",
    "timestamp": 1704067200000  // Yesterday's timestamp
  }
}
```

## Example 5: Complex Domain Modeling (Movie Database)

**You**: "I want to track movies I've watched. Let's start with The Matrix."

**Claude**:
```json
// Create the movie
{
  "tool": "create_object",
  "arguments": {
    "objectId": "movie_matrix",
    "properties": {
      "title": "The Matrix",
      "year": 1999
    }
  }
}

// Create director
{
  "tool": "create_object",
  "arguments": {
    "objectId": "director_wachowski_lana",
    "properties": {
      "name": "Lana Wachowski"
    }
  }
}

// Create director relationship
{
  "tool": "create_relationship",
  "arguments": {
    "fromId": "movie_matrix",
    "fromRole": "movie",
    "fromContext": "directors",
    "toId": "director_wachowski_lana",
    "toRole": "director",
    "toContext": "films_directed"
  }
}

// Create actor
{
  "tool": "create_object",
  "arguments": {
    "objectId": "actor_keanu",
    "properties": {
      "name": "Keanu Reeves"
    }
  }
}

// Create cast entry with character name
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
        "target": { "id": "actor_keanu", "context": "roles" }
      },
      {
        "role": "character",
        "target": "Neo"
      }
    ]
  }
}
```

## Example 6: Querying and Analytics

**You**: "Show me all the movies I've tracked"

**Claude**:
```json
{
  "tool": "query_deltas",
  "arguments": {
    "targetContexts": ["cast", "directors"],
    "limit": 100
  }
}
```

**You**: "What's the current state of the database?"

**Claude**:
```json
{
  "tool": "get_stats",
  "arguments": {}
}
```

Response:
```json
{
  "systemId": "mcp-server-abc123",
  "totalDeltas": 1247,
  "materializedViews": 15,
  "uptime": 3600000,
  "storageType": "leveldb",
  "cacheStats": {
    "hits": 523,
    "misses": 104,
    "evictions": 8,
    "hitRate": 0.834
  }
}
```

## Example 7: Using Resources

**You**: "Show me everything about the Matrix movie as a resource"

**Claude** would read the resource:
```
rhizome://object/movie_matrix
```

Response:
```json
{
  "id": "movie_matrix",
  "_deltaCount": 5,
  "title": "The Matrix",
  "year": 1999,
  "directors": [
    { "_ref": "director_wachowski_lana", "_role": "director" }
  ],
  "cast": [
    { "_ref": "actor_keanu", "_role": "actor", "character": "Neo" }
  ]
}
```

## Tips for Effective Use

1. **Use meaningful IDs**: `person_alice` is better than `obj_123`
2. **Be consistent with contexts**: Use the same context names throughout (e.g., always use `"meetings"` not sometimes `"attended_meetings"`)
3. **Leverage time-travel**: Debug issues by checking historical state
4. **Use negations carefully**: Negate when correcting errors, create new deltas for updates
5. **Check stats periodically**: Monitor cache hit rate and delta count
6. **Start simple**: Use `create_object` and `create_relationship` before diving into custom deltas

## Advanced: Working with Schemas

For more complex querying patterns, you can register HyperSchemas:

```json
{
  "tool": "register_schema",
  "arguments": {
    "schema": {
      "id": "person_schema",
      "name": "Person",
      "select": "(objectId, delta) => delta.pointers.some(p => p.target.id === objectId)",
      "transform": {}
    }
  }
}
```

Then materialize views:

```json
{
  "tool": "materialize_view",
  "arguments": {
    "objectId": "person_alice",
    "schemaId": "person_schema"
  }
}
```
