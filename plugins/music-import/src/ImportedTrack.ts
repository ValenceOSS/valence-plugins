import { z } from 'zod';

const ImportedTrackSchema = z.object({
  title: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  isrc: z.string().nullable(),
});

type ImportedTrack = z.infer<typeof ImportedTrackSchema>;

export type { ImportedTrack };

export { ImportedTrackSchema };
