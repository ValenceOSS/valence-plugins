import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { linkKeyFor } from './linkKeyFor';
import { pendingKeyFor } from './pendingKeyFor';
import { SECRET_KEYS } from './SECRET_KEYS';
import type { Service } from './Service';

/**
 * Lets go of somebody's connection to a service: its waiting scrobbles, which must never reach an
 * account they connect later, the account's name and its sealed token.
 *
 * @param valence - The host.
 * @param profileId - Whose connection.
 * @param service - Which service.
 */
const dropLink = async (
  valence: ValenceHost,
  profileId: string,
  service: Service,
): Promise<void> => {
  for (const key of await valence.storage.keys(`${pendingKeyFor(profileId)}${service}:`)) {
    await valence.storage.delete(key);
  }

  await valence.storage.delete(linkKeyFor(service, profileId));
  await valence.secrets.delete(profileId, SECRET_KEYS[service]);
};

export { dropLink };
