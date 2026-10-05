import { z } from 'zod';

const PendingRequestSchema = z.object({ playlistId: z.string(), name: z.string() });

/** A kept playlist whose missing songs' albums are still to be requested, and what to call it. */
type PendingRequest = z.infer<typeof PendingRequestSchema>;

export type { PendingRequest };

export { PendingRequestSchema };
