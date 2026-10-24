type Answer = { status: number; text: string };

/**
 * Last.fm answering for tests: a sign-in token, a session once `isAllowed` says the person allowed
 * it, their loved songs newest first, and scrobbles answered as the test says, each one
 * accepted or ignored with the code the test gives.
 *
 * @param options - Whether the sign-in was allowed, the loved songs, the error code scrobbling
 *   answers with, if any, and the code each scrobble is ignored with, by its place in the call.
 * @returns A web that answers Last.fm.
 */
const lastfmAnswers =
  (
    options: {
      isAllowed?: () => boolean;
      loved?: { name: string; artist: string }[];
      scrobbleError?: number;
      ignored?: Record<number, number>;
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
      const count = [...params.keys()].filter((key) => key.startsWith('artist[')).length;
      const codes = Array.from({ length: count }, (_, at) => options.ignored?.[at] ?? 0);

      return options.scrobbleError === undefined
        ? {
            status: 200,
            text: JSON.stringify({
              scrobbles: {
                scrobble: codes.map((code) => ({
                  ignoredMessage: { code: code.toString(), '#text': code === 0 ? '' : 'Ignored' },
                })),
                '@attr': {
                  accepted: codes.filter((code) => code === 0).length,
                  ignored: codes.filter((code) => code !== 0).length,
                },
              },
            }),
          }
        : {
            status: [9, 10, 26].includes(options.scrobbleError) ? 403 : 503,
            text: JSON.stringify({ error: options.scrobbleError, message: 'No' }),
          };
    }

    return { status: 400, text: JSON.stringify({ error: 3, message: 'Invalid method' }) };
  };

export { lastfmAnswers };
