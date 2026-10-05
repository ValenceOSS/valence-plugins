import { z } from 'zod';

const SourceTrackSchema = z.object({
  title: z.string(),
  artists: z.array(z.string()).min(1),
  artist: z.string().min(1),
  album: z.string().nullable(),
  releaseId: z.string().nullable(),
});

/**
 * A song on a service's playlist: its title, the artists it may be credited to in a library, the
 * whole credit first, the one artist a library credits it to first, its album, and the MusicBrainz
 * release it is on, where the service says.
 */
type SourceTrack = z.infer<typeof SourceTrackSchema>;

export type { SourceTrack };

export { SourceTrackSchema };
