import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { Provider } from './Provider';
import { PROVIDERS } from './PROVIDERS';

/**
 * The lists somebody has connected, with a token for each.
 *
 * @param valence - The host.
 * @param profileId - Whose lists.
 * @returns Each connected service and its token.
 */
const connectedLists = async (
  valence: ValenceHost,
  profileId: string,
): Promise<{ provider: Provider; token: string; account: string | null }[]> => {
  const found = await Promise.all(
    PROVIDERS.map(async ({ id }) => {
      const connection = await valence.accounts.connection(profileId, id);

      return connection === null
        ? []
        : [{ provider: id, token: connection.accessToken, account: connection.account }];
    }),
  );

  return found.flat();
};

export { connectedLists };
