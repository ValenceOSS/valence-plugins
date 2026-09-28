import { definePlugin } from '@ValenceSDK/host/definePlugin';
import { actOnTracking } from './actOnTracking';
import { pushProgress } from './pushProgress';
import { renderSeriesPanel } from './renderSeriesPanel';
import { renderTracking } from './renderTracking';
import { syncEveryone } from './syncEveryone';

definePlugin({
  pages: {
    tracking: {
      render: renderTracking,
      act: (context, request) => actOnTracking(context, request),
    },
  },
  panels: {
    anime: { render: renderSeriesPanel },
  },
  schedules: {
    sync: async ({ valence }) => {
      await syncEveryone(valence);
    },
  },
  events: async (event, { valence }) => {
    await pushProgress(valence, event);
  },
  onAccountConnected: async ({ valence }, { profileId }) => {
    await valence.notifications.send(profileId, {
      title: 'Anime list connected',
      body: 'Import your list from the Anime tracking page whenever you are ready.',
    });
  },
});
