import { gzipSync } from 'node:zlib';
import { isSamePayload } from './isSamePayload';

describe('isSamePayload', () => {
  it('matches packages that unpack to the same bytes, whatever their gzip headers say', () => {
    const payload = Buffer.from('{"format":1}');
    const fromMac = gzipSync(payload);
    const fromLinux = Buffer.from(fromMac);

    fromLinux[9] = 3;

    expect(fromLinux.equals(fromMac)).toBe(false);
    expect(isSamePayload(fromMac, fromLinux)).toBe(true);
    expect(isSamePayload(fromMac, gzipSync(Buffer.from('{"format":2}')))).toBe(false);
  });
});
