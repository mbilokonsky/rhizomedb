#!/usr/bin/env npx ts-node
/**
 * CLI: help
 * Lists all available commands with descriptions and expected arguments.
 */

import { output, run } from './common';

run(async () => {
  output({
    commands: {
      init: {
        description: 'Initialize .rhizome directory and system identity',
        args: 'none'
      },
      status: {
        description: 'Show instance statistics',
        args: 'none'
      },
      claim: {
        description: 'Assert a fact about an entity',
        args: '{entity, property, value, author, role?}'
      },
      retract: {
        description: 'Retract facts about an entity property',
        args: '{entity, property, author}'
      },
      relate: {
        description: 'Create a relationship between two entities',
        args: '{from, fromContext, fromRole, to, toContext, toRole, author}'
      },
      query: {
        description: 'Query a domain object (resolved view)',
        args: '{objectId, schema?, resolve?}'
      },
      'time-travel': {
        description: 'Query a domain object at a past timestamp',
        args: '{objectId, timestamp, schema?}'
      },
      'delta-create': {
        description: 'Create a raw delta with pointers',
        args: '{author, pointers}'
      },
      'delta-get': {
        description: 'Get a delta by ID',
        args: '{id}'
      },
      'delta-list': {
        description: 'List deltas with optional filters',
        args: '{author?, targetId?, after?, before?, limit?, includeNegated?}'
      },
      negate: {
        description: 'Negate a specific delta',
        args: '{deltaId, author, reason?}'
      },
      'schema-register': {
        description: 'Register a schema as deltas',
        args: '{id, name, properties, author?}'
      },
      'schema-list': {
        description: 'List all registered schemas',
        args: 'none'
      },
      'federation-serve': {
        description: 'Start a federation server (long-running)',
        args: '{port?, trustPolicy?}'
      },
      'federation-connect': {
        description: 'Connect to a remote federation server (long-running)',
        args: '{url, mode?, initialSync?, trustPolicy?}'
      },
      'federation-status': {
        description: 'Show federation configuration',
        args: 'none'
      },
      help: {
        description: 'Show this help',
        args: 'none'
      }
    }
  });
});
