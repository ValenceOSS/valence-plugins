import { formBody } from './formBody';

describe('formBody', () => {
  it('encodes fields for a form post', () => {
    expect(formBody({ grant_type: 'client_credentials', note: 'a b&c' })).toBe(
      'grant_type=client_credentials&note=a+b%26c',
    );
  });
});
