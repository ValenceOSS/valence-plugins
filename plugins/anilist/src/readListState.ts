import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';
import { askAniList } from './askAniList';
import type { ListState } from './ListState';
import type { Provider } from './Provider';

const ANILIST_STATUSES = {
  CURRENT: 'watching',
  COMPLETED: 'completed',
  PLANNING: 'planning',
  PAUSED: 'paused',
  DROPPED: 'dropped',
  REPEATING: 'repeating',
} as const;

const MAL_STATUSES = {
  watching: 'watching',
  completed: 'completed',
  plan_to_watch: 'planning',
  on_hold: 'paused',
  dropped: 'dropped',
} as const;

const AniListSchema = z.object({
  data: z.object({
    Media: z.object({
      episodes: z.number().nullable(),
      mediaListEntry: z
        .object({
          status: z.enum(['CURRENT', 'COMPLETED', 'PLANNING', 'PAUSED', 'DROPPED', 'REPEATING']),
          progress: z.number().nullable(),
          repeat: z.number().nullable(),
        })
        .nullable(),
    }),
  }),
});

const MalSchema = z.object({
  num_episodes: z.number().optional(),
  my_list_status: z
    .object({
      status: z.enum(['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped']),
      num_episodes_watched: z.number(),
      is_rewatching: z.boolean().optional(),
      num_times_rewatched: z.number().optional(),
    })
    .optional(),
});

/**
 * What somebody's list says about a show now, and how many episodes the service counts for it.
 *
 * @param valence - The host.
 * @param provider - Which service.
 * @param token - Their token there.
 * @param id - The show's id on that service.
 * @returns The entry, or nothing where the show isn't on their list, and the episode count.
 */
const readListState = async (
  valence: ValenceHost,
  provider: Provider,
  token: string,
  id: string,
): Promise<{ state: ListState | null; episodes: number | null }> => {
  if (provider === 'anilist') {
    const media = readJsonAs(
      await askAniList(
        valence,
        token,
        'query ($media: Int) { Media(id: $media) { episodes mediaListEntry { status progress repeat } } }',
        { media: Number(id) },
      ),
      AniListSchema,
      'AniList',
    ).data.Media;
    const entry = media.mediaListEntry;

    return {
      state:
        entry === null
          ? null
          : {
              status: ANILIST_STATUSES[entry.status],
              progress: entry.progress ?? 0,
              repeat: entry.repeat,
            },
      episodes: media.episodes,
    };
  }

  const anime = readJsonAs(
    await valence.http.fetch(
      `https://api.myanimelist.net/v2/anime/${encodeURIComponent(id)}?fields=num_episodes,my_list_status{status,num_episodes_watched,is_rewatching,num_times_rewatched}`,
      { headers: { authorization: `Bearer ${token}` } },
    ),
    MalSchema,
    'MyAnimeList',
  );
  const entry = anime.my_list_status;

  return {
    state:
      entry === undefined
        ? null
        : {
            status: entry.is_rewatching === true ? 'repeating' : MAL_STATUSES[entry.status],
            progress: entry.num_episodes_watched,
            repeat: entry.num_times_rewatched ?? null,
          },
    episodes:
      anime.num_episodes === undefined || anime.num_episodes === 0 ? null : anime.num_episodes,
  };
};

export { readListState };
