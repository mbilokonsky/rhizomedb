/**
 * Team Agent Types
 *
 * Shared types for the RhizomeDB development team agents.
 */

// =============================================================================
// Agent Profiles
// =============================================================================

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  personality: string;
  responsibilities: string[];
  decisionAuthority: boolean;
}

// =============================================================================
// Mailbox System
// =============================================================================

export interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: number;
  read: boolean;
  inReplyTo?: string; // message id this is responding to
  tags?: string[];    // e.g., ['urgent', 'architecture', 'proposal']
}

export interface Inbox {
  agentId: string;
  messages: Message[];
}

// =============================================================================
// Meetings
// =============================================================================

export interface MeetingParticipant {
  agentId: string;
  role: 'facilitator' | 'participant';
}

export interface MeetingEntry {
  speaker: string;
  content: string;
  timestamp: number;
  type: 'statement' | 'question' | 'proposal' | 'decision' | 'action-item';
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: MeetingParticipant[];
  agenda: string[];
  entries: MeetingEntry[];
  decisions: string[];
  actionItems: Array<{
    assignee: string;
    task: string;
    status: 'pending' | 'in-progress' | 'done';
  }>;
}

// =============================================================================
// Team Constants
// =============================================================================

export const TEAM_MEMBERS = {
  RHIA: 'rhia',
  SPARKS: 'sparks',
  PERCY: 'percy',
  DEX: 'dex',
  QUACK: 'quack',
  UMBERTO: 'umberto',
  MYCELIO: 'mycelio'
} as const;

export type TeamMemberId = typeof TEAM_MEMBERS[keyof typeof TEAM_MEMBERS];
