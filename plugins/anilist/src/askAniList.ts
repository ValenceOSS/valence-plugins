import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';

const GRAPHQL = 'https://graphql.anilist.co';

/**
 * Asks AniList a GraphQL question, as the signed-in viewer where a token is given and otherwise as
 * anyone, which is enough for what AniList shows publicly.
 *
 * @param valence - The host.
 * @param token - The viewer's AniList token, or nothing.
 * @param query - The query.
 * @param variables - Its variables.
 * @returns The answer, as `valence.http.fetch` gives it.
 */
const askAniList = (
  valence: ValenceHost,
  token: string | null,
  query: string,
  variables: Record<string, number | string>,
) =>
  valence.http.fetch(GRAPHQL, {
    method: 'POST',
    headers: {
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

export { askAniList };
