import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { formBody } from '@Shared/formBody';
import { askAniList } from './askAniList';
import type { ListState } from './ListState';
import type { Provider } from './Provider';

const ANILIST_STATUSES = {
  watching: 'CURRENT',
  completed: 'COMPLETED',
  planning: 'PLANNING',
  paused: 'PAUSED',
  dropped: 'DROPPED',
  repeating: 'REPEATING',
} as const;

const MAL_STATUSES = {
  watching: 'watching',
  completed: 'completed',
  planning: 'plan_to_watch',
  paused: 'on_hold',
  dropped: 'dropped',
  repeating: 'completed',
} as const;

/**
 * Writes a show's entry on somebody's AniList or MyAnimeList list. MyAnimeList keeps a rewatch as a
 * completed show being rewatched.
 *
 * @param valence - The host.
 * @param provider - Which service.
 * @param token - Their token there.
 * @param id - The show's id on that service.
 * @param state - What the entry should say.
 */
const writeListState = async (
  valence: ValenceHost,
  provider: Provider,
  token: string,
  id: string,
  state: ListState,
): Promise<void> => {
  const answer =
    provider === 'anilist'
      ? await askAniList(
          valence,
          token,
          'mutation ($media: Int, $progress: Int, $status: MediaListStatus, $repeat: Int) { SaveMediaListEntry(mediaId: $media, progress: $progress, status: $status, repeat: $repeat) { id } }',
          {
            media: Number(id),
            progress: state.progress,
            status: ANILIST_STATUSES[state.status],
            ...(state.repeat === null ? {} : { repeat: state.repeat }),
          },
        )
      : await valence.http.fetch(
          `https://api.myanimelist.net/v2/anime/${encodeURIComponent(id)}/my_list_status`,
          {
            method: 'PATCH',
            headers: {
              authorization: `Bearer ${token}`,
              'content-type': 'application/x-www-form-urlencoded',
            },
            body: formBody({
              status: MAL_STATUSES[state.status],
              num_watched_episodes: state.progress.toString(),
              is_rewatching: state.status === 'repeating' ? 'true' : 'false',
              ...(state.repeat === null ? {} : { num_times_rewatched: state.repeat.toString() }),
            }),
          },
        );

  if (answer.status < 200 || answer.status >= 300) {
    throw new Error(
      `${provider === 'anilist' ? 'AniList' : 'MyAnimeList'} answered ${answer.status.toString()}`,
    );
  }
};

export { writeListState };
