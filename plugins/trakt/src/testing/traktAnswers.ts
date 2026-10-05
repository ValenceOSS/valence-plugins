type Answer = { status: number; text: string; headers?: Record<string, string> };

/**
 * Trakt answering as somebody with a history, for tests: their history a page at a time, with
 * Trakt's page count, who they are, and every post to their history accepted.
 *
 * @param plays - Their history, newest first, as Trakt sends it.
 * @returns A web that answers Trakt.
 */
const traktAnswers =
  (plays: object[]) =>
  (url: string, init: { method?: string }): Answer => {
    const address = /^https:\/\/api\.trakt\.tv(\/[^?]*)\??(.*)$/u.exec(url);
    const path = address?.[1];
    const query = new URLSearchParams(address?.[2] ?? '');

    if (path === '/sync/history' && init.method === 'POST') {
      return { status: 201, text: JSON.stringify({ added: { movies: 1, episodes: 0 } }) };
    }

    if (path === '/sync/history') {
      const page = Number(query.get('page') ?? '1');
      const limit = Number(query.get('limit') ?? '10');

      return {
        status: 200,
        text: JSON.stringify(plays.slice((page - 1) * limit, page * limit)),
        headers: {
          'x-pagination-page': page.toString(),
          'x-pagination-page-count': Math.max(1, Math.ceil(plays.length / limit)).toString(),
        },
      };
    }

    if (path === '/users/settings') {
      return { status: 200, text: JSON.stringify({ user: { username: 'marques', name: null } }) };
    }

    return { status: 404, text: '' };
  };

export { traktAnswers };
