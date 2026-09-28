import { aHost } from '@Shared/testing/aHost';
import { readSpotifyPlaylist } from './readSpotifyPlaylist';
import { readSpotifyPlaylists } from './readSpotifyPlaylists';
import { spotifyToken } from './spotifyToken';
import { spotifyAnswers } from './testing/spotifyAnswers';

describe('reading Spotify', () => {
  it('prefers the viewer’s own token', async () => {
    const { host } = aHost({
      connections: { 'p1:spotify': { accessToken: 'mine', account: null } },
    });

    expect(await spotifyToken(host, 'p1')).toBe('mine');
  });

  it('falls back to the plugin’s client token, asked for with its id and secret', async () => {
    const { host } = aHost({
      settings: { spotifyClientId: 'id', spotifyClientSecret: 'secret' },
      answers: spotifyAnswers,
    });

    expect(await spotifyToken(host, 'p1')).toBe('client-token');
    expect(host.http.fetch.mock.calls[0]?.[1]?.headers?.['authorization']).toBe(
      `Basic ${Buffer.from('id:secret').toString('base64')}`,
    );
  });

  it('has no token when Spotify is neither connected nor set up', async () => {
    const { host } = aHost({ settings: { spotifyClientId: 'id' } });

    expect(await spotifyToken(host, 'p1')).toBeNull();
  });

  it('lists the viewer’s playlists', async () => {
    const { host } = aHost({ answers: spotifyAnswers });

    expect(await readSpotifyPlaylists(host, 'mine')).toEqual([
      { id: 'mix1', name: 'Running', tracks: 12 },
      { id: 'mix2', name: 'Empty', tracks: 0 },
    ]);
  });

  it('reads every page of a playlist, skipping removed songs', async () => {
    const { host } = aHost({ answers: spotifyAnswers });
    const playlist = await readSpotifyPlaylist(host, 'mine', 'mix1');

    expect(playlist.name).toBe('Running');
    expect(playlist.tracks).toEqual([
      { title: 'Helicopter', artist: 'Bloc Party', album: 'Silent Alarm', isrc: 'GBAAA0500001' },
      { title: 'Banquet', artist: 'Bloc Party', album: 'Silent Alarm', isrc: null },
    ]);
  });
});
