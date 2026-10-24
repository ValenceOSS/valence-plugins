import { isScrobbled } from './isScrobbled';

const song = (durationSeconds: number | null) => ({
  title: 't',
  artist: 'a',
  album: null,
  durationSeconds,
  startedAt: 0,
});

describe('isScrobbled', () => {
  it('counts half a song, or four minutes of a long one', () => {
    expect(isScrobbled(song(200), 99)).toBe(false);
    expect(isScrobbled(song(200), 100)).toBe(true);
    expect(isScrobbled(song(900), 239)).toBe(false);
    expect(isScrobbled(song(900), 240)).toBe(true);
  });

  it('counts a short song played half way, and waits four minutes for one of unknown length', () => {
    expect(isScrobbled(song(12), 6)).toBe(true);
    expect(isScrobbled(song(null), 200)).toBe(false);
    expect(isScrobbled(song(null), 240)).toBe(true);
  });
});
