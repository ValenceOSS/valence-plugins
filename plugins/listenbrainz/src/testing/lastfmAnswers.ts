type Answer = { status: number; text: string };

/**
 * Last.fm answering for tests: a sign-in token, a session once `isAllowed` says the person allowed
 * it, their loved songs newest first, and scrobbles answered as the test says.
 *
 * @param options - Whether the sign-in was allowed, the loved songs, and the error code scrobbling
 *   answers with, if any.
 * @returns A web that answers Last.fm.
 */
const lastfmAnswers =
  (
    options: {
      isAllowed?: () => boolean;
      loved?: { name: string; artist: string }[];
      scrobbleError?: number;
    } = {},
  ) =>
  (url: string, init: { body?: string }): Answer => {
    if (!url.startsWith('https://ws.audioscrobbler.com/2.0/')) {
      return { status: 404, text: '' };
    }

    const params = new URLSearchParams(init.body ?? url.split('?')[1] ?? '');
    const method = params.get('method');

    if (method === 'auth.getToken') {
      return { status: 200, text: JSON.stringify({ token: 'signin-token' }) };
    }

    if (method === 'auth.getSession') {
      return options.isAllowed?.() === true
        ? {
            status: 200,
            text: JSON.stringify({
              session: { name: 'marques', key: 'session-key', subscriber: 0 },
            }),
          }
        : {
            status: 403,
            text: JSON.stringify({ error: 14, message: 'This token has not been authorized' }),
          };
    }

    if (method === 'user.getLovedTracks') {
      const loved = options.loved ?? [];

      return {
        status: 200,
        text: JSON.stringify({
          lovedtracks: {
            track: loved.map((track) => ({
              name: track.name,
              mbid: '',
              artist: { name: track.artist, mbid: '' },
              date: { uts: '1700000000' },
            })),
            '@attr': {
              user: 'marques',
              page: '1',
              perPage: '200',
              totalPages: '1',
              total: String(loved.length),
            },
          },
        }),
      };
    }

    if (method === 'track.scrobble' || method === 'track.updateNowPlaying') {
      return options.scrobbleError === undefined
        ? {
            status: 200,
            text: JSON.stringify({ scrobbles: { '@attr': { accepted: 1, ignored: 0 } } }),
          }
        : {
            status: options.scrobbleError === 9 ? 403 : 503,
            text: JSON.stringify({ error: options.scrobbleError, message: 'No' }),
          };
    }

    return { status: 400, text: JSON.stringify({ error: 3, message: 'Invalid method' }) };
  };

export { lastfmAnswers };
