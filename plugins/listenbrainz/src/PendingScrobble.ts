import { z } from 'zod';
import { ListenSchema } from './Listen';

const PendingScrobbleSchema = z.object({
  service: z.enum(['listenbrainz', 'lastfm']),
  listen: ListenSchema,
});

const PendingScrobblesSchema = z.array(PendingScrobbleSchema);

type PendingScrobble = z.infer<typeof PendingScrobbleSchema>;

type PendingScrobbles = z.infer<typeof PendingScrobblesSchema>;

export type { PendingScrobble, PendingScrobbles };

export { PendingScrobbleSchema, PendingScrobblesSchema };
