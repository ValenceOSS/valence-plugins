import { z } from 'zod';
import { readJsonAs } from './readJsonAs';

const Schema = z.object({ id: z.number() });

describe('readJsonAs', () => {
  it('reads an answer that matches', () => {
    expect(readJsonAs({ status: 200, text: '{"id":1}' }, Schema, 'AniList')).toEqual({ id: 1 });
  });

  it('refuses a failed answer, naming the service', () => {
    expect(() => readJsonAs({ status: 429, text: '' }, Schema, 'AniList')).toThrow(
      'AniList answered 429',
    );
  });

  it('refuses an answer that is not what it should be', () => {
    expect(() => readJsonAs({ status: 200, text: '{"id":"x"}' }, Schema, 'AniList')).toThrow(
      'AniList sent something unexpected',
    );
  });
});
