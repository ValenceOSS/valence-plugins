import { gzipSync } from 'node:zlib';
import { isSamePayload } from './isSamePayload';

describe('isSamePayload', () => {
  it('matches packages that unpack to the same bytes, however they were compressed', () => {
    const payload = Buffer.from(JSON.stringify({ format: 1, code: 'say("hello");'.repeat(50) }));
    const stored = gzipSync(payload, { level: 0 });
    const squeezed = gzipSync(payload, { level: 9 });

    expect(stored.equals(squeezed)).toBe(false);
    expect(isSamePayload(stored, squeezed)).toBe(true);
    expect(isSamePayload(stored, gzipSync(Buffer.from('{"format":2}')))).toBe(false);
  });
});
