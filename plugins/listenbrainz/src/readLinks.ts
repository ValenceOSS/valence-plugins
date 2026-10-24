import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { Links } from './Links';
import { StoredLinkSchema } from './Links';
import { linkKeyFor } from './linkKeyFor';
import { SECRET_KEYS } from './SECRET_KEYS';
import type { Service } from './Service';

/**
 * One service's connection: the account's name from storage and its token from the person's
 * sealed secrets. A token an earlier version kept in plain storage is moved into the secrets the
 * first time it is read.
 *
 * @param valence - The host.
 * @param profileId - Whose.
 * @param service - Which service.
 * @returns The account and its token, or nothing where they haven't connected it.
 */
const readLink = async (
  valence: ValenceHost,
  profileId: string,
  service: Service,
): Promise<{ user: string; secret: string } | null> => {
  const stored = StoredLinkSchema.safeParse(
    await valence.storage.get(linkKeyFor(service, profileId)),
  );

  if (!stored.success) {
    return null;
  }

  const plain = service === 'listenbrainz' ? stored.data.token : stored.data.sessionKey;

  if (plain !== undefined) {
    await valence.secrets.set(profileId, SECRET_KEYS[service], plain);
    await valence.storage.set(linkKeyFor(service, profileId), { user: stored.data.user });

    return { user: stored.data.user, secret: plain };
  }

  const secret = await valence.secrets.get(profileId, SECRET_KEYS[service]);

  return secret === null ? null : { user: stored.data.user, secret };
};

/**
 * The services somebody has connected.
 *
 * @param valence - The host.
 * @param profileId - Whose.
 * @returns Each service's connection, or nothing for one they have not connected.
 */
const readLinks = async (valence: ValenceHost, profileId: string): Promise<Links> => {
  const listenbrainz = await readLink(valence, profileId, 'listenbrainz');
  const lastfm = await readLink(valence, profileId, 'lastfm');

  return {
    listenbrainz:
      listenbrainz === null ? null : { token: listenbrainz.secret, user: listenbrainz.user },
    lastfm: lastfm === null ? null : { sessionKey: lastfm.secret, user: lastfm.user },
  };
};

export { readLinks };
