import { lastfmSignatureOf } from './lastfmSignatureOf';

describe('lastfmSignatureOf', () => {
  it('signs as Last.fm documents: parameters in order, name then value, then the secret', () => {
    expect(
      lastfmSignatureOf(
        { token: 'yyyyyy', method: 'auth.getSession', api_key: 'xxxxxxxxxx' },
        'ilovecher',
      ),
    ).toBe('b87d61da3cda91a8b6746c4aef55d6f8');
  });
});
