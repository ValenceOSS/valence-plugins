import { aHost } from '@Shared/testing/aHost';
import { readSourcePlaylist } from './readSourcePlaylist';
import { readSpotifyPlaylist } from './readSpotifyPlaylist';
import { readSpotifyPlaylists } from './readSpotifyPlaylists';
import { spotifyAnswers } from './testing/spotifyAnswers';

describe('reading Spotify', () => {
  it('lists every page of the playlists the person made or collaborates on', async () => {
    const { host } = aHost({ answers: spotifyAnswers });

    expect(await readSpotifyPlaylists(host, 'mine')).toEqual([
      { id: 'mix1', name: 'Running', tracks: 12 },
      { id: 'shared', name: 'Together', tracks: 0 },
    ]);
  });

  it('reads every page of a playlist, skipping removed songs and podcast episodes', async () => {
    const { host } = aHost({ answers: spotifyAnswers });

    expect(await readSpotifyPlaylist(host, 'mine', 'mix1')).toEqual({
      source: 'spotify',
      id: 'mix1',
      name: 'Running',
      tracks: [
        { title: 'Helicopter', artist: 'Bloc Party', album: 'Silent Alarm', isrc: 'GBAAA0500001' },
        { title: 'Banquet', artist: 'Bloc Party', album: 'Silent Alarm', isrc: null },
      ],
      isCut: false,
    });
  });

  it('says so where Spotify does not share a playlist’s songs', async () => {
    const { host } = aHost({ answers: spotifyAnswers });

    expect(await readSpotifyPlaylist(host, 'mine', 'theirs')).toBe(
      'Spotify only shares the songs of playlists you made or collaborate on.',
    );
  });

  it('marks a playlist cut short when it has more pages than are read', async () => {
    const { host } = aHost({
      answers: (url) => ({
        status: 200,
        text: JSON.stringify(
          url.includes('fields=')
            ? { name: 'Endless', items: { items: [], next: 'https://api.spotify.com/next' } }
            : { items: [], next: 'https://api.spotify.com/next' },
        ),
      }),
    });
    const playlist = await readSpotifyPlaylist(host, 'mine', 'endless');

    expect(typeof playlist === 'string' ? playlist : playlist.isCut).toBe(true);
    expect(host.http.fetch).toHaveBeenCalledTimes(41);
  });

  it('reads Spotify links only with the person’s own account', async () => {
    const connected = aHost({
      answers: spotifyAnswers,
      connections: { 'p1:spotify': { accessToken: 'mine', account: null } },
    });
    const stranger = aHost({ answers: spotifyAnswers });

    expect(
      await readSourcePlaylist(connected.host, 'p1', { source: 'spotify', id: 'mix1' }),
    ).toMatchObject({ name: 'Running' });
    expect(connected.host.http.fetch.mock.calls[0]?.[1]?.headers?.['authorization']).toBe(
      'Bearer mine',
    );
    expect(await readSourcePlaylist(stranger.host, 'p1', { source: 'spotify', id: 'mix1' })).toBe(
      'Connect Spotify first. It shares the songs of playlists you made or collaborate on.',
    );
    expect(stranger.host.http.fetch).not.toHaveBeenCalled();
  });
});
