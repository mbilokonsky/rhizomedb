#!/usr/bin/env node

/**
 * RhizomeDB MCP Server
 *
 * A Model Context Protocol server that exposes RhizomeDB capabilities
 * to AI agents for persistent knowledge graph operations.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { RhizomeDB } from 'rhizomedb';
import { loadConfig } from './config.js';
import * as tools from './tools.js';
import * as resources from './resources.js';

// Load configuration
const config = loadConfig();

// Initialize RhizomeDB instance
const db = new RhizomeDB({
  storage: config.storage,
  storageConfig: config.storage === 'leveldb' ? { path: config.storagePath } : undefined,
  systemId: config.systemId,
  cacheSize: config.cacheSize,
  enableIndexing: config.enableIndexing,
  validateSchemas: config.validateSchemas
});

// Create author ID for MCP operations (can be overridden via tool args in future)
const authorId = config.systemId || 'mcp-server';

// Create tool and resource contexts
const toolContext: tools.ToolContext = { db, authorId };
const resourceContext: resources.ResourceContext = { db };

// Initialize MCP server
const server = new Server(
  {
    name: 'rhizomedb',
    version: '0.1.0'
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

// ============================================================================
// Tool Handlers
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_delta',
      description:
        'Create a new delta (assertion) in the database. A delta is an immutable fact with pointers to domain objects or primitive values.',
      inputSchema: {
        type: 'object',
        properties: {
          pointers: {
            type: 'array',
            description: 'Array of pointers connecting this delta to targets',
            items: {
              type: 'object',
              properties: {
                role: {
                  type: 'string',
                  description: 'The semantic role of this pointer (e.g., "actor", "name", "parent")'
                },
                target: {
                  description:
                    'Either a Reference object {id, context?} or a primitive value (string, number, boolean)',
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'Domain object ID' },
                        context: {
                          type: 'string',
                          description: 'Optional: where this delta appears when querying the target'
                        }
                      },
                      required: ['id']
                    },
                    { type: 'string' },
                    { type: 'number' },
                    { type: 'boolean' }
                  ]
                }
              },
              required: ['role', 'target']
            }
          }
        },
        required: ['pointers']
      }
    },
    {
      name: 'query_deltas',
      description:
        'Query deltas by various filters (author, system, timestamp, target objects, etc.)',
      inputSchema: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' }, description: 'Filter by delta IDs' },
          authors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by author IDs'
          },
          systems: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by system IDs'
          },
          targetIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by target domain object IDs'
          },
          targetContexts: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by target contexts'
          },
          timestampStart: { type: 'number', description: 'Filter by timestamp >= this value' },
          timestampEnd: { type: 'number', description: 'Filter by timestamp <= this value' },
          includeNegated: {
            type: 'boolean',
            description: 'Include negated (retracted) deltas',
            default: false
          },
          limit: { type: 'number', description: 'Maximum number of results to return' }
        }
      }
    },
    {
      name: 'create_object',
      description:
        'Convenience method to create a simple object with properties. Creates one delta per property.',
      inputSchema: {
        type: 'object',
        properties: {
          objectId: { type: 'string', description: 'Unique ID for the object' },
          properties: {
            type: 'object',
            description: 'Key-value pairs of properties (values must be primitives)',
            additionalProperties: {
              oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }]
            }
          }
        },
        required: ['objectId', 'properties']
      }
    },
    {
      name: 'create_relationship',
      description:
        'Create a bidirectional relationship between two objects with specified roles and contexts.',
      inputSchema: {
        type: 'object',
        properties: {
          fromId: { type: 'string', description: 'ID of the first object' },
          fromRole: {
            type: 'string',
            description: 'Role name for the first object (e.g., "parent")'
          },
          fromContext: {
            type: 'string',
            description: 'Context for organizing on the first object (e.g., "children")'
          },
          toId: { type: 'string', description: 'ID of the second object' },
          toRole: { type: 'string', description: 'Role name for the second object (e.g., "child")' },
          toContext: {
            type: 'string',
            description: 'Context for organizing on the second object (e.g., "parent")'
          }
        },
        required: ['fromId', 'fromRole', 'fromContext', 'toId', 'toRole', 'toContext']
      }
    },
    {
      name: 'get_object_deltas',
      description: 'Get all deltas that reference a specific domain object.',
      inputSchema: {
        type: 'object',
        properties: {
          objectId: { type: 'string', description: 'Domain object ID' },
          includeNegated: {
            type: 'boolean',
            description: 'Include negated deltas',
            default: false
          }
        },
        required: ['objectId']
      }
    },
    {
      name: 'negate_delta',
      description:
        'Negate (retract) a delta. Creates a negation delta that marks the original as retracted.',
      inputSchema: {
        type: 'object',
        properties: {
          deltaId: { type: 'string', description: 'ID of the delta to negate' },
          reason: { type: 'string', description: 'Optional reason for negation' }
        },
        required: ['deltaId']
      }
    },
    {
      name: 'time_travel_query',
      description:
        'Query the database as it existed at a specific timestamp. Useful for debugging and audit trails.',
      inputSchema: {
        type: 'object',
        properties: {
          timestamp: { type: 'number', description: 'Timestamp to query (milliseconds since epoch)' },
          objectId: { type: 'string', description: 'Optional: specific object to query' },
          targetIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional: filter by target IDs'
          }
        },
        required: ['timestamp']
      }
    },
    {
      name: 'get_stats',
      description: 'Get database statistics (total deltas, cache performance, uptime, etc.)',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'register_schema',
      description:
        'Register a HyperSchema for organizing and querying domain objects. Advanced feature.',
      inputSchema: {
        type: 'object',
        properties: {
          schema: {
            type: 'object',
            description: 'HyperSchema definition with id, name, select function, and transform rules',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              select: { type: 'string', description: 'Selection function as string (will be eval)' },
              transform: {
                type: 'object',
                description: 'Transformation rules keyed by role'
              }
            },
            required: ['id', 'name']
          }
        },
        required: ['schema']
      }
    },
    {
      name: 'materialize_view',
      description:
        'Materialize a HyperView for a domain object using a registered schema. Returns structured data.',
      inputSchema: {
        type: 'object',
        properties: {
          objectId: { type: 'string', description: 'Domain object ID' },
          schemaId: { type: 'string', description: 'Registered schema ID' }
        },
        required: ['objectId', 'schemaId']
      }
    },
    {
      name: 'load_schema',
      description:
        'Load a schema from deltas. Queries schema-defining deltas and resolves them into an executable HyperSchema.',
      inputSchema: {
        type: 'object',
        properties: {
          schemaId: { type: 'string', description: 'ID of the schema to load from deltas' }
        },
        required: ['schemaId']
      }
    },
    {
      name: 'load_all_schemas',
      description:
        'Load all schemas from deltas. Scans for all schema-defining deltas and loads them.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'check_schema_changed',
      description:
        'Check if a schema has changed since last snapshot. Returns version information.',
      inputSchema: {
        type: 'object',
        properties: {
          schemaId: { type: 'string', description: 'ID of the schema to check' }
        },
        required: ['schemaId']
      }
    },
    {
      name: 'reload_schema',
      description: 'Reload a schema if it has changed. Returns the updated schema if reloaded.',
      inputSchema: {
        type: 'object',
        properties: {
          schemaId: { type: 'string', description: 'ID of the schema to reload' }
        },
        required: ['schemaId']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'create_delta':
        result = await tools.createDelta(toolContext, args as any);
        break;
      case 'query_deltas':
        result = await tools.queryDeltas(toolContext, args as any);
        break;
      case 'create_object':
        result = await tools.createObject(toolContext, args as any);
        break;
      case 'create_relationship':
        result = await tools.createRelationship(toolContext, args as any);
        break;
      case 'get_object_deltas':
        result = await tools.getObjectDeltas(toolContext, args as any);
        break;
      case 'negate_delta':
        result = await tools.negateDelta(toolContext, args as any);
        break;
      case 'time_travel_query':
        result = await tools.timeTravelQuery(toolContext, args as any);
        break;
      case 'get_stats':
        result = await tools.getStats(toolContext);
        break;
      case 'register_schema':
        result = await tools.registerSchema(toolContext, args as any);
        break;
      case 'materialize_view':
        result = await tools.materializeView(toolContext, args as any);
        break;
      case 'load_schema':
        result = await tools.loadSchema(toolContext, args as any);
        break;
      case 'load_all_schemas':
        result = await tools.loadAllSchemas(toolContext);
        break;
      case 'check_schema_changed':
        result = await tools.checkSchemaChanged(toolContext, args as any);
        break;
      case 'reload_schema':
        result = await tools.reloadSchema(toolContext, args as any);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// ============================================================================
// Resource Handlers
// ============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const objects = await resources.listObjects(resourceContext, 100);

  return {
    resources: objects.map((obj) => ({
      uri: obj.uri,
      name: obj.name,
      description: obj.description,
      mimeType: 'application/json'
    }))
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  try {
    let content: string;
    let mimeType: string;

    if (uri.startsWith('rhizome://object/')) {
      const objectId = uri.replace('rhizome://object/', '');
      const result = await resources.getObjectResource(resourceContext, objectId);
      content = result.content;
      mimeType = result.mimeType;
    } else if (uri.startsWith('rhizome://delta/')) {
      const deltaId = uri.replace('rhizome://delta/', '');
      const result = await resources.getDeltaResource(resourceContext, deltaId);
      content = result.content;
      mimeType = result.mimeType;
    } else {
      throw new Error(`Unsupported resource URI: ${uri}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType,
          text: content
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read resource ${uri}: ${errorMessage}`);
  }
});

// ============================================================================
// Server Startup
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error('RhizomeDB MCP Server started');
  console.error(`Storage: ${config.storage}`);
  if (config.storage === 'leveldb') {
    console.error(`Storage path: ${config.storagePath}`);
  }
  console.error(`System ID: ${db.systemId}`);
  console.error(`Cache size: ${config.cacheSize}`);
  console.error(`Indexing: ${config.enableIndexing ? 'enabled' : 'disabled'}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
