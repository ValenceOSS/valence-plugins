type FileType = { suffix: string; contentType: string };

const MP4: FileType = { suffix: 'm4a', contentType: 'audio/mp4' };

const MATROSKA: FileType = { suffix: 'mka', contentType: 'audio/x-matroska' };

const FILE_TYPES: Readonly<Record<string, FileType>> = {
  mpeg: { suffix: 'mp3', contentType: 'audio/mpeg' },
  mp3: { suffix: 'mp3', contentType: 'audio/mpeg' },
  flac: { suffix: 'flac', contentType: 'audio/flac' },
  m4a: MP4,
  m4b: MP4,
  mp4: MP4,
  isom: MP4,
  iso2: MP4,
  mp41: MP4,
  mp42: MP4,
  alac: MP4,
  aac: { suffix: 'aac', contentType: 'audio/aac' },
  wave: { suffix: 'wav', contentType: 'audio/wav' },
  wav: { suffix: 'wav', contentType: 'audio/wav' },
  ogg: { suffix: 'ogg', contentType: 'audio/ogg' },
  oga: { suffix: 'ogg', contentType: 'audio/ogg' },
  opus: { suffix: 'opus', contentType: 'audio/ogg' },
  aiff: { suffix: 'aiff', contentType: 'audio/aiff' },
  'aiff-c': { suffix: 'aiff', contentType: 'audio/aiff' },
  asf: { suffix: 'wma', contentType: 'audio/x-ms-wma' },
  wma: { suffix: 'wma', contentType: 'audio/x-ms-wma' },
  "monkey's audio": { suffix: 'ape', contentType: 'audio/ape' },
  ape: { suffix: 'ape', contentType: 'audio/ape' },
  wavpack: { suffix: 'wv', contentType: 'audio/x-wavpack' },
  wv: { suffix: 'wv', contentType: 'audio/x-wavpack' },
  dsf: { suffix: 'dsf', contentType: 'audio/dsf' },
  dsdiff: { suffix: 'dff', contentType: 'audio/dff' },
  webm: { suffix: 'webm', contentType: 'audio/webm' },
  matroska: MATROSKA,
  mka: MATROSKA,
};

/**
 * The file name ending and content type a Subsonic app is told a song's file has, from the
 * container Valence read from it, which for MP4 is a list of brands such as `m4a/isom/iso2`.
 *
 * @param container - The file's container, as Valence names it.
 * @returns Its ending and content type.
 */
const fileTypeOf = (container: string): FileType => {
  const brands = container
    .toLowerCase()
    .split('/')
    .map((brand) => brand.trim());

  for (const brand of brands) {
    const known = FILE_TYPES[brand];

    if (known !== undefined) {
      return known;
    }
  }

  return {
    suffix: /^[a-z0-9]{1,8}$/u.test(brands[0] ?? '') ? (brands[0] ?? 'bin') : 'bin',
    contentType: 'application/octet-stream',
  };
};

export type { FileType };

export { fileTypeOf };
