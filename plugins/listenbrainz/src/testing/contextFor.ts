import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';

/**
 * The page's context for one viewer, for tests.
 *
 * @param valence - The host.
 * @param profileId - Who is looking.
 * @returns The context.
 */
const contextFor = (valence: ValenceHost, profileId = 'p1'): SurfaceContext => ({
  valence,
  viewer: { profileId, isAdmin: false, nodes: [] },
  subject: null,
});

export { contextFor };
