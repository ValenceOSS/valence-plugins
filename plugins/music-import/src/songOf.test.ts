import { songOf } from './songOf';

describe('songOf', () => {
  it('trims a song, names an unnamed artist, and drops what the host would refuse', () => {
    expect(songOf({ title: '  Banquet ', artist: ' ', album: ' ', isrc: 'GB'.repeat(11) })).toEqual(
      { title: 'Banquet', artist: 'Unknown artist', album: null, isrc: null },
    );
    expect(songOf({ title: ' ', artist: 'Bloc Party', album: null, isrc: null })).toBeNull();
    expect(
      songOf({ title: 'x'.repeat(400), artist: 'Bloc Party', album: 'y'.repeat(301), isrc: 'GB1' }),
    ).toMatchObject({ isrc: 'GB1' });
    expect(
      songOf({ title: 'x'.repeat(400), artist: 'Bloc Party', album: null, isrc: null })?.title,
    ).toHaveLength(300);
  });
});
