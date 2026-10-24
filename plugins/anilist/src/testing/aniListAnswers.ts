import { z } from 'zod';

type Season = {
  id: number;
  idMal: number | null;
  episodes: number | null;
  format: string;
  prequel?: number;
};

type ListEntryState = { status: string; progress: number; repeat: number };

/**
 * AniList answering as a viewer with a list, for tests: the list itself, the made-up show's two
 * seasons (the second following the first) for working out where an entry sits, the viewer's
 * entry for a show, and saving one.
 *
 * @param entries - The entries on the list, as AniList sends them.
 * @param options - The seasons AniList knows, and what the viewer's entries say now, by show.
 * @returns A web that answers AniList's questions.
 */
const aniListAnswers =
  (
    entries: object[],
    options: { seasons?: Season[]; states?: Record<number, ListEntryState | null> } = {},
  ) =>
  (url: string, init: { body?: string }): { status: number; text: string } => {
    const seasons = options.seasons ?? [
      { id: 1001, idMal: 2001, episodes: 12, format: 'TV' },
      { id: 1002, idMal: 2002, episodes: 12, format: 'TV', prequel: 1001 },
    ];
    const body = init.body ?? '';

    if (url !== 'https://graphql.anilist.co') {
      return { status: 404, text: '' };
    }

    if (body.includes('Viewer')) {
      return { status: 200, text: JSON.stringify({ data: { Viewer: { id: 7 } } }) };
    }

    if (body.includes('SaveMediaListEntry')) {
      return { status: 200, text: JSON.stringify({ data: { SaveMediaListEntry: { id: 1 } } }) };
    }

    if (body.includes('mediaListEntry')) {
      const { variables } = z
        .object({ variables: z.object({ media: z.number() }) })
        .parse(JSON.parse(body));
      const season = seasons.find((each) => each.id === variables.media);

      return {
        status: 200,
        text: JSON.stringify({
          data: {
            Media: {
              episodes: season?.episodes ?? null,
              mediaListEntry: options.states?.[variables.media] ?? null,
            },
          },
        }),
      };
    }

    const asked = /media\((id_in|idMal_in): \[([\d, ]*)\]/u.exec(body);

    if (asked !== null) {
      const ids = (asked[2] ?? '').split(',').map((id) => Number(id.trim()));
      const found = seasons.filter((season) =>
        ids.includes(asked[1] === 'id_in' ? season.id : (season.idMal ?? -1)),
      );

      return {
        status: 200,
        text: JSON.stringify({
          data: {
            Page: {
              media: found.map((season) => ({
                id: season.id,
                idMal: season.idMal,
                episodes: season.episodes,
                format: season.format,
                seasonYear: 2023,
                title: {
                  romaji: 'Rei no Bouken',
                  english:
                    season.id === 1001 ? 'Example Quest' : `Example Quest ${season.id.toString()}`,
                },
                synonyms: [],
                relations: {
                  edges:
                    season.prequel === undefined
                      ? []
                      : [
                          {
                            relationType: 'PREQUEL',
                            node: {
                              id: season.prequel,
                              format:
                                seasons.find((each) => each.id === season.prequel)?.format ?? 'TV',
                            },
                          },
                        ],
                },
              })),
            },
          },
        }),
      };
    }

    return {
      status: 200,
      text: JSON.stringify({ data: { MediaListCollection: { lists: [{ entries }] } } }),
    };
  };

export { aniListAnswers };
