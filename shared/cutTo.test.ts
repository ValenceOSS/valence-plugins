import { cutTo } from './cutTo';

describe('cutTo', () => {
  it('leaves text that fits, and cuts text that does not with an ellipsis', () => {
    expect(cutTo('Running', 10)).toBe('Running');
    expect(cutTo('Running late again', 10)).toBe('Running l…');
    expect(cutTo('Running   late', 10)).toBe('Running…');
    expect(cutTo('Running late again', 10).length).toBeLessThanOrEqual(10);
  });
});
