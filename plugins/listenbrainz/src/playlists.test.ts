import type { SurfaceBlock } from '@ValenceSDK/surface/SurfaceBlockSchema';
import { SurfaceSchema } from '@ValenceSDK/surface/SurfaceSchema';
import { aHost } from '@Shared/testing/aHost';
import { aMedia } from '@Shared/testing/aMedia';
import { actOnListening } from './actOnListening';
import { renderListening } from './renderListening';
import { updateEveryone } from './updateEveryone';
import { bothServices } from './testing/bothServices';
import { contextFor } from './testing/contextFor';
import { LASTFM_KEYS } from './testing/LASTFM_KEYS';
import { lastfmAnswers } from './testing/lastfmAnswers';
import { listenBrainzAnswers, TOKEN } from './testing/listenBrainzAnswers';
import { musicLibrary } from './testing/musicLibrary';

const NOW = new Date('2026-10-05T12:00:00.000Z');

const WEEK_ONE = '11111111-1111-4111-8111-111111111111';

const WEEK_TWO = '22222222-2222-4222-8222-222222222222';

const later = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000);

const flatten = (blocks: readonly SurfaceBlock[]): SurfaceBlock[] =>
  blocks.flatMap((block) =>
    block.type === 'section' ? [block, ...flatten(block.children)] : [block],
  );

const weekly = (
  id: string,
  tracks: { title: string; creator: string; album?: string; artists?: string[] }[],
) => ({
  id,
  patch: 'weekly-jams',
  tracks,
});

const listenBrainzHost = (
  playlists: ReturnType<typeof weekly>[][],
  settings: Record<string, string | boolean> = {},
) => {
  let week = 0;
  const made = aHost({
    settings,
    library: musicLibrary(),
    answers: (url, init) => listenBrainzAnswers(playlists[week] ?? [])(url, init),
  });

  made.stored.set('listenbrainz:p1', { token: TOKEN, user: 'marques' });

  return { ...made, nextWeek: () => (week += 1) };
};

const keep = (host: ReturnType<typeof aHost>['host'], fields: Record<string, boolean>, now = NOW) =>
  actOnListening(
    contextFor(host),
    { action: { id: 'save' }, fields: { scrobble: true, ...fields } },
    now,
  );

const songsOf = (playlists: ReturnType<typeof aHost>['playlists'], id = 'playlist-1') =>
  playlists.get(id)?.entries.map((entry) => entry.mediaId);

