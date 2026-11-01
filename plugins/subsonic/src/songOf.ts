import type { MediaDetails } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';
import { fileTypeOf } from './fileTypeOf';

/**
 * One part of a song's path, with nothing in it that would read as another folder.
 *
 * @param part - An artist, album or title.
 * @returns It, fit for a path.
 */
const pathPart = (part: string | null): string =>
  (part ?? '').replace(/[/\\]/gu, '_').trim() || '_';

/**
 * A track as a Subsonic app expects a song: its album, artist, numbers, file and cover, and a path
 * made from its artist, album and title, since apps name the files they keep by it and Valence
 * never tells anybody where a file really is.
 *
 * @param track - The track's details.
 * @returns The song.
 */
const songOf = (track: MediaDetails): SubsonicBody => {
  const type = track.file === null ? null : fileTypeOf(track.file.container);

  return {
    id: track.id,
    parent: track.albumId,
    isDir: false,
    title: track.title,
    album: track.album,
    artist: track.artist,
    track: track.trackNumber,
    discNumber: track.discNumber,
    year: track.year,
    genre: track.genres[0] ?? null,
    coverArt: track.albumId,
    size: track.file?.sizeBytes ?? null,
    contentType: type?.contentType ?? null,
    suffix: type?.suffix ?? null,
    path:
      type === null
        ? null
        : `${pathPart(track.artist)}/${pathPart(track.album)}/${pathPart(track.title)}.${type.suffix}`,
    duration: track.durationSeconds === null ? null : Math.round(track.durationSeconds),
    bitRate: track.file?.bitrateKbps ?? null,
    albumId: track.albumId,
    artistId: track.artistId,
    type: 'music',
    mediaType: 'song',
    created: track.addedAt,
  };
};

export { songOf };
