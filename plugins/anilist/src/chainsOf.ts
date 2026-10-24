import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';
import type { AnimeEntry } from './AnimeEntry';
import { askAniList } from './askAniList';
import { chainKeyFor } from './chainKeyFor';
import type { Season } from './Season';
import { SeasonSchema } from './Season';

const SEASON_FORMATS = ['TV', 'TV_SHORT', 'ONA'] as const;

const MOST_STEPS_BACK = 12;

const FIELDS =
  'id idMal episodes format seasonYear title { romaji english } synonyms relations { edges { relationType node { id format } } }';

const MediaSchema = z.object({
  id: z.number(),
  idMal: z.number().nullable(),
  episodes: z.number().nullable(),
  format: z.string().nullable(),
  seasonYear: z.number().nullable(),
  title: z.object({ romaji: z.string().nullable(), english: z.string().nullable() }),
  synonyms: z.array(z.string()).nullable(),
  relations: z.object({
    edges: z.array(
      z.object({
        relationType: z.string().nullable(),
        node: z.object({ id: z.number(), format: z.string().nullable() }).nullable(),
      }),
    ),
  }),
});

type Media = z.infer<typeof MediaSchema>;

const PageSchema = z.object({
  data: z.object({ Page: z.object({ media: z.array(MediaSchema.nullable()) }) }),
});

const ChainSchema = z.array(SeasonSchema);

/**
 * Asks AniList about several shows in one call, by AniList id or by MyAnimeList id. A show AniList
 * doesn't know is simply left out of its answer.
 *
 * @param valence - The host.
 * @param ids - The ids to ask about.
 * @param by - Which kind of id they are.
 * @returns Each show AniList knows.
 */
const askAbout = async (
  valence: ValenceHost,
  ids: readonly string[],
  by: 'id_in' | 'idMal_in',
): Promise<Media[]> =>
  ids.length === 0
    ? []
    : readJsonAs(
        await askAniList(
          valence,
          null,
          `{ Page(perPage: 50) { media(${by}: [${ids.map((id) => Number(id).toString()).join(', ')}], type: ANIME) { ${FIELDS} } } }`,
          {},
        ),
        PageSchema,
        'AniList',
      ).data.Page.media.flatMap((media) => (media === null ? [] : [media]));

/**
 * The season a show follows, where it follows one that is itself a season of a series rather than
 * a film or a special: a full television season first, then a short one, then one made for the web.
 *
 * @param media - The show.
 * @returns The prequel's AniList id, or nothing.
 */
const prequelOf = (media: Media): number | null => {
  for (const format of SEASON_FORMATS) {
    const found = media.relations.edges.find(
      (edge) => edge.relationType === 'PREQUEL' && edge.node?.format === format,
    );

    if (found?.node !== undefined && found.node !== null) {
      return found.node.id;
    }
  }

  return null;
};

/**
 * A show as one of the seasons in a chain.
 *
 * @param media - The show, as AniList knows it.
 * @returns The season.
 */
const seasonOf = (media: Media): Season => ({
  anilistId: media.id.toString(),
  malId: media.idMal === null ? null : media.idMal.toString(),
  episodes: media.episodes,
  titles: [media.title.english, media.title.romaji, ...(media.synonyms ?? [])].filter(
    (title): title is string => title !== null && title !== '',
  ),
  year: media.seasonYear,
});

/**
 * For each list entry, the seasons it follows, nearest first, since a list keeps a season, or half
 * of one, per entry while a library may keep a whole show as one programme: the entry itself, then
 * its prequel, back to the first season. AniList is asked about a few shows at a time, and a chain
 * whose earlier seasons all have a known length is kept, so each is worked out once.
 *
 * @param valence - The host.
 * @param entries - The list entries.
 * @returns Each entry's chain, by `provider:id`, leaving out any AniList doesn't know.
 */
const chainsOf = async (
  valence: ValenceHost,
  entries: readonly AnimeEntry[],
): Promise<Map<string, Season[]>> => {
  const chains = new Map<string, Season[]>();
  const keyOf = (entry: AnimeEntry) => `${entry.provider}:${entry.id}`;
  const cacheKeyOf = (entry: AnimeEntry) =>
    entry.anilistId === null
      ? chainKeyFor('mal', entry.malId ?? entry.id)
      : chainKeyFor('anilist', entry.anilistId);
  const unknown: AnimeEntry[] = [];

  for (const entry of entries) {
    const kept = ChainSchema.safeParse(await valence.storage.get(cacheKeyOf(entry)));

    if (kept.success && kept.data.length > 0) {
      chains.set(keyOf(entry), kept.data);
    } else {
      unknown.push(entry);
    }
  }

  const known = new Map<string, Media>();
  const byMal = new Map<string, Media>();

  for (const media of await askAbout(
    valence,
    unknown.flatMap((entry) =>
      entry.anilistId === null && entry.malId !== null ? [entry.malId] : [],
    ),
    'idMal_in',
  )) {
    known.set(media.id.toString(), media);

    if (media.idMal !== null) {
      byMal.set(media.idMal.toString(), media);
    }
  }

  const startOf = (entry: AnimeEntry): string | null =>
    entry.anilistId ??
    (entry.malId === null ? null : (byMal.get(entry.malId)?.id.toString() ?? null));
  const asked = new Set<string>();
  const stillWanted = (): string[] =>
    [
      ...new Set([
        ...unknown.flatMap((entry) => {
          const start = startOf(entry);

          return start === null ? [] : [start];
        }),
        ...[...known.values()].flatMap((media) => {
          const prequel = prequelOf(media);

          return prequel === null ? [] : [prequel.toString()];
        }),
      ]),
    ].filter((id) => !known.has(id) && !asked.has(id));

  for (
    let step = 0, wanted = stillWanted();
    wanted.length > 0 && step < MOST_STEPS_BACK;
    step += 1, wanted = stillWanted()
  ) {
    for (const id of wanted) {
      asked.add(id);
    }

    for (const media of await askAbout(valence, wanted, 'id_in')) {
      known.set(media.id.toString(), media);
    }
  }

  for (const entry of unknown) {
    const start = startOf(entry);
    const chain: Season[] = [];
    let isWhole = true;

    for (
      let media = start === null ? undefined : known.get(start), step = 0;
      media !== undefined && step < MOST_STEPS_BACK;
      step += 1
    ) {
      chain.push(seasonOf(media));

      const prequel = prequelOf(media);

      if (prequel === null) {
        break;
      }

      media = known.get(prequel.toString());
      isWhole &&= media !== undefined;
    }

    if (chain.length >= MOST_STEPS_BACK) {
      isWhole = false;
    }

    if (chain.length > 0) {
      chains.set(keyOf(entry), chain);

      if (isWhole && chain.slice(1).every((season) => season.episodes !== null)) {
        await valence.storage.set(cacheKeyOf(entry), chain);
      }
    }
  }

  return chains;
};

export { chainsOf };
