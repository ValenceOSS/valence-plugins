import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { forgetLink } from './forgetLink';
import type { SendOutcome } from './SendOutcome';
import type { Service } from './Service';
import { SERVICE_NAMES } from './SERVICE_NAMES';

/**
 * Does what a sent listen calls for: disconnects a service that refused the person's sign-in, logs
 * any other refusal with the service's own reason, and tells the person once when the reason is
 * theirs to put right, until a listen goes through again.
 *
 * @param valence - The host.
 * @param profileId - Whose listen.
 * @param service - Where it was sent.
 * @param outcome - How it went.
 */
const actOnOutcome = async (
  valence: ValenceHost,
  profileId: string,
  service: Service,
  outcome: SendOutcome,
): Promise<void> => {
  const told = `told:${profileId}:${service}`;

  if (outcome.kind === 'signedOut') {
    await forgetLink(valence, profileId, service);
  } else if (outcome.kind === 'sent') {
    if ((await valence.storage.get(told)) !== null) {
      await valence.storage.delete(told);
    }
  } else if (outcome.kind === 'refused') {
    valence.log.warn('A scrobble was refused', { service, reason: outcome.reason.slice(0, 400) });

    if (outcome.isTheirs && (await valence.storage.get(told)) !== outcome.reason) {
      const name = SERVICE_NAMES[service];

      await valence.storage.set(told, outcome.reason);
      await valence.notifications.send(profileId, {
        title: `${name} isn't taking your scrobbles`,
        body: `${name} said: ${outcome.reason}`,
      });
    }
  }
};

export { actOnOutcome };
