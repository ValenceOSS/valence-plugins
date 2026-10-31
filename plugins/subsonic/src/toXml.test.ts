import { toXml } from './toXml';

describe('toXml', () => {
  it('writes values as attributes, objects as elements and lists as repeated elements', () => {
    expect(
      toXml('artists', {
        ignoredArticles: 'The',
        index: [
          { name: 'A', artist: [{ id: 'a1', name: 'A & B "C"' }] },
          { name: 'B', artist: [] },
        ],
      }),
    ).toBe(
      '<artists ignoredArticles="The"><index name="A"><artist id="a1" name="A &amp; B &quot;C&quot;"/></index><index name="B"/></artists>',
    );
  });

  it('writes an empty element for an empty object, and leaves out what is missing', () => {
    expect(toXml('ping', {})).toBe('<ping/>');
    expect(toXml('song', { id: 's1', year: null })).toBe('<song id="s1"/>');
  });

  it('leaves out characters XML may not hold, and keeps tabs and line breaks', () => {
    expect(toXml('song', { title: 'A\uFFFEB\uD800C\u0001D', comment: 'one\ttwo\nthree' })).toBe(
      '<song title="ABCD" comment="one&#9;two&#10;three"/>',
    );
  });
});
