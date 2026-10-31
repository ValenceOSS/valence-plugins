import { fileTypeOf } from './fileTypeOf';

describe('fileTypeOf', () => {
  it('names the file type from the container Valence read, MP4 brands included', () => {
    expect(fileTypeOf('mpeg')).toEqual({ suffix: 'mp3', contentType: 'audio/mpeg' });
    expect(fileTypeOf('flac')).toEqual({ suffix: 'flac', contentType: 'audio/flac' });
    expect(fileTypeOf('m4a/isom/iso2')).toEqual({ suffix: 'm4a', contentType: 'audio/mp4' });
    expect(fileTypeOf('isom/iso2/mp41')).toEqual({ suffix: 'm4a', contentType: 'audio/mp4' });
    expect(fileTypeOf('wave')).toEqual({ suffix: 'wav', contentType: 'audio/wav' });
    expect(fileTypeOf('ebml/webm')).toEqual({ suffix: 'webm', contentType: 'audio/webm' });
  });

  it('keeps an unknown ending only where it is a plain one', () => {
    expect(fileTypeOf('xyz')).toEqual({ suffix: 'xyz', contentType: 'application/octet-stream' });
    expect(fileTypeOf('musepack, sv7')).toEqual({
      suffix: 'bin',
      contentType: 'application/octet-stream',
    });
  });
});
