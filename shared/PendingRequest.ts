import { z } from 'zod';

const PendingRequestSchema = z.object({ playlistId: z.string(), name: z.string() });

type PendingRequest = z.infer<typeof PendingRequestSchema>;

export type { PendingRequest };

export { PendingRequestSchema };
