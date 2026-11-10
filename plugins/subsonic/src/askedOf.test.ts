import type { RouteRequest } from '@ValenceSDK/host/PluginDefinition';
import { askedOf } from './askedOf';

const A_REQUEST: RouteRequest = {
  method: 'GET',
  path: 'rest/star',
  query: {},
  headers: {},
  body: '',
  receivedAt: '2026-11-10T12:00:00.000Z',
};

describe('askedOf', () => {
  it('reads every value of a parameter, from the query first and then a posted form', () => {
    const asked = askedOf({
      ...A_REQUEST,
      method: 'POST',
      query: { id: ['a', 'b'] },
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf-8' },
      body: 'id=c&name=Long+drive&title=%E2%9C%93&broken=%E0%A4%A',
    });

    expect(asked.texts('id')).toEqual(['a', 'b', 'c']);
    expect(asked.text('id')).toBe('a');
    expect(asked.text('name')).toBe('Long drive');
    expect(asked.text('title')).toBe('✓');
    expect(asked.text('broken')).toBe('%E0%A4%A');
    expect(asked.texts('missing')).toEqual([]);
    expect(asked.text('missing')).toBeNull();
  });

  it('ignores a body that isn’t a form', () => {
    expect(askedOf({ ...A_REQUEST, body: 'id=c' }).texts('id')).toEqual([]);
  });

  it('reads a whole number no bigger than the most allowed, or falls back', () => {
    const asked = askedOf({
      ...A_REQUEST,
      query: { size: ['40'], huge: ['9000'], negative: ['-1'], half: ['1.5'] },
    });

    expect(asked.number('size', 10, 500)).toBe(40);
    expect(asked.number('huge', 10, 500)).toBe(500);
    expect(asked.number('negative', 10, 500)).toBe(10);
    expect(asked.number('half', 10, 500)).toBe(10);
    expect(asked.number('missing', 10, 500)).toBe(10);
  });
});
