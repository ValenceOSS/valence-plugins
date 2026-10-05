import { utf8Bytes } from './utf8Bytes';

describe('utf8Bytes', () => {
  it.each(['', 'abc', 'naïve', '☕', '𝄞 clef', 'lone \ud800 surrogate'])(
    'encodes %j as the platform does',
    (text) => {
      expect(utf8Bytes(text)).toEqual(new TextEncoder().encode(text));
    },
  );
});
