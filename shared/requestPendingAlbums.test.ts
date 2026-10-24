import { aHost } from './testing/aHost';
import { requestPendingAlbums } from './requestPendingAlbums';

const ALBUM = {
  catalogueId: 'quiet-harbour',
  kind: 'album' as const,
  title: 'Quiet Harbour',
  year: 2005,
  artist: 'The Lanterns',
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

  it('keeps a playlist with an album that could not be asked for just now, says what was, and carries on', async () => {
    const { host, stored } = aHost();

    stored.set('requestMissing:p1:playlist-1', { playlistId: 'playlist-1', name: 'Running' });
    stored.set('requestMissing:p1:playlist-2', { playlistId: 'playlist-2', name: 'Walking' });
    host.requests.missingAlbums.mockImplementation((_profileId, playlistId) =>
      Promise.resolve({
        isMatching: false,
        albums:
          playlistId === 'playlist-1'
            ? [ALBUM, { ...ALBUM, catalogueId: 'second' }]
            : [{ ...ALBUM, catalogueId: 'third' }],
      }),
    );
    host.requests.create
      .mockResolvedValueOnce({ status: 'made' })
      .mockRejectedValueOnce(new Error('The requests service couldn’t take the request just now.'))
      .mockResolvedValueOnce({ status: 'made' });

    expect(await requestPendingAlbums(host, later())).toBe(2);
    expect(stored.has('requestMissing:p1:playlist-1')).toBe(true);
    expect(stored.has('requestMissing:p1:playlist-2')).toBe(false);
    expect(host.notifications.send).toHaveBeenCalledTimes(2);
    expect(host.log.warn).toHaveBeenCalledWith(
      'Could not request an album just now',
      expect.objectContaining({ playlist: 'playlist-1', album: 'second' }),
    );
  });

  it('lets go of a playlist that is gone, and starts nothing once the time is up', async () => {
    const { host, stored } = aHost();

    stored.set('requestMissing:p1:playlist-1', { playlistId: 'playlist-1', name: 'Running' });
    host.requests.missingAlbums.mockResolvedValue(null);

    await requestPendingAlbums(host, { startBy: 0, stopBy: 0 });

    expect(host.requests.missingAlbums).not.toHaveBeenCalled();

    await requestPendingAlbums(host, later());

    expect(stored.size).toBe(0);
  });
});
