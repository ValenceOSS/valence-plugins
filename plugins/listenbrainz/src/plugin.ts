import { definePlugin } from '@ValenceSDK/host/definePlugin';
import { actOnListening } from './actOnListening';
import { renderListening } from './renderListening';
import { scrobble } from './scrobble';
import { updateEveryone } from './updateEveryone';

definePlugin({
  pages: {
    listening: {
      render: (context) => renderListening(context),
      act: (context, request) => actOnListening(context, request),
    },
  },
  schedules: {
    update: async ({ valence }) => {
      await updateEveryone(valence);
    },
  },
  events: async (event, { valence }) => {
    await scrobble(valence, event);
  },
});
