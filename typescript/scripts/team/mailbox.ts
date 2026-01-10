/**
 * Team Mailbox System
 *
 * File-based mailbox for inter-agent communication.
 * Each agent has an inbox folder where other agents can drop messages.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Message, TeamMemberId, TEAM_MEMBERS } from './types';

// =============================================================================
// Configuration
// =============================================================================

const TEAM_DIR = path.join(__dirname, '../../../.team');
const INBOXES_DIR = path.join(TEAM_DIR, 'inboxes');

// =============================================================================
// Initialization
// =============================================================================

/**
 * Ensure the mailbox directory structure exists
 */
export function initializeMailboxes(): void {
  // Create .team directory
  if (!fs.existsSync(TEAM_DIR)) {
    fs.mkdirSync(TEAM_DIR, { recursive: true });
  }

  // Create inboxes directory
  if (!fs.existsSync(INBOXES_DIR)) {
    fs.mkdirSync(INBOXES_DIR, { recursive: true });
  }

  // Create inbox for each team member
  for (const memberId of Object.values(TEAM_MEMBERS)) {
    const inboxPath = path.join(INBOXES_DIR, memberId);
    if (!fs.existsSync(inboxPath)) {
      fs.mkdirSync(inboxPath, { recursive: true });
    }
  }
}

// =============================================================================
// Message Operations
// =============================================================================

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get the path to an agent's inbox
 */
function getInboxPath(agentId: string): string {
  return path.join(INBOXES_DIR, agentId);
}

/**
 * Get the path to a specific message file
 */
function getMessagePath(agentId: string, messageId: string): string {
  return path.join(getInboxPath(agentId), `${messageId}.json`);
}

/**
 * Send a message to another agent's inbox
 */
export function sendMessage(
  from: string,
  to: string,
  subject: string,
  content: string,
  options?: {
    inReplyTo?: string;
    tags?: string[];
  }
): Message {
  initializeMailboxes();

  const message: Message = {
    id: generateMessageId(),
    from,
    to,
    subject,
    content,
    timestamp: Date.now(),
    read: false,
    inReplyTo: options?.inReplyTo,
    tags: options?.tags
  };

  const messagePath = getMessagePath(to, message.id);
  fs.writeFileSync(messagePath, JSON.stringify(message, null, 2));

  return message;
}

/**
 * Read all messages in an agent's inbox
 */
export function readInbox(agentId: string): Message[] {
  initializeMailboxes();

  const inboxPath = getInboxPath(agentId);
  const files = fs.readdirSync(inboxPath).filter(f => f.endsWith('.json'));

  const messages: Message[] = [];
  for (const file of files) {
    const filePath = path.join(inboxPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    messages.push(JSON.parse(content) as Message);
  }

  // Sort by timestamp, newest first
  return messages.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get unread messages from an agent's inbox
 */
export function getUnreadMessages(agentId: string): Message[] {
  return readInbox(agentId).filter(m => !m.read);
}

/**
 * Mark a message as read
 */
export function markAsRead(agentId: string, messageId: string): void {
  const messagePath = getMessagePath(agentId, messageId);

  if (!fs.existsSync(messagePath)) {
    throw new Error(`Message not found: ${messageId}`);
  }

  const content = fs.readFileSync(messagePath, 'utf-8');
  const message = JSON.parse(content) as Message;
  message.read = true;

  fs.writeFileSync(messagePath, JSON.stringify(message, null, 2));
}

/**
 * Mark all messages in an inbox as read
 */
export function markAllAsRead(agentId: string): number {
  const unread = getUnreadMessages(agentId);
  for (const message of unread) {
    markAsRead(agentId, message.id);
  }
  return unread.length;
}

/**
 * Get a specific message by ID
 */
export function getMessage(agentId: string, messageId: string): Message | null {
  const messagePath = getMessagePath(agentId, messageId);

  if (!fs.existsSync(messagePath)) {
    return null;
  }

  const content = fs.readFileSync(messagePath, 'utf-8');
  return JSON.parse(content) as Message;
}

/**
 * Reply to a message (sends to original sender)
 */
export function replyToMessage(
  agentId: string,
  originalMessageId: string,
  content: string
): Message {
  const original = getMessage(agentId, originalMessageId);
  if (!original) {
    throw new Error(`Original message not found: ${originalMessageId}`);
  }

  return sendMessage(
    agentId,
    original.from,
    `Re: ${original.subject}`,
    content,
    { inReplyTo: originalMessageId, tags: original.tags }
  );
}

/**
 * Broadcast a message to all team members (except sender)
 */
export function broadcastMessage(
  from: string,
  subject: string,
  content: string,
  options?: { tags?: string[] }
): Message[] {
  const messages: Message[] = [];

  for (const memberId of Object.values(TEAM_MEMBERS)) {
    if (memberId !== from) {
      messages.push(sendMessage(from, memberId, subject, content, options));
    }
  }

  return messages;
}

/**
 * Get inbox statistics for an agent
 */
export function getInboxStats(agentId: string): {
  total: number;
  unread: number;
  byFrom: Record<string, number>;
} {
  const messages = readInbox(agentId);
  const unread = messages.filter(m => !m.read).length;

  const byFrom: Record<string, number> = {};
  for (const message of messages) {
    byFrom[message.from] = (byFrom[message.from] || 0) + 1;
  }

  return { total: messages.length, unread, byFrom };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format a message for display
 */
export function formatMessage(message: Message): string {
  const date = new Date(message.timestamp).toLocaleString();
  const readStatus = message.read ? '' : ' [UNREAD]';
  const tags = message.tags?.length ? ` [${message.tags.join(', ')}]` : '';

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: ${message.from}${readStatus}
Date: ${date}${tags}
Subject: ${message.subject}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${message.content}
`.trim();
}

/**
 * Format inbox summary for display
 */
export function formatInboxSummary(agentId: string): string {
  const messages = readInbox(agentId);
  const stats = getInboxStats(agentId);

  if (messages.length === 0) {
    return `📭 Inbox empty`;
  }

  let summary = `📬 ${stats.total} message${stats.total !== 1 ? 's' : ''}`;
  if (stats.unread > 0) {
    summary += ` (${stats.unread} unread)`;
  }
  summary += '\n\n';

  for (const message of messages.slice(0, 10)) {
    const readMark = message.read ? '  ' : '● ';
    const date = new Date(message.timestamp).toLocaleDateString();
    summary += `${readMark}[${date}] ${message.from}: ${message.subject}\n`;
  }

  if (messages.length > 10) {
    summary += `\n  ... and ${messages.length - 10} more`;
  }

  return summary;
}
