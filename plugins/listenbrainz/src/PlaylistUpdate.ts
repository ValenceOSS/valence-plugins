import { z } from 'zod';
import { PlaylistItemSchema } from './PlaylistItem';
import { SourceTrackSchema } from './SourceTrack';

const PlaylistUpdateSchema = z.object({
  version: z.string(),
  tracks: z.array(SourceTrackSchema),
  next: z.number(),
  items: z.array(PlaylistItemSchema),
});

/** A new version of a service's playlist being matched to the library, a few songs a run. */
type PlaylistUpdate = z.infer<typeof PlaylistUpdateSchema>;

export type { PlaylistUpdate };

export { PlaylistUpdateSchema };
