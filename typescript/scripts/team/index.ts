/**
 * Team Module
 *
 * The RhizomeDB development team - a collaborative group of agents
 * who communicate via a shared mailbox system.
 *
 * Team Members:
 * - Sparks: Eccentric inventor, pushes boundaries, envisions ambitious use cases
 * - Percy: Veteran systems engineer, technical lead with decision authority
 * - Rhia: Historian, tracks the project's intellectual evolution
 *
 * @example
 * ```typescript
 * import { sendMessage, readInbox, SPARKS, PERCY } from './team';
 *
 * // Sparks sends Percy a message
 * sendMessage(SPARKS.id, PERCY.id, 'New Idea!', 'What if we could...');
 *
 * // Percy checks inbox
 * const messages = readInbox(PERCY.id);
 * ```
 */

export * from './types';
export * from './agents';
export * from './mailbox';
