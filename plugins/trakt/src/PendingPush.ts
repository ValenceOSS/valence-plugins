import { z } from 'zod';

const PendingPushSchema = z.object({ mediaId: z.string(), watchedAt: z.string() });

type PendingPush = z.infer<typeof PendingPushSchema>;

export type { PendingPush };

export { PendingPushSchema };
