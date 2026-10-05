import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { md5 } from '@Shared/md5';
import type { LastfmKeys } from './LastfmKeys';
import type { LastfmLink } from './Links';
import { readLastfmAs } from './readLastfmAs';
import type { SourcePlaylist } from './SourcePlaylist';

const PAGE_SIZE = 200;

const MOST_PAGES = 10;

const TrackSchema = z.object({ name: z.string(), artist: z.object({ name: z.string() }) });

/** A page of loved songs; Last.fm sends a lone song as an object rather than a list of one. */
const PageSchema = z.object({
  lovedtracks: z.object({
    track: z.union([z.array(TrackSchema), TrackSchema.transform((track) => [track])]),
    '@attr': z.object({ totalPages: z.string() }).optional(),
  }),
});

/**
 * Reads the songs somebody has loved on Last.fm, oldest first, so a song loved later joins the
 * end of the playlist rather than moving every other.
 *
 * @param valence - The host.
 * @param keys - The plugin's API key and shared secret.
 * @param link - Their Last.fm connection.
 * @returns The loved songs, with a digest of them that changes when they do.
 */
const readLovedTracks = async (
  valence: ValenceHost,
  keys: LastfmKeys,
  link: LastfmLink,
): Promise<SourcePlaylist> => {
  const tracks: z.infer<typeof TrackSchema>[] = [];
  let pages = 1;

  for (let page = 1; page <= Math.min(pages, MOST_PAGES); page += 1) {
    const read = await readLastfmAs(
      valence,
      keys,
      {
        method: 'user.getLovedTracks',
        params: { user: link.user, limit: PAGE_SIZE.toString(), page: page.toString() },
        isSigned: false,
      },
      PageSchema,
    );

    tracks.push(...read.lovedtracks.track);
    pages = Number(read.lovedtracks['@attr']?.totalPages ?? '1');
  }

  const oldestFirst = tracks.reverse().map((track) => ({
    title: track.name,
    artists: [track.artist.name],
    album: null,
    releaseId: null,
  }));

  return {
    version: md5(
      oldestFirst.map((track) => `${track.title}\n${track.artists[0] ?? ''}`).join('\n'),
    ),
    tracks: oldestFirst,
  };
};

export { readLovedTracks };
