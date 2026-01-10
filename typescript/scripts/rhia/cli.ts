#!/usr/bin/env npx ts-node
/**
 * Rhia - Rhizomatic Historian & Archivist
 *
 * A grad student in Computational Epistemology who's embedded with the
 * RhizomeDB team to document its intellectual history.
 *
 * Usage:
 *   npx ts-node scripts/rhia/cli.ts <command> [args]
 *
 * Commands:
 *   concepts                    - List all tracked concepts
 *   concept <name>              - Show details about a concept
 *   questions                   - List open questions
 *   decisions [limit]           - List recent decisions
 *   search <term>               - Search across all knowledge
 *
 *   remember concept <name> <description>
 *   remember question <concept> <question>
 *   remember decision <concept> <summary> -- <rationale>
 *   remember observation <concept> <observation>
 *   remember connection <conceptA> <nature> <conceptB> [note]
 *
 *   answer <questionId> <answer>
 */

import * as path from 'path';
import { LevelDBStore } from '../../src/storage/leveldb-store';
import {
  createConcept,
  createQuestion,
  createDecision,
  createObservation,
  connectConcepts,
  answerQuestion
} from './schema';
import {
  listConcepts,
  findConceptByName,
  getConceptView,
  listOpenQuestions,
  listRecentDecisions,
  search,
  getQuestionSummary
} from './queries';

const DB_PATH = path.join(__dirname, '../../../.rhizome/rhia');

// =============================================================================
// Rhia's Personality
// =============================================================================

const RHIA_INTRO = `
  Rhia here - your friendly neighborhood project historian.
`;

