import { definePlugin } from '@ValenceSDK/host/definePlugin';
import { actOnHistory } from './actOnHistory';
import { continueHistoryJob } from './continueHistoryJob';
import { pushWatch } from './pushWatch';
import { rememberAccount } from './rememberAccount';
import { renderHistory } from './renderHistory';
import { startHistoryJob } from './startHistoryJob';
import { syncEveryone } from './syncEveryone';

definePlugin({
  pages: {
    history: {
      render: (context) => renderHistory(context),
      act: (context, request) => actOnHistory(context, request),
    },
  },
  schedules: {
    sync: async ({ valence }) => {
      await syncEveryone(valence);
    },
  },
  events: async (event, { valence }) => {
    await pushWatch(valence, event);
  },
  onAccountConnected: async ({ valence }, { profileId }) => {
    const now = new Date();

    await startHistoryJob(valence, 'import', profileId, null, now);
    await rememberAccount(valence, profileId);
    await continueHistoryJob(valence, 'import', profileId, now);
  },
});
