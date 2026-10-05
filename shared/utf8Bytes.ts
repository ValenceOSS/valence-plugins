/**
 * Text encoded as UTF-8, without `TextEncoder`, which a plugin's sandbox does not have. A lone
 * surrogate becomes U+FFFD, as `TextEncoder` makes it.
 *
 * @param text - The text.
 * @returns Its bytes.
 */
const utf8Bytes = (text: string): Uint8Array => {
  const bytes: number[] = [];

  for (const character of text) {
    const point = character.codePointAt(0) ?? 0;
    const code = point >= 0xd800 && point <= 0xdfff ? 0xfffd : point;

    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
    }
  }

  return Uint8Array.from(bytes);
};

export { utf8Bytes };
