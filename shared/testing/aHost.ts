import { createHmac } from 'node:crypto';
import { vi } from 'vitest';
import type { MediaRef, Stored, ValenceHost } from '@ValenceSDK/host/ValenceHost';

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
  profiles?: { id: string; name: string }[];
};

/**
 * A `valence` host held in memory, for testing a plugin without a server: storage is a map, the
 * web answers as the test says, and every other call is recorded.
 *
 * @param options - The settings, web answers, connected accounts and library this test starts with.
 * @returns The host, and the storage behind it.
 */
const aHost = (options: HostOptions = {}) => {
  const stored = new Map<string, Stored>();
  const library = options.library ?? [];
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
          (options.finished ?? []).map((mediaId) => ({
            mediaId,
            positionSeconds: 1400,
            durationSeconds: 1400,
            isFinished: true,
            updatedAt: '2026-09-28T12:00:00.000Z',
          })),
        ),
      ),
      markWatched: vi.fn(() => Promise.resolve()),
      markUnwatched: vi.fn(() => Promise.resolve()),
    },
    requests: {
      searchCatalogue: vi.fn<ValenceHost['requests']['searchCatalogue']>(() => Promise.resolve([])),
      create: vi.fn<ValenceHost['requests']['create']>(() => Promise.resolve({ status: 'made' })),
    },
    playlists: {
      list: vi.fn<ValenceHost['playlists']['list']>(() => Promise.resolve([])),
      create: vi.fn<ValenceHost['playlists']['create']>(() =>
        Promise.resolve({ id: 'playlist-1' }),
      ),
      add: vi.fn<ValenceHost['playlists']['add']>(() => Promise.resolve()),
    },
    music: { findTrack: vi.fn<ValenceHost['music']['findTrack']>(() => Promise.resolve(null)) },
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

  return { host, stored };
};

export { aHost };
