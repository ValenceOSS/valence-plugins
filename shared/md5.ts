import { utf8Bytes } from './utf8Bytes';

const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
  20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const CONSTANTS = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
];

/**
 * The MD5 digest of some text, for Last.fm's request signatures, which a plugin's sandbox has no
 * built-in way to make: `valence.crypto.hmac` offers only the SHA family.
 *
 * @param text - The text, encoded as UTF-8 first.
 * @returns The digest, as 32 lower-case hex digits.
 */
const md5 = (text: string): string => {
  const message = utf8Bytes(text);
  const padded = new Uint8Array((((message.length + 8) >>> 6) + 1) * 64);

  padded.set(message);
  padded[message.length] = 0x80;

  const view = new DataView(padded.buffer);

  view.setUint32(padded.length - 8, (message.length * 8) >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(message.length / 0x20000000), true);

  const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];

  for (let block = 0; block < padded.length; block += 64) {
    const words = Array.from({ length: 16 }, (_, at) => view.getUint32(block + at * 4, true));
    let [a, b, c, d] = state as [number, number, number, number];

    for (let at = 0; at < 64; at += 1) {
      const [mixed, word] =
        at < 16
          ? [(b & c) | (~b & d), at]
          : at < 32
            ? [(d & b) | (~d & c), (5 * at + 1) % 16]
            : at < 48
              ? [b ^ c ^ d, (3 * at + 5) % 16]
              : [c ^ (b | ~d), (7 * at) % 16];
      const sum = (a + mixed + (CONSTANTS[at] ?? 0) + (words[word] ?? 0)) | 0;
      const shift = SHIFTS[at] ?? 0;

      a = d;
      d = c;
      c = b;
      b = (b + ((sum << shift) | (sum >>> (32 - shift)))) | 0;
    }

    state[0] = ((state[0] ?? 0) + a) | 0;
    state[1] = ((state[1] ?? 0) + b) | 0;
    state[2] = ((state[2] ?? 0) + c) | 0;
    state[3] = ((state[3] ?? 0) + d) | 0;
  }

  const digest = new DataView(new ArrayBuffer(16));

  for (const [at, word] of state.entries()) {
    digest.setUint32(at * 4, word, true);
  }

  return [...new Uint8Array(digest.buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export { md5 };
