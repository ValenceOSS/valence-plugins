import { definePlugin } from '@ValenceSDK/host/definePlugin';
import { actOnImport } from './actOnImport';
import { continueEveryone } from './continueEveryone';
import { renderImport } from './renderImport';

definePlugin({
  pages: {
    import: {
      render: (context) => renderImport(context),
      act: (context, request) => actOnImport(context, request),
    },
  },
  schedules: {
    continue: async ({ valence }) => {
      await continueEveryone(valence);
    },
  },
});
