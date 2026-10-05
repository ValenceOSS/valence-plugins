import { utf8Bytes } from './utf8Bytes';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encodes text as base64, for a Basic authorisation header, without relying on `btoa`, `Buffer` or
 * `TextEncoder`, none of which a plugin's sandbox has.
 *
 * @param text - The text, encoded as UTF-8 first.
 * @returns The base64.
 */
const base64 = (text: string): string => {
  const bytes = utf8Bytes(text);
  let out = '';

  for (let at = 0; at < bytes.length; at += 3) {
    const first = bytes[at] ?? 0;
    const second = bytes[at + 1];
    const third = bytes[at + 2];
    const triple = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    out += ALPHABET[(triple >> 18) & 63] ?? '';
    out += ALPHABET[(triple >> 12) & 63] ?? '';
    out += second === undefined ? '=' : (ALPHABET[(triple >> 6) & 63] ?? '');
    out += third === undefined ? '=' : (ALPHABET[triple & 63] ?? '');
  }

  return out;
};

export { base64 };
