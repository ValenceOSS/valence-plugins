import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';
import type { AnimeEntry } from './AnimeEntry';

const GRAPHQL = 'https://graphql.anilist.co';

const STATUSES = {
  CURRENT: 'watching',
  COMPLETED: 'completed',
  PLANNING: 'planning',
  PAUSED: 'paused',
  DROPPED: 'dropped',
  REPEATING: 'repeating',
} as const;

const ViewerSchema = z.object({ data: z.object({ Viewer: z.object({ id: z.number() }) }) });

const ListSchema = z.object({
  data: z.object({
    MediaListCollection: z.object({
      lists: z.array(
        z.object({
          entries: z.array(
            z.object({
              status: z.enum([
                'CURRENT',
                'COMPLETED',
                'PLANNING',
                'PAUSED',
                'DROPPED',
                'REPEATING',
              ]),
              progress: z.number().nullable(),
              media: z.object({
                id: z.number(),
                idMal: z.number().nullable(),
                episodes: z.number().nullable(),
                seasonYear: z.number().nullable(),
                title: z.object({
                  romaji: z.string().nullable(),
                  english: z.string().nullable(),
                  native: z.string().nullable(),
                }),
                synonyms: z.array(z.string()).nullable(),
              }),
            }),
          ),
        }),
      ),
    }),
  }),
});

/**
 * Asks AniList a GraphQL question as the signed-in viewer.
 *
 * @param valence - The host.
 * @param token - The viewer's AniList token.
 * @param query - The query.
 * @param variables - Its variables.
 * @returns The answer, as `valence.http.fetch` gives it.
 */
const askAniList = (
  valence: ValenceHost,
  token: string,
  query: string,
  variables: Record<string, number>,
) =>
  valence.http.fetch(GRAPHQL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

/**
 * Reads everything on somebody's AniList anime list.
 *
 * @param valence - The host.
 * @param token - Their AniList token.
 * @returns Each entry, with the ids and titles that find it in a library.
 */
const readAniListEntries = async (valence: ValenceHost, token: string): Promise<AnimeEntry[]> => {
  const viewer = readJsonAs(
    await askAniList(valence, token, '{ Viewer { id } }', {}),
    ViewerSchema,
    'AniList',
  );
  const list = readJsonAs(
    await askAniList(
      valence,
      token,
      'query ($user: Int) { MediaListCollection(userId: $user, type: ANIME) { lists { entries { status progress media { id idMal episodes seasonYear title { romaji english native } synonyms } } } } }',
      { user: viewer.data.Viewer.id },
    ),
    ListSchema,
    'AniList',
  );

  return list.data.MediaListCollection.lists.flatMap((each) =>
    each.entries.map((entry) => ({
      provider: 'anilist' as const,
      id: entry.media.id.toString(),
      anilistId: entry.media.id.toString(),
      malId: entry.media.idMal === null ? null : entry.media.idMal.toString(),
      titles: [
        entry.media.title.english,
        entry.media.title.romaji,
        ...(entry.media.synonyms ?? []),
      ].filter((title): title is string => title !== null && title !== ''),
      year: entry.media.seasonYear,
      progress: entry.progress ?? 0,
      episodes: entry.media.episodes,
      status: STATUSES[entry.status],
    })),
  );
};

export { readAniListEntries };
