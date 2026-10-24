import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { linkKeyFor } from './linkKeyFor';
import { SECRET_KEYS } from './SECRET_KEYS';
import type { Service } from './Service';

/**
 * Keeps somebody's new connection to a service: its token sealed in their secrets, which go with
 * their profile, and only the account's name in storage.
 *
 * @param valence - The host.
 * @param profileId - Whose.
 * @param service - Which service.
 * @param link - The account's name, and the token or session key.
 */
const saveLink = async (
  valence: ValenceHost,
  profileId: string,
  service: Service,
  link: { user: string; secret: string },
): Promise<void> => {
  await valence.secrets.set(profileId, SECRET_KEYS[service], link.secret);
  await valence.storage.set(linkKeyFor(service, profileId), { user: link.user });
};

export { saveLink };
