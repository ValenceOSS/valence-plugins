import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { SurfaceActRequest } from '@ValenceSDK/surface/SurfaceActRequestSchema';
import type { Surface } from '@ValenceSDK/surface/SurfaceSchema';
import { continueHistoryJob } from './continueHistoryJob';
import { renderHistory } from './renderHistory';
import { startHistoryJob } from './startHistoryJob';

/**
 * Does what somebody pressed on the Trakt page, then shows it again, with a sentence where Trakt
 * could not be reached. Connecting and disconnecting are Valence's own actions, handled before
 * the plugin is asked.
 *
 * @param context - The host and who pressed it.
 * @param request - What they pressed, and the page's fields.
 * @param now - The time now.
 * @returns The page as it now stands.
 */
const actOnHistory = async (
  context: SurfaceContext,
  request: SurfaceActRequest,
  now: Date = new Date(),
): Promise<Surface> => {
  const { valence, viewer } = context;

  try {
    if (request.action.id === 'save') {
      await valence.storage.set(`preferences:${viewer.profileId}`, {
        twoWay: request.fields['twoWay'] === true,
      });
    } else if (request.action.id === 'import') {
      await startHistoryJob(valence, 'import', viewer.profileId, null, now);
      await continueHistoryJob(valence, 'import', viewer.profileId, now);
    } else if (request.action.id === 'continue') {
      await continueHistoryJob(valence, 'import', viewer.profileId, now);
    }
  } catch (failure) {
    valence.log.warn('Could not read a Trakt history', {
      problem: failure instanceof Error ? failure.message : 'unknown',
    });

    return renderHistory(
      context,
      'Trakt could not be reached. The import carries on by itself within the hour.',
    );
  }

  return renderHistory(context);
};

export { actOnHistory };
