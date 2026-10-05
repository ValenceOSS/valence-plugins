/**
 * Where somebody's connection to a service is kept. These services have no sign-in Valence can
 * run for a plugin, so the plugin keeps the token itself.
 *
 * @param service - Which service, or `lastfm-sign-in` for a Last.fm sign-in under way.
 * @param profileId - Whose.
 * @returns The storage key.
 */
const linkKeyFor = (
  service: 'listenbrainz' | 'lastfm' | 'lastfm-sign-in',
  profileId: string,
): string => `${service}:${profileId}`;

export { linkKeyFor };
