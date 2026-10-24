import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { dropLink } from './dropLink';
import type { Service } from './Service';
import { SERVICE_NAMES } from './SERVICE_NAMES';

/**
 * Disconnects a service the plugin can no longer act on, because its token or session was
 * refused, and tells the person, since their scrobbles stop.
 *
 * @param valence - The host.
 * @param profileId - Whose connection.
 * @param service - Which service.
 */
const forgetLink = async (
  valence: ValenceHost,
  profileId: string,
  service: Service,
): Promise<void> => {
  const name = SERVICE_NAMES[service];

  await dropLink(valence, profileId, service);
  await valence.notifications.send(profileId, {
    title: `${name} disconnected`,
    body: `${name} refused Valence's sign-in, so scrobbling to it has stopped. Connect it again from Account → ListenBrainz and Last.fm.`,
  });
};

export { forgetLink };
