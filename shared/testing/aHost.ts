import { createHash, createHmac, randomBytes } from 'node:crypto';
import { vi } from 'vitest';
import type {
  AboutArtist,
  Lyrics,
  MediaDetails,
  MediaRef,
  PlaylistContents,
  Reading,
  Stored,
  ValenceHost,
} from '@ValenceSDK/host/ValenceHost';

type Answer = { status: number; text: string };

const HOST_PAGE = 200;

const MOST_DROPPED = 500;

const LIKED_AT = '2026-11-01T09:00:00.000Z';

type HostOptions = {
  settings?: Record<string, string | boolean>;
  answers?: (
    url: string,
    init: { method?: string; headers?: Record<string, string>; body?: string },
  ) => Answer;
  connections?: Record<string, { accessToken: string; account: string | null }>;
  library?: MediaRef[];
  finished?: string[];
  playlists?: (PlaylistContents & { profileId: string })[];
  profiles?: { id: string; name: string }[];
  holds?: Record<string, string[]>;
  details?: Record<string, Partial<Omit<MediaDetails, keyof MediaRef>>>;
  lyrics?: Record<string, Lyrics>;
  about?: Record<string, AboutArtist>;
};

/**
 * A `valence` host held in memory, for testing a plugin without a server: storage and per-person
 * secrets are maps, read back through the same JSON round trip the real host gives them, secrets
 * and keys are held to the real host's limits, the web answers as the test says, what is marked watched and
 * playlists are kept as they are changed, songs are found as Valence finds them, the library is
 * listed by title and holds what the test says, a library read that names nobody is refused as it
 * is in the background, a music read asking for more than the 200 Valence allows at once is refused,
 * songs and artists are liked and songs rated, plays and what is playing are
 * recorded, a job queued is handed an id, hashes and random bytes are real, and every
 * other call is recorded.
 *
 * @param options - The settings, web answers, connected accounts, library and playlists this test
 *   starts with.
 * @returns The host, and the storage and playlists behind it.
 */
