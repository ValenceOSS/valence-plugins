import { createHmac } from 'node:crypto';
import { vi } from 'vitest';
import type { MediaRef, PlaylistContents, Stored, ValenceHost } from '@ValenceSDK/host/ValenceHost';

type Answer = { status: number; text: string };

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
};

/**
 * A `valence` host held in memory, for testing a plugin without a server: storage is a map, the
 * web answers as the test says, what is marked watched and playlists are kept as they are changed,
 * songs are found as Valence finds them, and every other call is recorded.
 *
 * @param options - The settings, web answers, connected accounts, library and playlists this test
 *   starts with.
 * @returns The host, and the storage and playlists behind it.
 */
const aHost = (options: HostOptions = {}) => {
  const stored = new Map<string, Stored>();
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
  const host = {
    plugin: { id: 'test', version: '1.0.0' },
    settings: { read: vi.fn(() => Promise.resolve(options.settings ?? {})) },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    storage: {
      get: vi.fn((key: string) => Promise.resolve(stored.get(key) ?? null)),
      set: vi.fn((key: string, value: Stored) => {
        stored.set(key, value);

        return Promise.resolve();
      }),
      delete: vi.fn((key: string) => {
        stored.delete(key);

        return Promise.resolve();
      }),
      keys: vi.fn((prefix = '') =>
        Promise.resolve([...stored.keys()].filter((key) => key.startsWith(prefix))),
      ),
    },
    http: {
      fetch: vi.fn((url: string, init = {}) =>
        Promise.resolve({
          headers: {},
          ...(options.answers?.(url, init) ?? { status: 404, text: '' }),
        }),
      ),
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
      get: vi.fn((mediaId: string) =>
        Promise.resolve(library.find((media) => media.id === mediaId) ?? null),
      ),
      search: vi.fn((query: string, kinds?: MediaRef['kind'][]) =>
        Promise.resolve(
          library.filter(
            (media) =>
              media.title.toLowerCase().includes(query.toLowerCase()) &&
              (kinds === undefined || kinds.includes(media.kind)),
          ),
        ),
      ),
      findByExternalId: vi.fn((source: keyof MediaRef['externalIds'], id: string) =>
        Promise.resolve(library.filter((media) => media.externalIds[source] === id)),
      ),
      episodes: vi.fn((seriesId: string) =>
        Promise.resolve(
          library.filter((media) => media.kind === 'episode' && media.seriesId === seriesId),
        ),
      ),
    },
    viewing: {
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
    },
    music: {
      findTrack: vi.fn<ValenceHost['music']['findTrack']>(({ title, artist, album }) => {
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
    },
    notifications: { send: vi.fn(() => Promise.resolve()) },
    events: { emit: vi.fn<ValenceHost['events']['emit']>(() => Promise.resolve()) },
    crypto: {
      hmac: vi.fn<ValenceHost['crypto']['hmac']>((algorithm, key, message, encoding = 'hex') =>
        Promise.resolve(createHmac(algorithm, key).update(message).digest(encoding)),
      ),
      equal: vi.fn<ValenceHost['crypto']['equal']>((left, right) =>
        Promise.resolve(left === right),
      ),
    },
  } satisfies ValenceHost;

  return { host, stored, playlists };
};

export { aHost };
