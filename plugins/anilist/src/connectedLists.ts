import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { Provider } from './Provider';
import { PROVIDERS } from './PROVIDERS';

/**
 * The lists somebody has connected, with a token for each. A list whose connection Valence couldn't
 * renew just now is still connected, but has no token this time, so one service being down doesn't
 * stop the others or look like the person disconnected it.
 *
 * @param valence - The host.
 * @param profileId - Whose lists.
 * @returns Each connected service, and its token where there is one just now.
 */
const connectedLists = async (
  valence: ValenceHost,
  profileId: string,
): Promise<{ provider: Provider; token: string | null; account: string | null }[]> => {
  const found = await Promise.all(
    PROVIDERS.map(async ({ id }) => {
      try {
        const connection = await valence.accounts.connection(profileId, id);

        return connection === null
          ? []
          : [{ provider: id, token: connection.accessToken, account: connection.account }];
      } catch (failure) {
        valence.log.warn('Could not renew a list’s connection just now', {
          profile: profileId,
          provider: id,
          problem: failure instanceof Error ? failure.message : 'unknown',
        });

        return [{ provider: id, token: null, account: null }];
      }
    }),
  );

  return found.flat();
};

export { connectedLists };
