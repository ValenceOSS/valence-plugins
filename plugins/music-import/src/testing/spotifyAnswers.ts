/**
 * Spotify answering for a two-page playlist and a user's playlists, for tests.
 *
 * @param url - What was asked.
 * @returns Spotify's answer.
 */
const spotifyAnswers = (url: string): { status: number; text: string } => {
  const track = (name: string, isrc?: string) => ({
    track: {
      name,
      artists: [{ name: 'Bloc Party' }],
      album: { name: 'Silent Alarm' },
      ...(isrc === undefined ? {} : { external_ids: { isrc } }),
    },
  });

  if (url === 'https://accounts.spotify.com/api/token') {
    return { status: 200, text: JSON.stringify({ access_token: 'client-token' }) };
  }

  if (url.startsWith('https://api.spotify.com/v1/me/playlists')) {
    return {
      status: 200,
      text: JSON.stringify({
        items: [
          { id: 'mix1', name: 'Running', tracks: { total: 12 } },
          { id: 'mix2', name: 'Empty', tracks: null },
        ],
      }),
    };
  }

  if (url.startsWith('https://api.spotify.com/v1/playlists/mix1?')) {
    return {
      status: 200,
      text: JSON.stringify({
        name: 'Running',
        tracks: {
          items: [track('Helicopter', 'GBAAA0500001'), { track: null }],
          next: 'https://api.spotify.com/v1/playlists/mix1/tracks?offset=100',
        },
      }),
    };
  }

  if (url === 'https://api.spotify.com/v1/playlists/mix1/tracks?offset=100') {
    return { status: 200, text: JSON.stringify({ items: [track('Banquet')], next: null }) };
  }

  return { status: 404, text: '' };
};

export { spotifyAnswers };
