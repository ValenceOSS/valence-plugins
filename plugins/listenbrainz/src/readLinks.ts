import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { Links } from './Links';
import { LastfmLinkSchema, ListenBrainzLinkSchema } from './Links';
import { linkKeyFor } from './linkKeyFor';

/**
 * The services somebody has connected.
 *
 * @param valence - The host.
 * @param profileId - Whose.
 * @returns Each service's connection, or nothing for one they have not connected.
 */
const readLinks = async (valence: ValenceHost, profileId: string): Promise<Links> => {
  const listenbrainz = ListenBrainzLinkSchema.safeParse(
    await valence.storage.get(linkKeyFor('listenbrainz', profileId)),
  );
  const lastfm = LastfmLinkSchema.safeParse(
    await valence.storage.get(linkKeyFor('lastfm', profileId)),
  );

  return {
    listenbrainz: listenbrainz.success ? listenbrainz.data : null,
    lastfm: lastfm.success ? lastfm.data : null,
  };
};

export { readLinks };
