import type { SourceTrack } from './SourceTrack';

/**
 * A playlist as a service has it now, with what tells one week's from the next: ListenBrainz's
 * playlist id, or a digest of the songs for one that changes in place.
 */
type SourcePlaylist = { version: string; tracks: SourceTrack[] };

export type { SourcePlaylist };
