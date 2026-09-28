import { aHost } from '@Shared/testing/aHost';
import { aMedia } from '@Shared/testing/aMedia';
import { continueEveryone } from './continueEveryone';
import { continueMusicImport } from './continueMusicImport';
import { startMusicImport } from './startMusicImport';

const NOW = new Date('2026-09-28T12:00:00.000Z');

const playlist = (count: number) => ({
  source: 'spotify' as const,
  id: 'mix1',
  name: 'Running',
  tracks: Array.from({ length: count }, (_, at) => ({
    title: `Song ${at.toString()}`,
    artist: 'Bloc Party',
    album: at % 2 === 0 ? 'Silent Alarm' : null,
    isrc: at === 0 ? 'GB1' : null,
  })),
});

describe('importing a playlist', () => {
  it('makes the playlist, adds the songs the library has, and requests each missing album once', async () => {
    const { host } = aHost();

    host.music.findTrack.mockImplementation((track) =>
      Promise.resolve(
        track.title === 'Song 0' ? aMedia({ id: 't0', title: 'Song 0', kind: 'track' }) : null,
      ),
    );
    host.requests.searchCatalogue.mockResolvedValue([
      {
        catalogueId: 'in',
        kind: 'album',
        title: 'x',
        year: null,
        artist: null,
        isInLibrary: true,
        isRequested: false,
      },
      {
        catalogueId: 'silent-alarm',
        kind: 'album',
        title: 'Silent Alarm',
        year: 2005,
        artist: 'Bloc Party',
        isInLibrary: false,
        isRequested: false,
      },
    ]);

    await startMusicImport(host, 'p1', playlist(4), true, NOW);

    const job = await continueMusicImport(host, 'p1', NOW);

    expect(host.playlists.create).toHaveBeenCalledWith('p1', {
      name: 'Running',
      description: 'Imported from Spotify',
    });
    expect(host.music.findTrack).toHaveBeenCalledWith({
      title: 'Song 0',
      artist: 'Bloc Party',
      album: 'Silent Alarm',
      isrc: 'GB1',
    });
    expect(host.playlists.add).toHaveBeenCalledWith('p1', 'playlist-1', ['t0']);
    expect(host.requests.create).toHaveBeenCalledTimes(1);
    expect(job).toMatchObject({
      found: 1,
      requested: ['silent-alarm'],
      finishedAt: NOW.toISOString(),
    });
    expect(job?.missing).toHaveLength(3);
    expect(host.notifications.send).toHaveBeenCalledWith('p1', {
      title: 'Running imported',
      body: '1 of 4 songs are in your playlist, and 1 albums were requested.',
    });
  });

  it('requests nothing when asked not to, or when the album is already requested', async () => {
    const quiet = aHost();

    await startMusicImport(quiet.host, 'p1', playlist(2), false, NOW);
    await continueMusicImport(quiet.host, 'p1', NOW);

    expect(quiet.host.requests.searchCatalogue).not.toHaveBeenCalled();

    const asked = aHost();

    asked.host.requests.searchCatalogue.mockResolvedValue([
      {
        catalogueId: 'a',
        kind: 'album',
        title: 'x',
        year: null,
        artist: null,
        isInLibrary: false,
        isRequested: true,
      },
    ]);
    await startMusicImport(asked.host, 'p1', playlist(1), true, NOW);

    expect((await continueMusicImport(asked.host, 'p1', NOW))?.requested).toEqual([]);
    expect(asked.host.notifications.send).toHaveBeenCalledWith('p1', {
      title: 'Running imported',
      body: '0 of 1 songs are in your playlist.',
    });
  });

  it('works through a long playlist a few songs at a time, even with nobody on the page', async () => {
    const { host } = aHost();

    await startMusicImport(host, 'p1', playlist(30), false, NOW);

    expect(await continueEveryone(host, NOW)).toBe(1);
    expect((await continueMusicImport(host, 'p1', NOW))?.finishedAt).toBe(NOW.toISOString());
    expect(await continueMusicImport(host, 'p2', NOW)).toBeNull();
  });

  it('logs an import that fails and carries on', async () => {
    const { host } = aHost();

    await startMusicImport(host, 'p1', playlist(1), false, NOW);
    host.music.findTrack.mockRejectedValueOnce(new Error('library offline'));

    expect(await continueEveryone(host, NOW)).toBe(0);
    expect(host.log.warn).toHaveBeenCalledWith('Could not carry on a playlist import', {
      profile: 'p1',
      problem: 'library offline',
    });
  });
});
