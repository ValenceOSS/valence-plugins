type Quality = 'lossless' | 'high' | 'normal' | 'low';

/**
 * The quality to serve a song at for the most bits a second a Subsonic app asked for.
 *
 * @param maxBitRate - The most it asked for in kbps, or nothing or 0 for no limit.
 * @param format - The format it asked for, where `raw` means the file as it is and any other means
 *   one it can play, rather than the original.
 * @returns The quality.
 */
const qualityFor = (maxBitRate: number | null, format: string | null): Quality => {
  if (format === 'raw') {
    return 'lossless';
  }

  if (maxBitRate === null || maxBitRate <= 0) {
    return format === null ? 'lossless' : 'high';
  }

  if (maxBitRate >= 320) {
    return 'high';
  }

  return maxBitRate >= 160 ? 'normal' : 'low';
};

export { qualityFor };
