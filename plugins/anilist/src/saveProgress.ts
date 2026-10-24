import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { nextListState } from './nextListState';
import type { Provider } from './Provider';
import { readListState } from './readListState';
import { writeListState } from './writeListState';

/**
 * Tells AniList or MyAnimeList that somebody watched an episode of a show, reading their entry
 * first so progress only rises and a completed show is never set back.
 *
 * @param valence - The host.
 * @param provider - Which service.
 * @param token - Their token there.
 * @param id - The show's id on that service.
 * @param watched - The number, within this entry, of the episode just finished.
 * @param episodes - How many episodes the entry has, where known.
 * @returns Whether the list was changed.
 */
const saveProgress = async (
  valence: ValenceHost,
  provider: Provider,
  token: string,
  id: string,
  watched: number,
  episodes: number | null,
): Promise<boolean> => {
  const current = await readListState(valence, provider, token, id);
  const next = nextListState(current.state, watched, episodes ?? current.episodes);

  if (next === null) {
    return false;
  }

  await writeListState(valence, provider, token, id, next);

  return true;
};

export { saveProgress };
