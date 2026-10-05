import { z } from 'zod';
import { ListenSchema } from './Listen';

const PendingScrobblesSchema = z.array(
  z.object({ service: z.enum(['listenbrainz', 'lastfm']), listen: ListenSchema }),
);

type PendingScrobbles = z.infer<typeof PendingScrobblesSchema>;

export type { PendingScrobbles };

export { PendingScrobblesSchema };
