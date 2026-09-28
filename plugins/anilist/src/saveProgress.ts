import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { formBody } from '@Shared/formBody';
import type { Provider } from './Provider';

/**
 * Tells AniList or MyAnimeList how many episodes of a show somebody has watched, marking it
 * completed when that is every episode.
 *
 * @param valence - The host.
 * @param provider - Which service.
 * @param token - The viewer's token there.
 * @param id - The show's id on that service.
 * @param progress - Episodes watched.
 * @param episodes - How many episodes the show has, where known.
 */
const saveProgress = async (
  valence: ValenceHost,
  provider: Provider,
  token: string,
  id: string,
  progress: number,
  episodes: number | null,
): Promise<void> => {
  const isDone = episodes !== null && progress >= episodes;
  const answer =
    provider === 'anilist'
      ? await valence.http.fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            query:
              'mutation ($media: Int, $progress: Int, $status: MediaListStatus) { SaveMediaListEntry(mediaId: $media, progress: $progress, status: $status) { id } }',
            variables: { media: Number(id), progress, status: isDone ? 'COMPLETED' : 'CURRENT' },
          }),
        })
      : await valence.http.fetch(
          `https://api.myanimelist.net/v2/anime/${encodeURIComponent(id)}/my_list_status`,
          {
            method: 'PATCH',
            headers: {
              authorization: `Bearer ${token}`,
              'content-type': 'application/x-www-form-urlencoded',
            },
            body: formBody({
              num_watched_episodes: progress.toString(),
              status: isDone ? 'completed' : 'watching',
            }),
          },
        );

  if (answer.status < 200 || answer.status >= 300) {
    throw new Error(
      `${provider === 'anilist' ? 'AniList' : 'MyAnimeList'} answered ${answer.status.toString()}`,
    );
  }
};

export { saveProgress };
