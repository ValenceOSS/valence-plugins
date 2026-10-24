import { z } from 'zod';
import { jsonOf } from './jsonOf';

describe('jsonOf', () => {
  it('reads JSON of the right shape, and nothing else', () => {
    const Shape = z.object({ valid: z.boolean() });

    expect(jsonOf('{"valid":true}', Shape)).toEqual({ valid: true });
    expect(jsonOf('{"valid":"yes"}', Shape)).toBeNull();
    expect(jsonOf('<html>', Shape)).toBeNull();
  });
});
