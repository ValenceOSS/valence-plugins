import { readPlaylistLink } from './readPlaylistLink';

describe('readPlaylistLink', () => {
  it('reads a Spotify playlist link, share parameters and all', () => {
    expect(
      readPlaylistLink(' https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc '),
    ).toEqual({
      source: 'spotify',
      id: '37i9dQZF1DXcBWIGoYBM5M',
    });
  });

  it('reads an Apple Music playlist link with its storefront', () => {
    expect(
      readPlaylistLink(
        'https://music.apple.com/gb/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb',
      ),
    ).toEqual({
      source: 'apple',
      id: 'pl.f4d106fed2bd41149aaacabb233eb5eb',
      storefront: 'gb',
    });
  });

  it('reads a link whatever the case of its address', () => {
    expect(readPlaylistLink('HTTPS://Open.Spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toEqual({
      source: 'spotify',
      id: '37i9dQZF1DXcBWIGoYBM5M',
    });
  });

  it.each([
    'not a link',
    'https://user@open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    'https://open.spotify.com.evil.example/playlist/37i9dQZF1DXcBWIGoYBM5M',
    'http://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    'https://open.spotify.com/album/37i9dQZF1DXcBWIGoYBM5M',
    'https://open.spotify.com/playlist/../../x',
    'https://music.apple.com/gb/album/x/pl.f4d106fed2bd41149',
    'https://music.apple.com/gb/playlist/x/1234',
    'https://evil.example/playlist/37i9dQZF1DXcBWIGoYBM5M',
  ])('refuses %s', (link) => {
    expect(readPlaylistLink(link)).toBeNull();
  });
});
