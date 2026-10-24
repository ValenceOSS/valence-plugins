import { PlainTextSchema } from '@ValenceSDK/surface/PlainTextSchema';
import { shownAs } from './shownAs';

describe('shownAs', () => {
  it('drops the characters the host refuses and cuts to the limit', () => {
    const shown = shownAs(`Mix‮\u0007 for the road ${'x'.repeat(200)}`, 120);

    expect(shown.startsWith('Mix for the road')).toBe(true);
    expect(shown).toHaveLength(120);
    expect(PlainTextSchema(120).safeParse(shown).success).toBe(true);
    expect(shownAs('Tab\tand\nline', 20)).toBe('Tab\tand\nline');
  });
});
