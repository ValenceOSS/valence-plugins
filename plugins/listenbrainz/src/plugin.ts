import { definePlugin } from '@ValenceSDK/host/definePlugin';
import { actOnListening } from './actOnListening';
import { forgetProfile } from './forgetProfile';
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
    if (event.topic === 'profile.removed' && event.profileId !== null) {
      await forgetProfile(valence, event.profileId);
    } else {
      await scrobble(valence, event);
    }
  },
});
