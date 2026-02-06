/**
 * Protocol Codec Tests
 *
 * Encode/decode roundtrip tests for all message types.
 */

import { encodeMessage, decodeMessage, validateMessage } from './codec';
import { MessageType, PROTOCOL_VERSION, ProtocolMessage } from './messages';

describe('Codec: encodeMessage / decodeMessage roundtrip', () => {
  it('should roundtrip HELLO message', () => {
    const msg: ProtocolMessage = {
      type: MessageType.HELLO,
      timestamp: Date.now(),
      systemId: 'sys-1',
      config: { mode: 'bidirectional' },
      protocol: PROTOCOL_VERSION
    };
    const encoded = encodeMessage(msg);
    const decoded = decodeMessage(encoded);
    expect(decoded.type).toBe(MessageType.HELLO);
    expect((decoded as typeof msg).systemId).toBe('sys-1');
    expect((decoded as typeof msg).protocol).toBe(PROTOCOL_VERSION);
  });

  it('should roundtrip HELLO_ACK message', () => {
    const msg: ProtocolMessage = {
      type: MessageType.HELLO_ACK,
      timestamp: Date.now(),
      systemId: 'sys-2',
      linkId: 'link-1',
      protocol: PROTOCOL_VERSION
    };
    const decoded = decodeMessage(encodeMessage(msg));
    expect(decoded.type).toBe(MessageType.HELLO_ACK);
    expect((decoded as typeof msg).linkId).toBe('link-1');
  });

  it('should roundtrip DELTA message', () => {
    const msg: ProtocolMessage = {
      type: MessageType.DELTA,
      timestamp: Date.now(),
      delta: {
        id: 'd1',
        timestamp: Date.now(),
        author: 'author',
        system: 'sys',
        pointers: [{ role: 'test', target: 'val' }]
      }
    };
    const decoded = decodeMessage(encodeMessage(msg));
    expect(decoded.type).toBe(MessageType.DELTA);
    expect((decoded as typeof msg).delta.id).toBe('d1');
    expect((decoded as typeof msg).delta.pointers).toHaveLength(1);
  });

  it('should roundtrip DELTA_ACK message', () => {
    const msg: ProtocolMessage = {
      type: MessageType.DELTA_ACK,
      timestamp: Date.now(),
      deltaId: 'd1'
    };
    const decoded = decodeMessage(encodeMessage(msg));
    expect(decoded.type).toBe(MessageType.DELTA_ACK);
    expect((decoded as typeof msg).deltaId).toBe('d1');
  });

  it('should roundtrip DELTA_NACK message', () => {
    const msg: ProtocolMessage = {
      type: MessageType.DELTA_NACK,
      timestamp: Date.now(),
      deltaId: 'd1',
      reason: 'untrusted'
    };
    const decoded = decodeMessage(encodeMessage(msg));
    expect(decoded.type).toBe(MessageType.DELTA_NACK);
    expect((decoded as typeof msg).reason).toBe('untrusted');
  });

  it('should roundtrip SYNC_REQUEST message', () => {
    const msg: ProtocolMessage = {
      type: MessageType.SYNC_REQUEST,
      timestamp: Date.now(),
      fromTimestamp: 1000
    };
    const decoded = decodeMessage(encodeMessage(msg));
    expect(decoded.type).toBe(MessageType.SYNC_REQUEST);
    expect((decoded as typeof msg).fromTimestamp).toBe(1000);
  });

  it('should roundtrip SYNC_START message', () => {
    const msg: ProtocolMessage = {
      type: MessageType.SYNC_START,
      timestamp: Date.now(),
      totalDeltas: 42,
      batchSize: 100
    };
    const decoded = decodeMessage(encodeMessage(msg));
    expect((decoded as typeof msg).totalDeltas).toBe(42);
  });

  it('should roundtrip SYNC_BATCH message', () => {
    const msg: ProtocolMessage = {
      type: MessageType.SYNC_BATCH,
      timestamp: Date.now(),
      deltas: [
        { id: 'd1', timestamp: 1, author: 'a', system: 's', pointers: [] },
        { id: 'd2', timestamp: 2, author: 'a', system: 's', pointers: [] }
      ],
      batchNumber: 0,
      isLastBatch: true
    };
    const decoded = decodeMessage(encodeMessage(msg));
    expect((decoded as typeof msg).deltas).toHaveLength(2);
    expect((decoded as typeof msg).isLastBatch).toBe(true);
  });

  it('should roundtrip SYNC_COMPLETE message', () => {
    const msg: ProtocolMessage = {
      type: MessageType.SYNC_COMPLETE,
      timestamp: Date.now(),
      deltasProcessed: 42
    };
    const decoded = decodeMessage(encodeMessage(msg));
    expect((decoded as typeof msg).deltasProcessed).toBe(42);
  });

  it('should roundtrip PING/PONG messages', () => {
    const ping: ProtocolMessage = { type: MessageType.PING, timestamp: Date.now() };
    const pong: ProtocolMessage = { type: MessageType.PONG, timestamp: Date.now() };
    expect(decodeMessage(encodeMessage(ping)).type).toBe(MessageType.PING);
    expect(decodeMessage(encodeMessage(pong)).type).toBe(MessageType.PONG);
  });

  it('should roundtrip PAUSE/RESUME messages', () => {
    const pause: ProtocolMessage = { type: MessageType.PAUSE, timestamp: Date.now() };
    const resume: ProtocolMessage = { type: MessageType.RESUME, timestamp: Date.now() };
    expect(decodeMessage(encodeMessage(pause)).type).toBe(MessageType.PAUSE);
    expect(decodeMessage(encodeMessage(resume)).type).toBe(MessageType.RESUME);
  });

  it('should roundtrip ERROR message', () => {
    const msg: ProtocolMessage = {
      type: MessageType.ERROR,
      timestamp: Date.now(),
      code: 'ERR_TEST',
      message: 'Something went wrong',
      fatal: true
    };
    const decoded = decodeMessage(encodeMessage(msg));
    expect((decoded as typeof msg).code).toBe('ERR_TEST');
    expect((decoded as typeof msg).fatal).toBe(true);
  });
});

describe('Codec: error handling', () => {
  it('should throw on invalid JSON', () => {
    expect(() => decodeMessage('not json')).toThrow('Failed to decode');
  });

  it('should throw on missing type', () => {
    expect(() => decodeMessage('{"timestamp": 123}')).toThrow('missing type');
  });

  it('should throw on missing timestamp', () => {
    expect(() => decodeMessage('{"type": "hello"}')).toThrow('missing timestamp');
  });
});

describe('Codec: validateMessage', () => {
  it('should validate correct messages', () => {
    expect(validateMessage({ type: 'hello', timestamp: 123 })).toBe(true);
  });

  it('should reject non-objects', () => {
    expect(validateMessage(null)).toBe(false);
    expect(validateMessage('string')).toBe(false);
    expect(validateMessage(42)).toBe(false);
  });

  it('should reject messages without type', () => {
    expect(validateMessage({ timestamp: 123 })).toBe(false);
  });

  it('should reject messages without timestamp', () => {
    expect(validateMessage({ type: 'hello' })).toBe(false);
  });
});
