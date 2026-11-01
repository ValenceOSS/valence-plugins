import { definePlugin } from '@ValenceSDK/host/definePlugin';
import { answerSubsonic } from './answerSubsonic';

definePlugin({
  routes: {
    rest: (context, request) => answerSubsonic(context, request),
  },
});