function rhiaSays(message: string): void {
  console.log(`\n${message}`);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// =============================================================================
// Database connection
// =============================================================================

async function getDB(): Promise<LevelDBStore> {
  const db = new LevelDBStore({
    dbPath: DB_PATH,
    storage: 'leveldb'
  });
  await new Promise(resolve => setTimeout(resolve, 100));
  return db;
}

// =============================================================================
// Command handlers
// =============================================================================

async function handleConcepts(): Promise<void> {
  const db = await getDB();
  try {
    const concepts = await listConcepts(db);

    if (concepts.length === 0) {
      rhiaSays(`I haven't documented any concepts yet. Use 'remember concept <name> <description>' to get started.`);
      return;
    }

    rhiaSays(`I'm currently tracking ${concepts.length} concept${concepts.length === 1 ? '' : 's'}:\n`);

    for (const concept of concepts) {
      console.log(`  - ${concept.name}`);
      console.log(`    (${concept.id})`);
    }

    rhiaSays(`\nUse 'concept <name>' to dive deeper into any of these.`);
  } finally {
    await db.close();
  }
}

async function handleConcept(name: string): Promise<void> {
  const db = await getDB();
  try {
    const conceptId = await findConceptByName(db, name);

    if (!conceptId) {
      rhiaSays(`I don't have any record of a concept called "${name}". Here's what I'm tracking:`);
      const concepts = await listConcepts(db);
      for (const c of concepts) {
        console.log(`  - ${c.name}`);
      }
      return;
    }

    const view = await getConceptView(db, conceptId);
    if (!view) {
      rhiaSays(`Strange - I found the ID but couldn't load the concept. This shouldn't happen.`);
      return;
    }

    rhiaSays(`Here's what I know about "${view.name}":\n`);
    console.log(`  ${view.description}\n`);

    if (view.decisions.length > 0) {
      console.log(`  Decisions (${view.decisions.length}):`);
      for (const d of view.decisions) {
        console.log(`    - [${formatDate(d.timestamp)}] ${d.summary}`);
        console.log(`      Rationale: ${d.rationale}`);
      }
      console.log();
    }

    if (view.questions.length > 0) {
      const open = view.questions.filter(q => q.status === 'open');
      const resolved = view.questions.filter(q => q.status === 'resolved');

      if (open.length > 0) {
        console.log(`  Open Questions (${open.length}):`);
        for (const q of open) {
          console.log(`    - ${q.text}`);
          console.log(`      (${q.id})`);
        }
        console.log();
      }

      if (resolved.length > 0) {
        console.log(`  Resolved Questions (${resolved.length}):`);
        for (const q of resolved) {
          console.log(`    - ${q.text}`);
          if (q.answer) console.log(`      Answer: ${q.answer}`);
        }
        console.log();
      }
    }

    if (view.observations.length > 0) {
      console.log(`  Observations (${view.observations.length}):`);
      for (const o of view.observations) {
        const sigMarker = o.significance === 'pivotal' ? '!!!' : o.significance === 'notable' ? '!' : '';
        console.log(`    - [${formatDate(o.timestamp)}]${sigMarker} ${o.content}`);
      }
      console.log();
    }

    if (view.connections.length > 0) {
      console.log(`  Connected to:`);
      for (const c of view.connections) {
        const otherName = c.otherConceptName || c.otherConceptId;
        console.log(`    - ${otherName} (${c.nature})`);
        if (c.note) console.log(`      Note: ${c.note}`);
      }
    }

  } finally {
    await db.close();
  }
}

async function handleQuestions(): Promise<void> {
  const db = await getDB();
  try {
    const questions = await listOpenQuestions(db);

    if (questions.length === 0) {
      rhiaSays(`No open questions at the moment. That's either very good or very suspicious.`);
      return;
    }

    rhiaSays(`We have ${questions.length} open question${questions.length === 1 ? '' : 's'}:\n`);

    for (const q of questions) {
      console.log(`  - ${q.text}`);
      if (q.context) console.log(`    Context: ${q.context}`);
      console.log(`    (${q.id})`);
      console.log();
    }

    rhiaSays(`Use 'answer <questionId> <answer>' when we figure these out.`);
  } finally {
    await db.close();
  }
}

async function handleDecisions(limit: number = 10): Promise<void> {
  const db = await getDB();
  try {
    const decisions = await listRecentDecisions(db, limit);

    if (decisions.length === 0) {
      rhiaSays(`No decisions recorded yet. Use 'remember decision <concept> <summary> -- <rationale>' to document one.`);
      return;
    }

    rhiaSays(`Here are the ${decisions.length} most recent decisions:\n`);

    for (const d of decisions) {
      console.log(`  [${formatDate(d.timestamp)}] ${d.summary}`);
      console.log(`    Why: ${d.rationale}`);
      if (d.resolves) console.log(`    Resolved: ${d.resolves}`);
      if (d.supersedes) console.log(`    Superseded: ${d.supersedes}`);
      console.log();
    }
  } finally {
    await db.close();
  }
}

async function handleSearch(term: string): Promise<void> {
  const db = await getDB();
  try {
    const results = await search(db, term);
    const total =
      results.concepts.length +
      results.questions.length +
      results.decisions.length +
      results.observations.length;

    if (total === 0) {
      rhiaSays(`No results for "${term}". Either we haven't discussed it, or I wasn't paying attention (unlikely).`);
      return;
    }

    rhiaSays(`Found ${total} result${total === 1 ? '' : 's'} for "${term}":\n`);

    if (results.concepts.length > 0) {
      console.log(`  Concepts:`);
      for (const c of results.concepts) {
        console.log(`    - ${c.name}`);
      }
      console.log();
    }

    if (results.questions.length > 0) {
      console.log(`  Questions:`);
      for (const q of results.questions) {
        console.log(`    - [${q.status}] ${q.text}`);
      }
      console.log();
    }

    if (results.decisions.length > 0) {
      console.log(`  Decisions:`);
      for (const d of results.decisions) {
        console.log(`    - ${d.summary}`);
      }
      console.log();
    }

    if (results.observations.length > 0) {
      console.log(`  Observations:`);
      for (const o of results.observations) {
        console.log(`    - ${o.content}`);
      }
    }
  } finally {
    await db.close();
  }
}

// =============================================================================
// Remember commands
// =============================================================================

async function handleRememberConcept(name: string, description: string): Promise<void> {
  const db = await getDB();
  try {
    const conceptId = await createConcept(db, name, description);
    rhiaSays(`Got it. I've created a new concept entry for "${name}".`);
    console.log(`  ID: ${conceptId}`);
    rhiaSays(`This is now part of our project's intellectual history. I'll track questions, decisions, and observations related to it.`);
  } finally {
    await db.close();
  }
}

async function handleRememberQuestion(conceptName: string, question: string): Promise<void> {
  const db = await getDB();
  try {
    const conceptId = await findConceptByName(db, conceptName);
    if (!conceptId) {
      rhiaSays(`I don't have a concept called "${conceptName}". Create it first with 'remember concept'.`);
      return;
    }

    const questionId = await createQuestion(db, question, [conceptId]);
    rhiaSays(`Important question noted. I've filed it under "${conceptName}".`);
    console.log(`  ID: ${questionId}`);
    rhiaSays(`Let me know when we figure this out.`);
  } finally {
    await db.close();
  }
}

async function handleRememberDecision(
  conceptName: string,
  summary: string,
  rationale: string
): Promise<void> {
  const db = await getDB();
  try {
    const conceptId = await findConceptByName(db, conceptName);
    if (!conceptId) {
      rhiaSays(`I don't have a concept called "${conceptName}". Create it first with 'remember concept'.`);
      return;
    }

    const decisionId = await createDecision(db, summary, rationale, [conceptId]);
    rhiaSays(`Decision recorded. This is now part of the historical record for "${conceptName}".`);
    console.log(`  ID: ${decisionId}`);
  } finally {
    await db.close();
  }
}

async function handleRememberObservation(
  conceptName: string,
  observation: string,
  significance: 'minor' | 'notable' | 'pivotal' = 'notable'
): Promise<void> {
  const db = await getDB();
  try {
    const conceptId = await findConceptByName(db, conceptName);
    if (!conceptId) {
      rhiaSays(`I don't have a concept called "${conceptName}". Create it first with 'remember concept'.`);
      return;
    }

    const obsId = await createObservation(db, observation, [conceptId], { significance });
    rhiaSays(`Observation noted${significance === 'pivotal' ? ' - and marked as pivotal!' : '.'}`);
    console.log(`  ID: ${obsId}`);
  } finally {
    await db.close();
  }
}

async function handleRememberConnection(
  conceptAName: string,
  nature: string,
  conceptBName: string,
  note?: string
): Promise<void> {
  const db = await getDB();
  try {
    const conceptAId = await findConceptByName(db, conceptAName);
    const conceptBId = await findConceptByName(db, conceptBName);

    if (!conceptAId) {
      rhiaSays(`I don't have a concept called "${conceptAName}".`);
      return;
    }
    if (!conceptBId) {
      rhiaSays(`I don't have a concept called "${conceptBName}".`);
      return;
    }

    const validNatures = ['supports', 'tensions_with', 'evolves_from', 'depends_on'];
    if (!validNatures.includes(nature)) {
      rhiaSays(`"${nature}" isn't a connection type I recognize. Try: ${validNatures.join(', ')}`);
      return;
    }

    const connectionId = await connectConcepts(
      db,
      conceptAId,
      conceptBId,
      nature as 'supports' | 'tensions_with' | 'evolves_from' | 'depends_on',
      note
    );

    rhiaSays(`Connection recorded: "${conceptAName}" ${nature.replace('_', ' ')} "${conceptBName}".`);
    console.log(`  ID: ${connectionId}`);
  } finally {
    await db.close();
  }
}

async function handleAnswer(questionId: string, answer: string): Promise<void> {
  const db = await getDB();
  try {
    const existing = await getQuestionSummary(db, questionId);
    if (!existing) {
      rhiaSays(`I can't find a question with ID "${questionId}". Use 'questions' to see open questions.`);
      return;
    }

    if (existing.status !== 'open') {
      rhiaSays(`That question is already ${existing.status}. Its answer was: ${existing.answer}`);
      return;
    }

    await answerQuestion(db, questionId, answer);
    rhiaSays(`Beautiful. Question resolved.`);
    console.log(`  Q: ${existing.text}`);
    console.log(`  A: ${answer}`);
    rhiaSays(`Another piece of the puzzle falls into place.`);
  } finally {
    await db.close();
  }
}

// =============================================================================
// Main
// =============================================================================

function printUsage(): void {
  console.log(`
Rhia - Rhizomatic Historian & Archivist

Usage: npx ts-node scripts/rhia/cli.ts <command> [args]

Query Commands:
  concepts                    List all tracked concepts
  concept <name>              Show details about a concept
  questions                   List open questions
  decisions [limit]           List recent decisions
  search <term>               Search across all knowledge

Remember Commands:
  remember concept <name> <description>
  remember question <concept> <question>
  remember decision <concept> <summary> -- <rationale>
  remember observation <concept> <observation> [--pivotal|--minor]
  remember connection <conceptA> <nature> <conceptB> [note]
    (nature: supports, tensions_with, evolves_from, depends_on)

Resolution Commands:
  answer <questionId> <answer>

Examples:
  rhia concepts
  rhia concept ordering
  rhia remember concept "ordering" "How sequences and order are handled"
  rhia remember question "ordering" "How do we handle sequence conflicts?"
  rhia remember decision "ordering" "Order is view-level" -- "Data layer is parallel"
  rhia remember connection "ordering" depends_on "view-resolution"
  rhia answer question-123 "Ordering emerges at reduction time"
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'concepts':
        await handleConcepts();
        break;

      case 'concept':
        if (!args[1]) {
          rhiaSays(`Which concept? Use 'concepts' to see what I'm tracking.`);
          return;
        }
        await handleConcept(args.slice(1).join(' '));
        break;

      case 'questions':
        await handleQuestions();
        break;

      case 'decisions':
        await handleDecisions(parseInt(args[1]) || 10);
        break;

      case 'search':
        if (!args[1]) {
          rhiaSays(`Search for what?`);
          return;
        }
        await handleSearch(args.slice(1).join(' '));
        break;

      case 'remember':
        await handleRemember(args.slice(1));
        break;

      case 'answer':
        if (!args[1] || !args[2]) {
          rhiaSays(`Usage: answer <questionId> <answer>`);
          return;
        }
        await handleAnswer(args[1], args.slice(2).join(' '));
        break;

      case 'help':
      case '--help':
      case '-h':
        printUsage();
        break;

      default:
        if (command) {
          rhiaSays(`I don't understand "${command}". Try 'help' for usage.`);
        } else {
          printUsage();
        }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function handleRemember(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case 'concept':
      if (args.length < 3) {
        rhiaSays(`Usage: remember concept <name> <description>`);
        return;
      }
      await handleRememberConcept(args[1], args.slice(2).join(' '));
      break;

    case 'question':
      if (args.length < 3) {
        rhiaSays(`Usage: remember question <concept> <question>`);
        return;
      }
      await handleRememberQuestion(args[1], args.slice(2).join(' '));
      break;

    case 'decision': {
      // Parse: concept summary -- rationale
      const dashIndex = args.indexOf('--');
      if (dashIndex === -1 || dashIndex < 3) {
        rhiaSays(`Usage: remember decision <concept> <summary> -- <rationale>`);
        return;
      }
      const concept = args[1];
      const summary = args.slice(2, dashIndex).join(' ');
      const rationale = args.slice(dashIndex + 1).join(' ');
      await handleRememberDecision(concept, summary, rationale);
      break;
    }

    case 'observation': {
      if (args.length < 3) {
        rhiaSays(`Usage: remember observation <concept> <observation> [--pivotal|--minor]`);
        return;
      }
      let significance: 'minor' | 'notable' | 'pivotal' = 'notable';
      let obsArgs = args.slice(2);

      if (obsArgs.includes('--pivotal')) {
        significance = 'pivotal';
        obsArgs = obsArgs.filter(a => a !== '--pivotal');
      } else if (obsArgs.includes('--minor')) {
        significance = 'minor';
        obsArgs = obsArgs.filter(a => a !== '--minor');
      }

      await handleRememberObservation(args[1], obsArgs.join(' '), significance);
      break;
    }

    case 'connection':
      if (args.length < 4) {
        rhiaSays(`Usage: remember connection <conceptA> <nature> <conceptB> [note]`);
        return;
      }
      await handleRememberConnection(
        args[1],
        args[2],
        args[3],
        args.slice(4).join(' ') || undefined
      );
      break;

    default:
      rhiaSays(`Remember what? Try: concept, question, decision, observation, or connection.`);
  }
}

main();
