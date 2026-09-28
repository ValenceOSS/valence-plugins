/**
 * A title reduced to what two services agree on: lower case, accents and punctuation gone, `&` as
 * `and`, and a leading "the" dropped, so "The Apothecary Diaries" and "Apothecary Diaries" match.
 *
 * @param title - A title as a service wrote it.
 * @returns The title to compare.
 */
const normaliseTitle = (title: string): string =>
  title
    .normalize('NFKD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replaceAll('&', ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^the /u, '');

export { normaliseTitle };
