import type { MediaRef } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';
import { artistOf } from './artistOf';

const IGNORED_ARTICLES = ['The', 'El', 'La', 'Los', 'Las', 'Le', 'Les'];

/**
 * Artists grouped by the first letter of their name, leaving out a leading article, as a Subsonic
 * app shows them.
 *
 * @param artists - The artists.
 * @param now - When the index was made, in milliseconds, which apps compare to ask whether it
 *   changed.
 * @returns The index, with the articles left out.
 */
const indexOf = (artists: readonly MediaRef[], now: number = Date.now()): SubsonicBody => {
  const groups = new Map<string, SubsonicBody[]>();

  for (const artist of artists) {
    const words = artist.title.trim().split(/\s+/u);
    const sorted =
      words.length > 1 && IGNORED_ARTICLES.includes(words[0] ?? '')
        ? words.slice(1).join(' ')
        : artist.title;
    const first = sorted.trim().charAt(0).toUpperCase();
    const letter = /\p{L}/u.test(first) ? first : '#';

    const group = groups.get(letter);

    if (group === undefined) {
      groups.set(letter, [artistOf(artist)]);
    } else {
      group.push(artistOf(artist));
    }
  }

  return {
    lastModified: now,
    ignoredArticles: IGNORED_ARTICLES.join(' '),
    index: [...groups.keys()]
      .sort()
      .map((letter) => ({ name: letter, artist: groups.get(letter) ?? [] })),
  };
};

export { indexOf };
