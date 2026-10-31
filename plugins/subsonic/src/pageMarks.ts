import type { MediaRef } from '@ValenceSDK/host/ValenceHost';

const KEPT_FOR_MILLISECONDS = 10 * 60_000;

const marks = new Map<string, { keptAt: number; next: (string | null)[] }>();

/**
 * Where each page of one kind of thing in the library starts, as one person sees it, as far as it
 * has been read in the last few minutes: the first page starts at the beginning, and a page that
 * starts nowhere means the library ended before it. Marks older than that are forgotten, for
 * everybody, so they follow the library as it changes and never pile up.
 *
 * @param profileId - Who is reading.
 * @param kind - What they are reading.
 * @param now - The time now, in milliseconds.
 * @returns The marks, to read from and add to.
 */
const pageMarks = (
  profileId: string,
  kind: MediaRef['kind'],
  now: number = Date.now(),
): (string | null)[] => {
  for (const [key, kept] of marks) {
    if (now - kept.keptAt >= KEPT_FOR_MILLISECONDS) {
      marks.delete(key);
    }
  }

  const key = `${profileId}:${kind}`;
  const kept = marks.get(key);

  if (kept !== undefined) {
    return kept.next;
  }

  const next: (string | null)[] = [null];

  marks.set(key, { keptAt: now, next });

  return next;
};

export { pageMarks };
