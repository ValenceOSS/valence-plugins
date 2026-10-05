import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';
import { askListenBrainz } from './askListenBrainz';
import type { ListenBrainzLink } from './Links';
import type { SourcePlaylist } from './SourcePlaylist';

const JSPF_PLAYLIST = 'https://musicbrainz.org/doc/jspf#playlist';

const JSPF_TRACK = 'https://musicbrainz.org/doc/jspf#track';

const MADE_FOR = 25;

const PLAYLIST_ID = /\/playlist\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/u;

const MadeForSchema = z.object({
  playlists: z.array(
    z.object({
      playlist: z.object({
        identifier: z.string(),
        extension: z
          .object({
            [JSPF_PLAYLIST]: z
              .object({
                additional_metadata: z
                  .object({
                    algorithm_metadata: z
                      .object({ source_patch: z.string().optional() })
                      .optional(),
                  })
                  .optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    }),
  ),
});

const PlaylistSchema = z.object({
  playlist: z.object({
    track: z.array(
      z.object({
        title: z.string().optional(),
        creator: z.string().optional(),
        album: z.string().optional(),
        extension: z
          .object({
            [JSPF_TRACK]: z
              .object({
                additional_metadata: z
                  .object({
                    artists: z.array(z.object({ artist_credit_name: z.string() })).optional(),
                    caa_release_mbid: z.string().uuid().nullish(),
                  })
                  .optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    ),
  }),
});

/** The playlists ListenBrainz has made for each person, read once a run. */
type MadeFor = Map<string, z.infer<typeof MadeForSchema>['playlists']>;

/**
 * Reads the newest of a kind of playlist ListenBrainz makes for somebody, such as their Weekly
 * Jams, with its songs.
 *
 * @param valence - The host.
 * @param link - Their ListenBrainz connection.
 * @param patch - Which kind, as ListenBrainz names it, such as `weekly-jams`.
 * @param madeFor - The playlists already read for people this run, added to as it goes.
 * @returns The playlist, or nothing where ListenBrainz has made none of that kind for them.
 */
const readListenBrainzPlaylist = async (
  valence: ValenceHost,
  link: ListenBrainzLink,
  patch: string,
  madeFor: MadeFor,
): Promise<SourcePlaylist | null> => {
  const playlists =
    madeFor.get(link.user) ??
    readJsonAs(
      await askListenBrainz(
        valence,
        `/1/user/${encodeURIComponent(link.user)}/playlists/createdfor?count=${MADE_FOR.toString()}`,
        { token: link.token },
      ),
      MadeForSchema,
      'ListenBrainz',
    ).playlists;

  madeFor.set(link.user, playlists);

  const id = playlists
    .filter(
      ({ playlist }) =>
        playlist.extension?.[JSPF_PLAYLIST]?.additional_metadata?.algorithm_metadata
          ?.source_patch === patch,
    )
    .map(({ playlist }) => PLAYLIST_ID.exec(playlist.identifier)?.[1])
    .find((each) => each !== undefined);

  if (id === undefined) {
    return null;
  }

  const { track } = readJsonAs(
    await askListenBrainz(valence, `/1/playlist/${id}`, { token: link.token }),
    PlaylistSchema,
    'ListenBrainz',
  ).playlist;

  return {
    version: id,
    tracks: track.flatMap((each) => {
      const credits = (each.extension?.[JSPF_TRACK]?.additional_metadata?.artists ?? []).map(
        (artist) => artist.artist_credit_name,
      );
      const artists = [...new Set([each.creator ?? '', ...credits].filter((name) => name !== ''))];

      return each.title === undefined || each.title === '' || artists.length === 0
        ? []
        : [
            {
              title: each.title,
              artists,
              album: each.album ?? null,
              releaseId:
                each.extension?.[JSPF_TRACK]?.additional_metadata?.caa_release_mbid ?? null,
            },
          ];
    }),
  };
};

export type { MadeFor };

export { readListenBrainzPlaylist };
