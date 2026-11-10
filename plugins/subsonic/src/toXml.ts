import type { SubsonicBody, SubsonicValue } from './SubsonicBody';

/**
 * Escapes text for an XML attribute, leaving out characters XML 1.0 may not hold at all, such as a
 * lone surrogate from a badly written tag, and keeping tabs and line breaks as they were.
 *
 * @param text - The text.
 * @returns It, safe inside double quotes.
 */
const escaped = (text: string): string =>
  text
    .replace(/[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/\t/gu, '&#9;')
    .replace(/\n/gu, '&#10;')
    .replace(/\r/gu, '&#13;');

/**
 * Writes one element the way Subsonic writes its XML: plain values as attributes, a `value` as the
 * element's text, as OpenSubsonic names a genre's or a lyric's words in JSON, objects as child
 * elements, and a list as the same element repeated.
 *
 * @param name - The element's name.
 * @param value - What it holds.
 * @returns The XML.
 */
const toXml = (name: string, value: SubsonicValue): string => {
  if (Array.isArray(value)) {
    return value.map((each) => toXml(name, each)).join('');
  }

  if (value === null || typeof value !== 'object') {
    return value === null ? '' : `<${name}>${escaped(String(value))}</${name}>`;
  }

  const { value: text = null, ...body }: SubsonicBody = value;
  const said = text === null || typeof text === 'object' ? '' : escaped(String(text));
  const attributes = Object.entries(body)
    .filter(([, each]) => each !== null && typeof each !== 'object')
    .map(([key, each]) => ` ${key}="${escaped(String(each))}"`)
    .join('');
  const children = Object.entries(body)
    .filter(([, each]) => each !== null && typeof each === 'object')
    .map(([key, each]) => toXml(key, each))
    .join('');

  return children === '' && said === ''
    ? `<${name}${attributes}/>`
    : `<${name}${attributes}>${said}${children}</${name}>`;
};

export { toXml };
