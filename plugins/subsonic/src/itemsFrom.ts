import type { MediaRef, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { LIBRARY_PAGE } from './LIBRARY_PAGE';
import { pageMarks } from './pageMarks';

const MOST_PAGES = 500;

/**
 * Reads up to a count of things of one kind from an offset into the library, in title order, as one
 * person sees it. Reading starts from the furthest page known to come before the offset, so an app
 * reading the whole library page after page doesn't read it from the start each time, and only what
 * was asked for is kept, so a large offset costs reads but never memory. At most 500 pages are read
 * for one answer.
 *
 * @param valence - The host.
 * @param profileId - Who is reading.
 * @param kind - What to read.
 * @param offset - How many to pass over first.
 * @param count - How many to read.
 * @returns What was read.
 */
const itemsFrom = async (
  valence: ValenceHost,
  profileId: string,
  kind: MediaRef['kind'],
  offset: number,
  count: number,
): Promise<MediaRef[]> => {
  const next = pageMarks(profileId, kind);
  const found: MediaRef[] = [];
  let page = Math.min(Math.floor(offset / LIBRARY_PAGE), next.length - 1);

  for (let read = 0; read < MOST_PAGES && found.length < count; read += 1) {
    const after = next[page];

    if (after === undefined || (page > 0 && after === null)) {
      break;
    }

    const listed = await valence.library.list(
      { kind, limit: LIBRARY_PAGE, ...(after === null ? {} : { after }) },
      { profileId },
    );
    const start = page * LIBRARY_PAGE;

    next[page + 1] = listed.next;
    found.push(
      ...listed.items.slice(Math.max(0, offset - start), Math.max(0, offset + count - start)),
    );

    if (listed.next === null) {
      break;
    }

    page += 1;
  }

  return found.slice(0, count);
};

export { itemsFrom };
