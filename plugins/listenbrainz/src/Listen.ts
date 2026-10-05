import { z } from 'zod';

const ListenSchema = z.object({
  title: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  startedAt: z.number(),
});

/** A song somebody played, with the time it started as Unix seconds, as both services want it. */
type Listen = z.infer<typeof ListenSchema>;

export type { Listen };

export { ListenSchema };
