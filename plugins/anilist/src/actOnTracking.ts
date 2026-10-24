import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { SurfaceActRequest } from '@ValenceSDK/surface/SurfaceActRequestSchema';
import type { Surface } from '@ValenceSDK/surface/SurfaceSchema';
import { continueImport } from './continueImport';
import { IMPORTING } from './IMPORTING';
import { preferencesKeyFor } from './preferencesKeyFor';
import { readImportJob } from './readImportJob';
import { renderTracking } from './renderTracking';
import { startImport } from './startImport';

/**
 * Does what somebody pressed on the tracking page, then shows it again. Connecting and
 * disconnecting a list are Valence's own actions, handled before the plugin is asked.
 *
 * @param context - The host and who pressed it.
 * @param request - What they pressed, and the page's fields.
 * @param now - The time now.
 * @returns The page as it now stands.
 */
const actOnTracking = async (
  context: SurfaceContext,
  request: SurfaceActRequest,
  now: Date = new Date(),
): Promise<Surface> => {
  const { valence, viewer } = context;
  if (request.action.id === 'save') {
    await valence.storage.set(preferencesKeyFor(viewer.profileId), {
      twoWay: request.fields['twoWay'] === true,
    });
  } else if (request.action.id === 'import' && !IMPORTING.has(viewer.profileId)) {
    const running = await readImportJob(valence, viewer.profileId);

    if (running === null || running.finishedAt !== null) {
      await startImport(valence, viewer.profileId, now);
    }

    await continueImport(valence, viewer.profileId, now);
  } else if (request.action.id === 'continue') {
    await continueImport(valence, viewer.profileId, now);
  }

  return renderTracking(context);
};

export { actOnTracking };