const aHost = (options: HostOptions = {}) => {
  const stored = new Map<string, Stored>();
  const secrets = new Map<string, Map<string, string>>();
  const secretsOf = (profileId: string): Map<string, string> =>
    secrets.get(profileId) ?? new Map<string, string>();
  const keyRefusalOf = (key: string): Error | null =>
    key.length < 1 || key.length > 200 ? new Error('The host refused these arguments.') : null;
  const refusalOf = (profileId: string, key: string, value = 'kept'): Error | null =>
    keyRefusalOf(profileId) ??
    keyRefusalOf(key) ??
    (value.length < 1 || value.length > 4096
      ? new Error('The host refused these arguments.')
      : null);
  const copyOf = (value: Stored): Stored => JSON.parse(JSON.stringify(value));
  const library = options.library ?? [];
  const finished = new Set(options.finished ?? []);
  const playlists = new Map(
    (options.playlists ?? []).map((playlist) => [playlist.id, structuredClone(playlist)]),
  );
  let made = 0;
  let entered = 0;
  const playlistOf = (profileId: string, playlistId: string) => {
    const playlist = playlists.get(playlistId);

    return playlist?.profileId === profileId ? playlist : null;
  };
  const unnamed = (reading: Reading | undefined): Promise<never> | null =>
    reading?.profileId === undefined
      ? Promise.reject(new Error('The host refused a library read that names nobody.'))
      : null;
  let queued = 0;
  const liked = new Map<string, string>();
  const stars = new Map<string, number>();
  const played: { profileId: string; trackId: string; playedAt: string | null }[] = [];
  const playing: { profileId: string; trackId: string | null; client: string | null }[] = [];
  const kindOf = (id: string) => library.find((media) => media.id === id)?.kind ?? null;
  const known = (id: string): Promise<never> | null =>
    kindOf(id) === null
      ? Promise.reject(new Error('There is no such thing in their library.'))
      : null;
  const genresOf = (id: string) => options.details?.[id]?.genres ?? [];
  const tracksOf = (id: string): string[] =>
    (options.holds?.[id] ?? []).flatMap((child) =>
      kindOf(child) === 'track' ? [child] : tracksOf(child),
    );

  const host = {
    plugin: { id: 'test', version: '1.0.0' },
    settings: { read: vi.fn(() => Promise.resolve(options.settings ?? {})) },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    storage: {
      get: vi.fn((key: string) => {
        const refusal = keyRefusalOf(key);
        const kept = stored.get(key);

        if (refusal !== null) {
          return Promise.reject(refusal);
        }

        return Promise.resolve(kept === undefined ? null : copyOf(kept));
      }),
      set: vi.fn((key: string, value: Stored) => {
        const refusal = keyRefusalOf(key);

        if (refusal !== null) {
          return Promise.reject(refusal);
        }

        stored.set(key, copyOf(value));

        return Promise.resolve();
      }),
      delete: vi.fn((key: string) => {
        const refusal = keyRefusalOf(key);

        if (refusal !== null) {
          return Promise.reject(refusal);
        }

        stored.delete(key);

        return Promise.resolve();
      }),
      keys: vi.fn((prefix = '') =>
        prefix.length > 200
          ? Promise.reject(new Error('The host refused these arguments.'))
          : Promise.resolve([...stored.keys()].filter((key) => key.startsWith(prefix))),
      ),
    },
    secrets: {
      get: vi.fn((profileId: string, key: string) => {
        const refusal = refusalOf(profileId, key);

        return refusal === null
          ? Promise.resolve(secretsOf(profileId).get(key) ?? null)
          : Promise.reject(refusal);
      }),
      set: vi.fn((profileId: string, key: string, value: string) => {
        const refusal = refusalOf(profileId, key, value);
        const kept = secretsOf(profileId);

        if (refusal !== null) {
          return Promise.reject(refusal);
        }

        if (!kept.has(key) && kept.size >= 32) {
          return Promise.reject(new Error('This plugin already keeps 32 secrets for this person.'));
        }

        secrets.set(profileId, kept.set(key, value));

        return Promise.resolve();
      }),
      delete: vi.fn((profileId: string, key: string) => {
        const refusal = refusalOf(profileId, key);

        if (refusal !== null) {
          return Promise.reject(refusal);
        }

        secretsOf(profileId).delete(key);

        return Promise.resolve();
      }),
      keys: vi.fn((profileId: string) => {
        const refusal = keyRefusalOf(profileId);

        return refusal === null
          ? Promise.resolve([...secretsOf(profileId).keys()])
          : Promise.reject(refusal);
      }),
    },
    http: {
      fetch: vi.fn((url: string, init = {}) =>
        Promise.resolve({
          headers: {},
          ...(options.answers?.(url, init) ?? { status: 404, text: '' }),
        }),
      ),
      fetchBytes: vi.fn<ValenceHost['http']['fetchBytes']>((url, init = {}) => {
        const { status, text } = options.answers?.(url, init) ?? { status: 404, text: '' };

        return Promise.resolve({
          status,
          headers: {},
          base64: Buffer.from(text).toString('base64'),
        });
      }),
    },
    accounts: {
      connection: vi.fn((profileId: string, provider: string) => {
        const found = options.connections?.[`${profileId}:${provider}`];

        return Promise.resolve(found === undefined ? null : { ...found, expiresAt: null });
      }),
      disconnect: vi.fn(() => Promise.resolve()),
    },
    profiles: {
      list: vi.fn(() => Promise.resolve(options.profiles ?? [{ id: 'p1', name: 'Marques' }])),
    },
    library: {
      get: vi.fn<ValenceHost['library']['get']>(
        (mediaId, reading) =>
          unnamed(reading) ??
          Promise.resolve(library.find((media) => media.id === mediaId) ?? null),
      ),
      search: vi.fn<ValenceHost['library']['search']>(
        (query, kinds, reading) =>
          unnamed(reading) ??
          Promise.resolve(
            library.filter(
              (media) =>
                media.title.toLowerCase().includes(query.toLowerCase()) &&
                (kinds === undefined || kinds.includes(media.kind)),
            ),
          ),
      ),
      findByExternalId: vi.fn<ValenceHost['library']['findByExternalId']>(
        (source, id, reading) =>
          unnamed(reading) ??
          Promise.resolve(library.filter((media) => media.externalIds[source] === id)),
      ),
      episodes: vi.fn<ValenceHost['library']['episodes']>(
        (seriesId, reading) =>
          unnamed(reading) ??
          Promise.resolve(
            library.filter((media) => media.kind === 'episode' && media.seriesId === seriesId),
          ),
      ),
      list: vi.fn<ValenceHost['library']['list']>(({ kind, after, limit = 200 }, reading) => {
        const ofKind = library
          .filter((media) => media.kind === kind)
          .toSorted((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
        const start = after === undefined ? 0 : ofKind.findIndex((media) => media.id === after) + 1;
        const items = ofKind.slice(start, start + limit);
        const last = items.at(-1);

        return (
          unnamed(reading) ??
          Promise.resolve({
            items,
            next: items.length < limit || last === undefined ? null : last.id,
          })
        );
      }),
      children: vi.fn<ValenceHost['library']['children']>(
        (id, reading) =>
          unnamed(reading) ??
          Promise.resolve(
            (options.holds?.[id] ?? []).flatMap(
              (childId) => library.find((media) => media.id === childId) ?? [],
            ),
          ),
      ),
      details: vi.fn<ValenceHost['library']['details']>(
        (ids, reading) =>
          unnamed(reading) ??
          Promise.resolve(
            [...new Set(ids)].flatMap((id) => {
              const media = library.find((each) => each.id === id);

              return media === undefined
                ? []
                : [
                    {
                      ...media,
                      overview: null,
                      genres: [],
                      communityRating: null,
                      certificationAge: null,
                      addedAt: null,
                      albumId: null,
                      artistId: null,
                      discNumber: null,
                      trackNumber: null,
                      file: null,
                      ...options.details?.[id],
                    },
                  ];
            }),
          ),
      ),
    },
    viewing: {
      state: vi.fn<ValenceHost['viewing']['state']>((_profileId, mediaIds) =>
        Promise.resolve(
          [...new Set(mediaIds)].map((mediaId) => ({
            mediaId,
            isFavourite: liked.has(mediaId),
            favouritedAt: liked.get(mediaId) ?? null,
            stars: stars.get(mediaId) ?? null,
            plays: finished.has(mediaId) ? 1 : 0,
            lastPlayedAt: null,
          })),
        ),
      ),
      progress: vi.fn(() =>
        Promise.resolve(
          [...finished].map((mediaId) => ({
            mediaId,
            positionSeconds: 1400,
            durationSeconds: 1400,
            isFinished: true,
            updatedAt: '2026-09-28T12:00:00.000Z',
          })),
        ),
      ),
      markWatched: vi.fn((_profileId: string, mediaId: string, _watchedAt?: string) => {
        finished.add(mediaId);

        return Promise.resolve();
      }),
      markUnwatched: vi.fn((_profileId: string, mediaId: string) => {
        finished.delete(mediaId);

        return Promise.resolve();
      }),
      favourite: vi.fn<ValenceHost['viewing']['favourite']>((_profileId, mediaId, isFavourite) => {
        const kind = kindOf(mediaId);

        if (kind === null) {
          return Promise.reject(new Error('There is no such thing in their library.'));
        }

        if (kind !== 'track' && kind !== 'artist') {
          return Promise.resolve({ isKept: false });
        }

        if (isFavourite) {
          liked.set(mediaId, LIKED_AT);
        } else {
          liked.delete(mediaId);
        }

        return Promise.resolve({ isKept: true });
      }),
      rate: vi.fn<ValenceHost['viewing']['rate']>((_profileId, mediaId, given) => {
        const refusal = known(mediaId);

        if (refusal !== null) {
          return refusal;
        }

        if (kindOf(mediaId) !== 'track') {
          return Promise.resolve({ isKept: false });
        }

        if (given === null) {
          stars.delete(mediaId);
        } else {
          stars.set(mediaId, given);
        }

        return Promise.resolve({ isKept: true });
      }),
      favourites: vi.fn<ValenceHost['viewing']['favourites']>((_profileId, kind) =>
        Promise.resolve([...liked.keys()].filter((id) => kindOf(id) === kind)),
      ),
    },
    requests: {
      searchCatalogue: vi.fn<ValenceHost['requests']['searchCatalogue']>(() => Promise.resolve([])),
      create: vi.fn<ValenceHost['requests']['create']>(() => Promise.resolve({ status: 'made' })),
      missingAlbums: vi.fn<ValenceHost['requests']['missingAlbums']>(() =>
        Promise.resolve({ isMatching: false, albums: [] }),
      ),
    },
    playlists: {
      list: vi.fn<ValenceHost['playlists']['list']>((profileId) =>
        Promise.resolve(
          [...playlists.values()]
            .filter((playlist) => playlist.profileId === profileId)
            .map(({ id, name }) => ({ id, name })),
        ),
      ),
      create: vi.fn<ValenceHost['playlists']['create']>((profileId, { name }) => {
        made += 1;

        const id = `playlist-${made.toString()}`;

        playlists.set(id, { id, name, profileId, entries: [] });

        return Promise.resolve({ id });
      }),
      add: vi.fn<ValenceHost['playlists']['add']>((profileId, playlistId, items) => {
        for (const item of items) {
          entered += 1;
          playlistOf(profileId, playlistId)?.entries.push({
            entryId: `entry-${entered.toString()}`,
            mediaId: typeof item === 'string' ? item : null,
            missing:
              typeof item === 'string'
                ? null
                : {
                    title: item.title,
                    artist: item.artist,
                    album: item.album ?? null,
                    releaseId: item.releaseId ?? null,
                  },
          });
        }

        return Promise.resolve();
      }),
      read: vi.fn<ValenceHost['playlists']['read']>((profileId, playlistId) => {
        const playlist = playlistOf(profileId, playlistId);

        return Promise.resolve(
          playlist === null
            ? null
            : { id: playlist.id, name: playlist.name, entries: [...playlist.entries] },
        );
      }),
      drop: vi.fn<ValenceHost['playlists']['drop']>((profileId, playlistId, entryId) => {
        const playlist = playlistOf(profileId, playlistId);

        if (playlist !== null) {
          playlist.entries = playlist.entries.filter((entry) => entry.entryId !== entryId);
        }

        return Promise.resolve();
      }),
      dropMany: vi.fn<ValenceHost['playlists']['dropMany']>((profileId, playlistId, entryIds) => {
        if (entryIds.length > MOST_DROPPED) {
          return Promise.reject(
            new Error('playlists.dropMany was asked with something Valence could not read.'),
          );
        }

        const playlist = playlistOf(profileId, playlistId);

        if (playlist !== null) {
          playlist.entries = playlist.entries.filter((entry) => !entryIds.includes(entry.entryId));
        }

        return Promise.resolve();
      }),
      rename: vi.fn<ValenceHost['playlists']['rename']>((profileId, playlistId, { name }) => {
        const playlist = playlistOf(profileId, playlistId);

        if (playlist === null) {
          return Promise.reject(new Error('There is no such playlist of theirs.'));
        }

        playlist.name = name;

        return Promise.resolve();
      }),
      remove: vi.fn<ValenceHost['playlists']['remove']>((profileId, playlistId) => {
        if (playlistOf(profileId, playlistId) === null) {
          return Promise.reject(new Error('There is no such playlist of theirs.'));
        }

        playlists.delete(playlistId);

        return Promise.resolve();
      }),
    },
    music: {
      findTrack: vi.fn<ValenceHost['music']['findTrack']>(({ title, artist, album }, reading) => {
        const refusal = unnamed(reading);

        if (refusal !== null) {
          return refusal;
        }

        const same = (left: string | null, right: string) =>
          left !== null && left.toLowerCase() === right.toLowerCase();
        const found = library.filter(
          (media) =>
            media.kind === 'track' && same(media.title, title) && same(media.artist, artist),
        );

        return Promise.resolve(
          found.find((media) => album !== undefined && same(media.album, album)) ??
            found[0] ??
            null,
        );
      }),
      albums: vi.fn<ValenceHost['music']['albums']>(({ genre, offset = 0, limit = 200 }) =>
        limit > HOST_PAGE
          ? Promise.reject(
              new Error('music.albums was asked with something Valence could not read.'),
            )
          : Promise.resolve(
              library
                .filter(
                  (media) =>
                    media.kind === 'album' &&
                    (genre === undefined || genresOf(media.id).includes(genre)),
                )
                .slice(offset, offset + limit),
            ),
      ),
      genres: vi.fn<ValenceHost['music']['genres']>(() => {
        const albums = library.filter((media) => media.kind === 'album');
        const names = [...new Set(albums.flatMap((album) => genresOf(album.id)))];

        return Promise.resolve(
          names.map((name) => {
            const shelved = albums.filter((album) => genresOf(album.id).includes(name));

            return {
              name,
              albums: shelved.length,
              songs: shelved.flatMap((album) => tracksOf(album.id)).length,
            };
          }),
        );
      }),
      inGenre: vi.fn<ValenceHost['music']['inGenre']>((genre, page) => {
        const offset = page?.offset ?? 0;

        if ((page?.limit ?? 0) > HOST_PAGE) {
          return Promise.reject(
            new Error('music.inGenre was asked with something Valence could not read.'),
          );
        }
        const ids = library
          .filter((media) => media.kind === 'album' && genresOf(media.id).includes(genre))
          .flatMap((album) => tracksOf(album.id));

        return Promise.resolve(
          ids
            .slice(offset, offset + (page?.limit ?? 200))
            .flatMap((id) => library.filter((media) => media.id === id)),
        );
      }),
      lyrics: vi.fn<ValenceHost['music']['lyrics']>((trackId) =>
        Promise.resolve(options.lyrics?.[trackId] ?? null),
      ),
      similar: vi.fn<ValenceHost['music']['similar']>((seedIds, limit = 50) =>
        limit > HOST_PAGE
          ? Promise.reject(
              new Error('music.similar was asked with something Valence could not read.'),
            )
          : Promise.resolve(
              library
                .filter((media) => media.kind === 'track' && !seedIds.includes(media.id))
                .slice(0, limit),
            ),
      ),
      topSongs: vi.fn<ValenceHost['music']['topSongs']>((artistId) =>
        Promise.resolve(
          tracksOf(artistId).flatMap((id) => library.filter((media) => media.id === id)),
        ),
      ),
      aboutArtist: vi.fn<ValenceHost['music']['aboutArtist']>((artistId) =>
        Promise.resolve(options.about?.[artistId] ?? null),
      ),
      recordPlay: vi.fn<ValenceHost['music']['recordPlay']>((profileId, trackId, playedAt) => {
        if (kindOf(trackId) !== 'track') {
          return Promise.reject(new Error('Only a song can be played.'));
        }

        played.push({ profileId, trackId, playedAt: playedAt ?? null });

        return Promise.resolve();
      }),
      nowPlaying: vi.fn<ValenceHost['music']['nowPlaying']>((profileId, now) => {
        if (now !== null && kindOf(now.trackId) !== 'track') {
          return Promise.reject(new Error('There is no such song.'));
        }

        playing.push({
          profileId,
          trackId: now?.trackId ?? null,
          client: now?.client ?? null,
        });

        return Promise.resolve();
      }),
    },
    notifications: { send: vi.fn<ValenceHost['notifications']['send']>(() => Promise.resolve()) },
    events: { emit: vi.fn<ValenceHost['events']['emit']>(() => Promise.resolve()) },
    jobs: {
      enqueue: vi.fn<ValenceHost['jobs']['enqueue']>(() => {
        queued += 1;

        return Promise.resolve({ id: `job-${String(queued)}` });
      }),
      progress: vi.fn<ValenceHost['jobs']['progress']>(() => Promise.resolve()),
    },
    crypto: {
      hmac: vi.fn<ValenceHost['crypto']['hmac']>((algorithm, key, message, encoding = 'hex') =>
        Promise.resolve(createHmac(algorithm, key).update(message).digest(encoding)),
      ),
      equal: vi.fn<ValenceHost['crypto']['equal']>((left, right) =>
        Promise.resolve(left === right),
      ),
      digest: vi.fn<ValenceHost['crypto']['digest']>(
        (algorithm, message, encoding = 'hex', messageEncoding = 'utf8') =>
          Promise.resolve(
            createHash(algorithm).update(Buffer.from(message, messageEncoding)).digest(encoding),
          ),
      ),
      random: vi.fn<ValenceHost['crypto']['random']>((bytes, encoding = 'hex') =>
        Promise.resolve(randomBytes(bytes).toString(encoding)),
      ),
      verify: vi.fn<ValenceHost['crypto']['verify']>(() => Promise.resolve(false)),
    },
  } satisfies ValenceHost;

  return { host, stored, secrets, playlists, liked, stars, played, playing };
};

export { aHost };
