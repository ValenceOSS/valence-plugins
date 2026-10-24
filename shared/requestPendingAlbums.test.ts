import { aHost } from './testing/aHost';
import { requestPendingAlbums } from './requestPendingAlbums';

const ALBUM = {
  catalogueId: 'silent-alarm',
  kind: 'album' as const,
  title: 'Silent Alarm',
  year: 2005,
  artist: 'Bloc Party',
  isInLibrary: false,
  isRequested: false,
};

const later = () => ({ startBy: Date.now() + 60_000, stopBy: Date.now() + 60_000 });

describe('requestPendingAlbums', () => {
  it('requests the albums Valence finds, tells the person, and lets the playlist go', async () => {
    const { host, stored } = aHost();

    stored.set('requestMissing:p1:playlist-1', { playlistId: 'playlist-1', name: 'x'.repeat(100) });
    host.requests.missingAlbums.mockResolvedValue({
      isMatching: false,
      albums: [ALBUM, { ...ALBUM, catalogueId: 'had', isInLibrary: true }],
    });

    expect(await requestPendingAlbums(host, later())).toBe(1);
    expect(host.requests.create).toHaveBeenCalledTimes(1);
    expect(host.notifications.send.mock.calls[0]?.[1].title.length).toBeLessThanOrEqual(100);
    expect(stored.size).toBe(0);
  });

  it('asks again next time while Valence is still matching', async () => {
    const { host, stored } = aHost();

    stored.set('requestMissing:p1:playlist-1', { playlistId: 'playlist-1', name: 'Running' });
    host.requests.missingAlbums.mockResolvedValue({ isMatching: true, albums: [] });

    expect(await requestPendingAlbums(host, later())).toBe(0);
    expect(stored.has('requestMissing:p1:playlist-1')).toBe(true);
    expect(host.notifications.send).not.toHaveBeenCalled();
  });

  it('lets go of a playlist only once it is gone, and starts nothing once the time is up', async () => {
    const { host, stored, playlists } = aHost({
      playlists: [{ id: 'playlist-1', name: 'Running', profileId: 'p1', entries: [] }],
    });

    stored.set('requestMissing:p1:playlist-1', { playlistId: 'playlist-1', name: 'Running' });
    host.requests.missingAlbums.mockResolvedValue(null);

    await requestPendingAlbums(host, { startBy: 0, stopBy: 0 });

    expect(host.requests.missingAlbums).not.toHaveBeenCalled();

    await requestPendingAlbums(host, later());

    expect(stored.size).toBe(1);

    playlists.delete('playlist-1');
    await requestPendingAlbums(host, later());

    expect(stored.size).toBe(0);
  });
});
