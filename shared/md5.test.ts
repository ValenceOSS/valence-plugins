import { createHash } from 'node:crypto';
import { md5 } from './md5';

describe('md5', () => {
  it.each([
    '',
    'a',
    'abc',
    'message digest',
    'naïve ☕',
    'x'.repeat(55),
    'x'.repeat(64),
    'y'.repeat(1000),
  ])('digests %j as the platform does', (text) => {
    expect(md5(text)).toBe(createHash('md5').update(text, 'utf8').digest('hex'));
  });
});
