import { qualityFor } from './qualityFor';

describe('qualityFor', () => {
  it('serves the file as it is with no limit or a raw format, and less for a lower limit', () => {
    expect(qualityFor(null, null)).toBe('lossless');
    expect(qualityFor(0, null)).toBe('lossless');
    expect(qualityFor(128, 'raw')).toBe('lossless');
    expect(qualityFor(320, null)).toBe('high');
    expect(qualityFor(192, null)).toBe('normal');
    expect(qualityFor(96, null)).toBe('low');
  });

  it('serves something an app can play when it names a format without a limit', () => {
    expect(qualityFor(null, 'mp3')).toBe('high');
    expect(qualityFor(null, 'raw')).toBe('lossless');
  });
});
