#!/usr/bin/env npx ts-node
/**
 * Team CLI
 *
 * Command-line interface for the RhizomeDB development team.
 *
 * Usage:
 *   npx ts-node scripts/team/cli.ts <agent> <command> [args...]
 *
 * Examples:
 *   npx ts-node scripts/team/cli.ts sparks inbox
 *   npx ts-node scripts/team/cli.ts percy send sparks "Architecture Review" "Let's discuss..."
 *   npx ts-node scripts/team/cli.ts sparks read msg-123
 *   npx ts-node scripts/team/cli.ts sparks broadcast "New Idea" "What if we..."
 */

import {
  initializeMailboxes,
  sendMessage,
  readInbox,
  getUnreadMessages,
  markAsRead,
  markAllAsRead,
  getMessage,
  replyToMessage,
  broadcastMessage,
  formatMessage,
  formatInboxSummary,
  getInboxStats
} from './mailbox';
import { getAgent, getAllAgents, TEAM } from './agents';
import { TEAM_MEMBERS } from './types';

// =============================================================================
// CLI Helpers
// =============================================================================

function printHelp(agentId?: string): void {
  const agent = agentId ? getAgent(agentId) : null;

  console.log(`
Team Communication System
=========================${agent ? `\nActive as: ${agent.name} (${agent.role})` : ''}

Usage: npx ts-node scripts/team/cli.ts <agent> <command> [args...]

Agents: ${Object.values(TEAM_MEMBERS).join(', ')}

Commands:
  inbox                       View inbox summary
  unread                      View unread messages only
  read <messageId>            Read a specific message
  read-all                    Mark all messages as read
  send <to> <subject> <body>  Send a message to another agent
  reply <messageId> <body>    Reply to a message
  broadcast <subject> <body>  Send to all team members
  stats                       View inbox statistics
  team                        List all team members
  profile [agent]             View an agent's profile
  help                        Show this help

Examples:
  npx ts-node scripts/team/cli.ts sparks inbox
  npx ts-node scripts/team/cli.ts percy send sparks "Review Request" "Can you look at..."
  npx ts-node scripts/team/cli.ts sparks broadcast "Idea" "What if we could..."
`);
}

