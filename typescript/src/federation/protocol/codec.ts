/**
 * Protocol Message Codec
 *
 * Encoding/decoding of federation protocol messages.
 */

import { ProtocolMessage } from './messages';

/**
 * Encode a protocol message to JSON string
 */
export function encodeMessage(message: ProtocolMessage): string {
  return JSON.stringify(message);
}

/**
 * Decode a JSON string to protocol message
 */
export function decodeMessage(data: string): ProtocolMessage {
  try {
    const parsed = JSON.parse(data);

    if (!parsed.type) {
      throw new Error('Message missing type field');
    }

    if (!parsed.timestamp) {
      throw new Error('Message missing timestamp field');
    }

    return parsed as ProtocolMessage;
  } catch (error) {
    throw new Error(
      `Failed to decode message: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate a protocol message structure
 */
export function validateMessage(message: unknown): message is ProtocolMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const msg = message as Record<string, unknown>;

  if (typeof msg.type !== 'string') {
    return false;
  }

  if (typeof msg.timestamp !== 'number') {
    return false;
  }

  return true;
}
