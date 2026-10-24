import type { ListState } from './ListState';

/**
 * What a list entry should say once somebody has watched an episode of it. Progress only ever
 * rises. A completed show stays completed unless they start it again from its first episode, which
 * begins a rewatch; finishing a rewatch completes the show again and counts the rewatch, where the
 * count is known; one that isn't stays unknown, and is left as the list has it.
 *
 * @param current - What the entry says now, or nothing where the show isn't on the list.
 * @param watched - The number, within this entry, of the episode just finished.
 * @param episodes - How many episodes the entry has, where known.
 * @returns What the entry should say, or nothing where it should be left as it is.
 */
const nextListState = (
  current: ListState | null,
  watched: number,
  episodes: number | null,
): ListState | null => {
  const reached = episodes === null ? watched : Math.min(watched, episodes);
  const isLast = episodes !== null && reached >= episodes;
  const repeat = current === null ? 0 : current.repeat;
  const counted = repeat === null ? null : repeat + 1;

  if (current?.status === 'completed') {
    if (reached !== 1) {
      return null;
    }

    return isLast
      ? { status: 'completed', progress: reached, repeat: counted }
      : { status: 'repeating', progress: reached, repeat };
  }

  if (current?.status === 'repeating') {
    if (reached <= current.progress) {
      return null;
    }

    return isLast
      ? { status: 'completed', progress: reached, repeat: counted }
      : { status: 'repeating', progress: reached, repeat };
  }

  const progress = Math.max(current?.progress ?? 0, reached);

  if (isLast || (episodes !== null && progress >= episodes)) {
    return { status: 'completed', progress, repeat };
  }

  return current?.status === 'watching' && progress === current.progress
    ? null
    : { status: 'watching', progress, repeat };
};

export { nextListState };
