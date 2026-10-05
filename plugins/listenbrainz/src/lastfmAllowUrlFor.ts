/**
 * The page on Last.fm where somebody allows Valence to act for them.
 *
 * @param apiKey - The plugin's API key.
 * @param token - The sign-in token Last.fm gave.
 * @returns The address.
 */
const lastfmAllowUrlFor = (apiKey: string, token: string): string =>
  `https://www.last.fm/api/auth/?api_key=${encodeURIComponent(apiKey)}&token=${encodeURIComponent(token)}`;

export { lastfmAllowUrlFor };