describe('keeping a ListenBrainz playlist', () => {
  it('makes the playlist from its songs in order as soon as it is chosen, a missing one in its place', async () => {
    const { host, playlists } = listenBrainzHost([
      [
        weekly(WEEK_ONE, [
          { title: 'Low Tide', creator: 'Mara Quill' },
          {
            title: 'Somewhere Else',
            creator: 'Nobody Here & Guest',
            artists: ['Nobody Here', 'Guest'],
          },
          {
            title: 'Northern Line',
            creator: 'The Signal Box & Friends',
            artists: ['The Signal Box', 'Friends'],
          },
        ]),
      ],
    ]);
    const page = flatten(SurfaceSchema.parse(await keep(host, { keepWeeklyJams: true })).blocks);

    expect(playlists.get('playlist-1')).toMatchObject({
      name: 'Marques’s Weekly Jams',
      profileId: 'p1',
    });
    expect(songsOf(playlists)).toEqual(['s2', null, 's1']);
    expect(playlists.get('playlist-1')?.entries[1]?.missing).toEqual({
      title: 'Somewhere Else',
      artist: 'Nobody Here',
      album: null,
      releaseId: null,
    });
    expect(page).toContainEqual(
      expect.objectContaining({
        type: 'list',
        title: 'Kept playlists',
        rows: [
          expect.objectContaining({ label: 'Weekly Jams', detail: '2 of 3 songs in your library' }),
        ],
      }),
    );
    expect(host.notifications.send).toHaveBeenCalledWith('p1', {
      title: 'Weekly Jams is ready',
      body: '2 of 3 songs are in your library.',
    });
  });

  it('brings it up to date when next week’s arrives, leaving songs the person added', async () => {
    const { host, playlists, nextWeek } = listenBrainzHost([
      [
        weekly(WEEK_ONE, [
          { title: 'Low Tide', creator: 'Mara Quill' },
          { title: 'Northern Line', creator: 'The Signal Box' },
        ]),
      ],
      [
        weekly(WEEK_TWO, [
          { title: 'Paper Kites', creator: 'Odell Finch' },
          { title: 'Low Tide', creator: 'Mara Quill' },
        ]),
        weekly(WEEK_ONE, []),
      ],
    ]);

    await keep(host, { keepWeeklyJams: true });
    await host.playlists.add('p1', 'playlist-1', ['jingle']);

    expect(await updateEveryone(host, later(1))).toBe(0);

    nextWeek();

    expect(await updateEveryone(host, later(2))).toBe(0);
    expect(await updateEveryone(host, later(7))).toBe(1);
    expect(songsOf(playlists)).toEqual(['s2', 'jingle', 's3']);
    expect(host.playlists.create).toHaveBeenCalledTimes(1);
    expect(host.notifications.send).toHaveBeenCalledTimes(1);
  });

  it('keeps a missing song Valence has since filled in, where it stands, next week', async () => {
    const { host, playlists, nextWeek } = listenBrainzHost([
      [
        weekly(WEEK_ONE, [
          { title: 'Paper Kites', creator: 'Odell Finch' },
          { title: 'Low Tide', creator: 'Mara Quill' },
        ]),
      ],
      [
        weekly(WEEK_TWO, [
          { title: 'Paper Kites', creator: 'Odell Finch' },
          { title: 'Low Tide', creator: 'Mara Quill' },
        ]),
        weekly(WEEK_ONE, []),
      ],
    ]);

    host.music.findTrack.mockImplementation(async ({ title }) => {
      await Promise.resolve();

      return title === 'Low Tide' ? aMedia({ id: 's2', kind: 'track', title }) : null;
    });
    await keep(host, { keepWeeklyJams: true });

    const filled = playlists.get('playlist-1')?.entries[0];

    expect(filled?.missing).toMatchObject({ title: 'Paper Kites' });

    if (filled !== undefined) {
      filled.mediaId = 's3';
      filled.missing = null;
    }

    host.music.findTrack.mockImplementation(async ({ title }) => {
      await Promise.resolve();

      return aMedia({ id: title === 'Low Tide' ? 's2' : 's3', kind: 'track', title });
    });
    nextWeek();
    await updateEveryone(host, later(7));

    expect(songsOf(playlists)).toEqual(['s3', 's2']);
    expect(host.playlists.drop).not.toHaveBeenCalled();
  });

  it('stops keeping a playlist the person deleted', async () => {
    const { host, stored, playlists, nextWeek } = listenBrainzHost([
      [weekly(WEEK_ONE, [{ title: 'Low Tide', creator: 'Mara Quill' }])],
      [weekly(WEEK_TWO, [{ title: 'Paper Kites', creator: 'Odell Finch' }])],
    ]);

    await keep(host, { keepWeeklyJams: true });
    playlists.delete('playlist-1');
    nextWeek();
    await updateEveryone(host, later(7));

    expect(stored.get('preferences:p1')).toMatchObject({ keep: [] });
    expect(stored.has('kept:p1:weekly-jams')).toBe(false);
    expect(host.playlists.create).toHaveBeenCalledTimes(1);
  });

  it('works through a long playlist over several runs, changing the playlist once at the end', async () => {
    const { host, stored, playlists } = listenBrainzHost([
      [
        weekly(
          WEEK_ONE,
          Array.from({ length: 40 }, () => ({ title: 'Low Tide', creator: 'Mara Quill' })),
        ),
      ],
    ]);

    stored.set('preferences:p1', { scrobble: true, keep: ['weekly-jams'] });

    let clock = 0;
    const now = vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));

    expect(await updateEveryone(host, NOW, 10_000)).toBe(0);

    const { next } = stored.get('update:p1:weekly-jams') as { next: number };

    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(40);
    expect(playlists.size).toBe(0);

    now.mockRestore();

    expect(await updateEveryone(host, NOW)).toBe(1);
    expect(songsOf(playlists)).toHaveLength(40);
  });

  it('requests the missing songs’ albums Valence finds, where the administrator chose to', async () => {
    const album = (catalogueId: string, standing: 'askable' | 'kept' | 'asked') => ({
      catalogueId,
      kind: 'album' as const,
      title: catalogueId,
      year: 2025,
      artist: 'Nobody Here',
      isInLibrary: standing === 'kept',
      isRequested: standing === 'asked',
    });
    const { host, stored } = listenBrainzHost(
      [
        [
          weekly(WEEK_ONE, [
            { title: 'Somewhere Else', creator: 'Nobody Here', album: 'Elsewhere' },
          ]),
        ],
      ],
      { requestMissingAlbums: true },
    );

    host.requests.missingAlbums.mockResolvedValue({
      isMatching: false,
      albums: [
        album('mb:elsewhere', 'askable'),
        album('mb:kept', 'kept'),
        album('mb:asked', 'asked'),
      ],
    });
    await keep(host, { keepWeeklyJams: true });

    expect(stored.has('requestMissing:p1:weekly-jams')).toBe(true);

    await updateEveryone(host, later(1));

    expect(host.requests.missingAlbums).toHaveBeenCalledWith('p1', 'playlist-1');
    expect(host.requests.create).toHaveBeenCalledTimes(1);
    expect(host.requests.create).toHaveBeenCalledWith('p1', {
      catalogueId: 'mb:elsewhere',
      kind: 'album',
    });
    expect(host.notifications.send).toHaveBeenCalledWith('p1', {
      title: 'Albums requested for Marques’s Weekly Jams',
      body: '1 album was requested for the songs not in your library.',
    });
    expect(stored.has('requestMissing:p1:weekly-jams')).toBe(false);

    await updateEveryone(host, later(2));

    expect(host.requests.missingAlbums).toHaveBeenCalledTimes(1);
  });

  it('asks again on the next run while Valence is still finding the albums', async () => {
    const { host, stored } = listenBrainzHost(
      [
        [
          weekly(WEEK_ONE, [
            { title: 'Somewhere Else', creator: 'Nobody Here', album: 'Elsewhere' },
          ]),
        ],
      ],
      { requestMissingAlbums: true },
    );

    host.requests.missingAlbums.mockResolvedValue({ isMatching: true, albums: [] });
    await keep(host, { keepWeeklyJams: true });
    await updateEveryone(host, later(1));

    expect(stored.has('requestMissing:p1:weekly-jams')).toBe(true);
  });

  it('requests nothing unless the administrator chose to', async () => {
    const { host, stored } = listenBrainzHost([
      [weekly(WEEK_ONE, [{ title: 'Somewhere Else', creator: 'Nobody Here', album: 'Elsewhere' }])],
    ]);

    await keep(host, { keepWeeklyJams: true });
    await updateEveryone(host, later(1));

    expect([...stored.keys()].filter((key) => key.startsWith('requestMissing:'))).toEqual([]);
    expect(host.requests.missingAlbums).not.toHaveBeenCalled();
    expect(host.requests.create).not.toHaveBeenCalled();
  });

  it('waits quietly for a playlist ListenBrainz has not made yet', async () => {
    const { host, playlists } = listenBrainzHost([[]]);
    const page = flatten((await keep(host, { keepDailyJams: true })).blocks);

    expect(playlists.size).toBe(0);
    expect(page).toContainEqual(
      expect.objectContaining({
        type: 'list',
        rows: [
          expect.objectContaining({ label: 'Daily Jams', detail: 'Waiting for its first update' }),
        ],
      }),
    );
  });
});

