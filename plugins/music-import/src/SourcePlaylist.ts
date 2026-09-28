import type { ImportedTrack } from './ImportedTrack';

type SourcePlaylist = {
  source: 'spotify' | 'apple';
  id: string;
  name: string;
  tracks: ImportedTrack[];
};

export type { SourcePlaylist };
