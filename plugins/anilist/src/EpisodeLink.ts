import { z } from 'zod';

const EpisodeLinkSchema = z.object({
  anilistId: z.string().nullable(),
  malId: z.string().nullable(),
  number: z.number(),
  episodes: z.number().nullable(),
});

type EpisodeLink = z.infer<typeof EpisodeLinkSchema>;

export type { EpisodeLink };

export { EpisodeLinkSchema };