describe('keeping Last.fm loved tracks', () => {
  it('keeps them oldest first, adding a newly loved song at the end', async () => {
    let loved = [
      { name: 'Low Tide', artist: 'Mara Quill' },
      { name: 'Northern Line', artist: 'The Signal Box' },
    ];
    const { host, stored, playlists } = aHost({
      settings: LASTFM_KEYS,
      library: musicLibrary(),
      answers: (url, init) =>
        bothServices(listenBrainzAnswers(), lastfmAnswers({ loved }))(url, init),
    });

    stored.set('lastfm:p1', { sessionKey: 'session-key', user: 'marques' });
    await keep(host, { keepLoved: true });

    expect(playlists.get('playlist-1')?.name).toBe('Marques’s Loved Tracks');
    expect(songsOf(playlists)).toEqual(['s1', 's2']);

    loved = [{ name: 'Paper Kites', artist: 'Odell Finch' }, ...loved];
    await updateEveryone(host, later(7));

    expect(songsOf(playlists)).toEqual(['s1', 's2', 's3']);
    expect(host.playlists.drop).not.toHaveBeenCalled();
  });
});

describe('an empty service playlist', () => {
  it('makes no playlist until it has a song', async () => {
    const { host, stored, playlists } = aHost({
      settings: LASTFM_KEYS,
      library: musicLibrary(),
      answers: (url, init) =>
        bothServices(listenBrainzAnswers(), lastfmAnswers({ loved: [] }))(url, init),
    });

    stored.set('lastfm:p1', { sessionKey: 'session-key', user: 'marques' });
    await keep(host, { keepLoved: true });

    expect(playlists.size).toBe(0);
    expect(host.notifications.send).not.toHaveBeenCalled();
  });
});

describe('the page', () => {
  it('offers only the playlists of services the person connected', async () => {
    const { host, stored } = aHost({ settings: LASTFM_KEYS });

    stored.set('lastfm:p1', { sessionKey: 'session-key', user: 'marques' });

    const blocks = flatten(SurfaceSchema.parse(await renderListening(contextFor(host))).blocks);
    const toggles = blocks.flatMap((block) => (block.type === 'toggle' ? [block.label] : []));

    expect(toggles).toEqual(['Scrobble songs I play', 'Loved on Last.fm']);
  });

  it('keeps the choice of a playlist whose service is not connected now', async () => {
    const { host, stored } = aHost({ settings: LASTFM_KEYS });

    stored.set('lastfm:p1', { sessionKey: 'session-key', user: 'marques' });
    stored.set('preferences:p1', { scrobble: true, keep: ['weekly-jams', 'loved'] });
    await actOnListening(contextFor(host), {
      action: { id: 'save' },
      fields: { scrobble: false, keepLoved: false },
    });

    expect(stored.get('preferences:p1')).toEqual({ scrobble: false, keep: ['weekly-jams'] });
  });
});
