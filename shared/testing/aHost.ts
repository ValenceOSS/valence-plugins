import { createHmac } from 'node:crypto';
import { vi } from 'vitest';
import type {
  MediaRef,
  PlaylistContents,
  Reading,
  Stored,
  ValenceHost,
} from '@ValenceSDK/host/ValenceHost';

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
 * A `valence` host held in memory, for testing a plugin without a server: storage and per-person
 * secrets are maps, read back through the same JSON round trip the real host gives them, secrets
 * and keys are held to the real host's limits, the web answers as the test says, what is marked watched and
 * playlists are kept as they are changed, songs are found as Valence finds them, a library read
 * that names nobody is refused as it is in the background, and every other call is recorded.
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
    },
    notifications: { send: vi.fn<ValenceHost['notifications']['send']>(() => Promise.resolve()) },
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

  return { host, stored, secrets, playlists };
};

export { aHost };
