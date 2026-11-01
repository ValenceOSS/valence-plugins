import { folderOf } from './folderOf';

describe('folderOf', () => {
  it('gives an album as a folder under its artist, titled', () => {
    expect(
      folderOf({ id: 'al1', name: 'First Album', artist: 'The Band', artistId: 'ar1', year: 2001 }),
    ).toMatchObject({
      id: 'al1',
      parent: 'ar1',
      isDir: true,
      title: 'First Album',
      album: 'First Album',
      artist: 'The Band',
      year: 2001,
    });
  });
});
