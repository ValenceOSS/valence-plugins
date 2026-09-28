import { base64 } from './base64';

describe('base64', () => {
  it.each(['', 'a', 'ab', 'abc', 'client:secret', 'naïve ☕'])(
    'encodes %j as the platform does',
    (text) => {
      expect(base64(text)).toBe(Buffer.from(text, 'utf8').toString('base64'));
    },
  );
});