function printAgentIntro(agentId: string): void {
  const agent = getAgent(agentId);
  if (!agent) return;

  const stats = getInboxStats(agentId);
  const unreadNote = stats.unread > 0 ? ` (${stats.unread} unread)` : '';

  console.log(`\n${agent.name} - ${agent.role}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`📬 ${stats.total} messages${unreadNote}\n`);
}

// =============================================================================
// Commands
// =============================================================================

function cmdInbox(agentId: string): void {
  printAgentIntro(agentId);
  console.log(formatInboxSummary(agentId));
}

function cmdUnread(agentId: string): void {
  const messages = getUnreadMessages(agentId);

  if (messages.length === 0) {
    console.log('No unread messages.');
    return;
  }

  console.log(`${messages.length} unread message${messages.length !== 1 ? 's' : ''}:\n`);
  for (const message of messages) {
    console.log(formatMessage(message));
    console.log();
  }
}

function cmdRead(agentId: string, messageId: string): void {
  const message = getMessage(agentId, messageId);

  if (!message) {
    console.error(`Message not found: ${messageId}`);
    process.exit(1);
  }

  console.log(formatMessage(message));

  if (!message.read) {
    markAsRead(agentId, messageId);
    console.log('\n(Marked as read)');
  }
}

function cmdReadAll(agentId: string): void {
  const count = markAllAsRead(agentId);
  console.log(`Marked ${count} message${count !== 1 ? 's' : ''} as read.`);
}

function cmdSend(agentId: string, to: string, subject: string, body: string): void {
  const recipient = getAgent(to);
  if (!recipient) {
    console.error(`Unknown recipient: ${to}`);
    console.error(`Available: ${Object.values(TEAM_MEMBERS).join(', ')}`);
    process.exit(1);
  }

  const message = sendMessage(agentId, to, subject, body);
  console.log(`Message sent to ${recipient.name}!`);
  console.log(`  ID: ${message.id}`);
  console.log(`  Subject: ${subject}`);
}

function cmdReply(agentId: string, messageId: string, body: string): void {
  try {
    const message = replyToMessage(agentId, messageId, body);
    const recipient = getAgent(message.to);
    console.log(`Reply sent to ${recipient?.name || message.to}!`);
    console.log(`  ID: ${message.id}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

function cmdBroadcast(agentId: string, subject: string, body: string): void {
  const messages = broadcastMessage(agentId, subject, body);
  const recipients = messages.map(m => getAgent(m.to)?.name || m.to).join(', ');
  console.log(`Broadcast sent to: ${recipients}`);
  console.log(`  Subject: ${subject}`);
}

function cmdStats(agentId: string): void {
  const stats = getInboxStats(agentId);

  console.log(`Inbox Statistics for ${getAgent(agentId)?.name || agentId}`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`Total messages: ${stats.total}`);
  console.log(`Unread: ${stats.unread}`);
  console.log(`\nBy sender:`);

  for (const [from, count] of Object.entries(stats.byFrom)) {
    const sender = getAgent(from);
    console.log(`  ${sender?.name || from}: ${count}`);
  }
}

function cmdTeam(): void {
  console.log('RhizomeDB Development Team');
  console.log('══════════════════════════\n');

  for (const agent of getAllAgents()) {
    const authority = agent.decisionAuthority ? ' 👑' : '';
    console.log(`${agent.name}${authority}`);
    console.log(`  ${agent.role}`);
    console.log();
  }
}

function cmdProfile(agentId: string): void {
  const agent = getAgent(agentId);

  if (!agent) {
    console.error(`Unknown agent: ${agentId}`);
    process.exit(1);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`${agent.name}${agent.decisionAuthority ? ' 👑' : ''}`);
  console.log(`${agent.role}`);
  console.log(`${'═'.repeat(60)}\n`);

  console.log('Personality:');
  console.log(agent.personality);
  console.log();

  console.log('Responsibilities:');
  for (const r of agent.responsibilities) {
    console.log(`  • ${r}`);
  }
  console.log();
}

// =============================================================================
// Main
// =============================================================================

function main(): void {
  initializeMailboxes();

  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help') {
    printHelp();
    return;
  }

  const agentId = args[0].toLowerCase();
  const command = args[1]?.toLowerCase() || 'inbox';

  // Special commands that don't need an agent context
  if (agentId === 'team') {
    cmdTeam();
    return;
  }

  if (agentId === 'profile') {
    cmdProfile(args[1] || TEAM_MEMBERS.PERCY);
    return;
  }

  // Validate agent
  const agent = getAgent(agentId);
  if (!agent) {
    console.error(`Unknown agent: ${agentId}`);
    console.error(`Available: ${Object.values(TEAM_MEMBERS).join(', ')}`);
    process.exit(1);
  }

  // Route commands
  switch (command) {
    case 'inbox':
      cmdInbox(agentId);
      break;

    case 'unread':
      cmdUnread(agentId);
      break;

    case 'read':
      if (!args[2]) {
        console.error('Usage: read <messageId>');
        process.exit(1);
      }
      cmdRead(agentId, args[2]);
      break;

    case 'read-all':
      cmdReadAll(agentId);
      break;

    case 'send':
      if (args.length < 5) {
        console.error('Usage: send <to> <subject> <body>');
        process.exit(1);
      }
      cmdSend(agentId, args[2], args[3], args.slice(4).join(' '));
      break;

    case 'reply':
      if (args.length < 4) {
        console.error('Usage: reply <messageId> <body>');
        process.exit(1);
      }
      cmdReply(agentId, args[2], args.slice(3).join(' '));
      break;

    case 'broadcast':
      if (args.length < 4) {
        console.error('Usage: broadcast <subject> <body>');
        process.exit(1);
      }
      cmdBroadcast(agentId, args[2], args.slice(3).join(' '));
      break;

    case 'stats':
      cmdStats(agentId);
      break;

    case 'profile':
      cmdProfile(agentId);
      break;

    case 'help':
      printHelp(agentId);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp(agentId);
      process.exit(1);
  }
}

main();
