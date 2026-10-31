import { aHost } from '@Shared/testing/aHost';
import { aMedia } from '@Shared/testing/aMedia';
import { continueEveryone } from './continueEveryone';
import { actOnImport } from './actOnImport';
import { continueMusicImport } from './continueMusicImport';
import { forgetProfile } from './forgetProfile';
import { startMusicImport } from './startMusicImport';

const NOW = new Date('2026-09-28T12:00:00.000Z');

const playlist = (count: number, name = 'Running') => ({
  source: 'spotify' as const,
  id: 'mix1',
  name,
  tracks: Array.from({ length: count }, (_, at) => ({
    title: `Song ${at.toString()}`,
    artist: 'Bloc Party',
    album: at % 2 === 0 ? 'Silent Alarm' : null,
    isrc: at === 0 ? 'GB1' : null,
  })),
  isCut: false,
});

describe('importing a playlist', () => {
  it('makes the playlist, adds the songs in order, and leaves the missing ones’ albums to request', async () => {
    const { host, stored } = aHost();

    host.music.findTrack.mockImplementation((track) =>
      Promise.resolve(
        track.title === 'Song 0' ? aMedia({ id: 't0', title: 'Song 0', kind: 'track' }) : null,
      ),
    );

    await startMusicImport(host, 'p1', playlist(4), true, NOW);

    const job = await continueMusicImport(host, 'p1', NOW);

    expect(host.playlists.create).toHaveBeenCalledWith('p1', {
      name: 'Running',
      description: 'Imported from Spotify',
    });
    expect(host.music.findTrack).toHaveBeenCalledWith(
      { title: 'Song 0', artist: 'Bloc Party', album: 'Silent Alarm', isrc: 'GB1' },
      { profileId: 'p1' },
    );
    expect(host.playlists.add).toHaveBeenCalledWith('p1', 'playlist-1', [
      't0',
      { title: 'Song 1', artist: 'Bloc Party', album: null },
      { title: 'Song 2', artist: 'Bloc Party', album: 'Silent Alarm' },
      { title: 'Song 3', artist: 'Bloc Party', album: null },
    ]);
    expect(host.requests.searchCatalogue).not.toHaveBeenCalled();
    expect(job).toMatchObject({ found: 1, finishedAt: NOW.toISOString() });
    expect(job?.missing).toHaveLength(3);
    expect(stored.get('requestMissing:p1:playlist-1')).toEqual({
      playlistId: 'playlist-1',
      name: 'Running',
    });
    expect(host.notifications.send).toHaveBeenCalledWith('p1', {
      title: 'Running imported',
      body: '1 of 4 songs are in your library.',
    });
  });

  it('leaves nothing to request when asked not to', async () => {
    const { host, stored } = aHost();

    await startMusicImport(host, 'p1', playlist(2), false, NOW);
    await continueMusicImport(host, 'p1', NOW);

    expect([...stored.keys()].filter((key) => key.startsWith('requestMissing:'))).toEqual([]);
  });

  it('keeps names and the notification within what the host accepts, and says when a playlist was cut', async () => {
    const { host } = aHost();

    await startMusicImport(
      host,
      'p1',
      { ...playlist(1, 'x'.repeat(100)), isCut: true },
      false,
      NOW,
    );
    await continueMusicImport(host, 'p1', NOW);

    const note = host.notifications.send.mock.calls[0]?.[1];

    expect(note?.title.length).toBeLessThanOrEqual(100);
    expect(note?.body).toBe(
      '0 of 1 songs are in your library. The playlist was too long to read all of it.',
    );
    expect((await startMusicImport(host, 'p2', playlist(1, '  '), false, NOW)).name).toBe(
      'Imported playlist',
    );
  });

  it('saves how far it got before adding, so a failed notification never adds the songs again', async () => {
    const { host } = aHost();

    await startMusicImport(host, 'p1', playlist(1), false, NOW);
    host.notifications.send.mockRejectedValueOnce(new Error('title too long'));

    await expect(continueMusicImport(host, 'p1', NOW)).rejects.toThrow('title too long');
    await continueMusicImport(host, 'p1', NOW);

    expect(host.playlists.add).toHaveBeenCalledTimes(1);
  });

  it('puts the import back when adding fails, to try again next time', async () => {
    const { host } = aHost();

    await startMusicImport(host, 'p1', playlist(1), false, NOW);
    host.playlists.add.mockRejectedValueOnce(new Error('busy'));

    await expect(continueMusicImport(host, 'p1', NOW)).rejects.toThrow('busy');
    expect((await continueMusicImport(host, 'p1', NOW))?.finishedAt).toBe(NOW.toISOString());
    expect(host.playlists.add).toHaveBeenCalledTimes(2);
  });

  it('works through a long playlist for as long as a run allows, even with nobody on the page', async () => {
    const { host } = aHost();

    await startMusicImport(host, 'p1', playlist(60), false, NOW);

    expect(await continueEveryone(host, NOW)).toBe(1);
    expect(host.playlists.add).toHaveBeenCalledTimes(3);
    expect(await continueMusicImport(host, 'p2', NOW)).toBeNull();
  });

  it('stops starting more of a long playlist once the run’s time is up', async () => {
    const { host } = aHost();

    await startMusicImport(host, 'p1', playlist(60), false, NOW);
    await continueEveryone(host, NOW, 0);

    expect(host.playlists.add).toHaveBeenCalledTimes(1);
  });

  it('requests the albums Valence matches for a finished import', async () => {
    const { host, stored } = aHost();

    host.requests.missingAlbums.mockResolvedValue({
      isMatching: false,
      albums: [
        {
          catalogueId: 'silent-alarm',
          kind: 'album',
          title: 'Silent Alarm',
          year: 2005,
          artist: 'Bloc Party',
          isInLibrary: false,
          isRequested: false,
        },
      ],
    });
    await startMusicImport(host, 'p1', playlist(1), true, NOW);
    await continueMusicImport(host, 'p1', NOW);
    await continueEveryone(host, NOW);

    expect(host.requests.missingAlbums).toHaveBeenCalledWith('p1', 'playlist-1');
    expect(host.requests.create).toHaveBeenCalledWith('p1', {
      catalogueId: 'silent-alarm',
      kind: 'album',
    });
    expect(stored.has('requestMissing:p1:playlist-1')).toBe(false);
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

  it('lets go of what was kept for a removed profile, when told and when it is found gone', async () => {
    const { host, stored } = aHost({ profiles: [{ id: 'p1', name: 'Marques' }] });

    await startMusicImport(host, 'gone', playlist(1), true, NOW);
    await continueMusicImport(host, 'gone', NOW);
    await startMusicImport(host, 'p2', playlist(1), true, NOW);
    await continueMusicImport(host, 'p2', NOW);
    await forgetProfile(host, 'p2');

    expect([...stored.keys()].filter((key) => key.includes('p2'))).toEqual([]);

    await continueEveryone(host, NOW);

    expect([...stored.keys()]).toEqual([]);
  });

  it('stops an import whose Valence playlist was removed, rather than trying for ever', async () => {
    const { host, playlists } = aHost();

    await startMusicImport(host, 'p1', playlist(30), false, NOW);
    playlists.delete('playlist-1');
    host.playlists.add.mockRejectedValueOnce(new Error('There is no such playlist of theirs.'));

    const job = await continueMusicImport(host, 'p1', NOW);

    expect(job).toMatchObject({ isStopped: true, finishedAt: NOW.toISOString(), tracks: [] });
    expect(host.notifications.send).toHaveBeenCalledWith('p1', {
      title: 'Running stopped importing',
      body: '0 of 30 songs are in your library. Its Valence playlist was removed, so the rest were not added.',
    });
  });

  it('carries an import on once at a time, however many ask at once', async () => {
    const { host } = aHost();

    await startMusicImport(host, 'p1', playlist(30), false, NOW);
    await Promise.all([continueMusicImport(host, 'p1', NOW), continueMusicImport(host, 'p1', NOW)]);

    expect(host.playlists.add).toHaveBeenCalledTimes(1);
  });

  it('lets go of a finished import’s songs, keeping how many there were', async () => {
    const { host, stored } = aHost();

    await startMusicImport(host, 'p1', playlist(3), false, NOW);
    await continueMusicImport(host, 'p1', NOW);

    expect(stored.get('import:p1')).toMatchObject({ tracks: [], total: 3, found: 0 });
  });

  it('still carries imports on when requesting albums fails', async () => {
    const { host, stored } = aHost();

    stored.set('requestMissing:p1:playlist-9', { playlistId: 'playlist-9', name: 'Old' });
    host.requests.missingAlbums.mockRejectedValue(new Error('requests offline'));
    await startMusicImport(host, 'p1', playlist(30), false, NOW);

    expect(await continueEveryone(host, NOW)).toBe(1);
    expect(host.playlists.add).toHaveBeenCalledTimes(2);
    expect(host.log.warn).toHaveBeenCalledWith(
      'Could not request the albums of a playlist just now',
      { profile: 'p1', playlist: 'playlist-9', problem: 'requests offline' },
    );
    expect(stored.has('requestMissing:p1:playlist-9')).toBe(true);
  });

  it('stops once the songs being added are in, when asked to stop while they are added', async () => {
    const { host, stored } = aHost();

    await startMusicImport(host, 'p1', playlist(60), false, NOW);

    const running = continueMusicImport(host, 'p1', NOW);

    await actOnImport(
      { valence: host, viewer: { profileId: 'p1', isAdmin: false, nodes: [] }, subject: null },
      { action: { id: 'stop' }, fields: {} },
      NOW,
    );
    await running;

    expect(stored.get('import:p1')).toMatchObject({ isStopped: true, next: 25 });
    expect(await continueMusicImport(host, 'p1', NOW)).toMatchObject({ next: 25 });
    expect(host.playlists.add).toHaveBeenCalledTimes(1);
  });

  it('waits rather than asking again and again while the page carries an import on', async () => {
    const { host } = aHost();

    await startMusicImport(host, 'p1', playlist(60), false, NOW);

    const page = continueMusicImport(host, 'p1', NOW);

    host.storage.get.mockClear();
    await continueEveryone(host, NOW, 60_000);
    await page;

    expect(host.storage.get.mock.calls.length).toBeLessThan(10);
  });

  it('cleans a playlist’s name of characters a page may not show', async () => {
    const { host } = aHost();

    expect((await startMusicImport(host, 'p1', playlist(1, 'Mix\u202e'), false, NOW)).name).toBe(
      'Mix',
    );
    expect((await startMusicImport(host, 'p2', playlist(1, '\u202e'), false, NOW)).name).toBe(
      'Imported playlist',
    );
  });
});
