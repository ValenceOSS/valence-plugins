/**
 * Spotify answering as its 2026 API does, for tests: a two-page playlist the person made, one they
 * only follow, and two pages of their playlists.
 *
 * @param url - What was asked.
 * @returns Spotify's answer.
 */
const spotifyAnswers = (url: string): { status: number; text: string } => {
  const track = (name: string, isrc?: string) => ({
    item: {
      type: 'track',
      name,
      artists: [{ name: 'Bloc Party' }],
      album: { name: 'Silent Alarm' },
      ...(isrc === undefined ? {} : { external_ids: { isrc } }),
    },
  });

  if (url === 'https://api.spotify.com/v1/me') {
    return { status: 200, text: JSON.stringify({ id: 'me' }) };
  }

  if (url === 'https://api.spotify.com/v1/me/playlists?limit=50') {
    return {
      status: 200,
      text: JSON.stringify({
        items: [
          { id: 'mix1', name: 'Running', owner: { id: 'me' }, items: { total: 12 } },
          { id: 'theirs', name: 'Followed', owner: { id: 'someone' }, items: { total: 40 } },
          null,
        ],
        next: 'https://api.spotify.com/v1/me/playlists?offset=50&limit=50',
      }),
    };
  }

  if (url === 'https://api.spotify.com/v1/me/playlists?offset=50&limit=50') {
    return {
      status: 200,
      text: JSON.stringify({
        items: [
          {
            id: 'shared',
            name: 'Together',
            collaborative: true,
            owner: { id: 'friend' },
            items: null,
          },
        ],
        next: null,
      }),
    };
  }

  if (url.startsWith('https://api.spotify.com/v1/playlists/mix1?')) {
    return {
      status: 200,
      text: JSON.stringify({
        name: 'Running',
        items: {
          items: [
            track('Helicopter', 'GBAAA0500001'),
            { item: null },
            { item: { type: 'episode', name: 'A podcast' } },
          ],
          next: 'https://api.spotify.com/v1/playlists/mix1/items?offset=100',
        },
      }),
    };
  }

  if (url === 'https://api.spotify.com/v1/playlists/mix1/items?offset=100') {
    return { status: 200, text: JSON.stringify({ items: [track('Banquet')], next: null }) };
  }

  if (url.startsWith('https://api.spotify.com/v1/playlists/theirs?')) {
    return { status: 200, text: JSON.stringify({ name: 'Followed' }) };
  }

  return { status: 404, text: '' };
};

export { spotifyAnswers };
