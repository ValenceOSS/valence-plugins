import type { MediaRef, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { LIBRARY_PAGE } from './LIBRARY_PAGE';
import { itemsFrom } from './itemsFrom';
import { pageMarks } from './pageMarks';
import { shuffled } from './shuffled';

const PAGES_READ = 10;

/**
 * Picks things of one kind at random, as one person sees the library: ten pages are read from a
 * page picked at random among those known to exist, so each pick reaches a little further into a
 * large library than the last without reading all of it.
 *
 * @param valence - The host.
 * @param profileId - Who is reading.
 * @param kind - What to pick.
 * @param count - How many to pick.
 * @returns What was picked, in a random order.
 */
const randomItems = async (
  valence: ValenceHost,
  profileId: string,
  kind: MediaRef['kind'],
  count: number,
): Promise<MediaRef[]> => {
  const known = pageMarks(profileId, kind).filter(
    (mark, page) => page === 0 || mark !== null,
  ).length;
  const first = Math.floor(Math.random() * known);
  const read = await itemsFrom(
    valence,
    profileId,
    kind,
    first * LIBRARY_PAGE,
    PAGES_READ * LIBRARY_PAGE,
  );

  return shuffled(read).slice(0, count);
};

export { randomItems };
