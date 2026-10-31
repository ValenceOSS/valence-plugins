import { subsonicAnswer } from './subsonicAnswer';

describe('subsonicAnswer', () => {
  it('answers ok in JSON, with what it holds', () => {
    const answer = subsonicAnswer('json', { license: { valid: true } });

    expect(answer.contentType).toBe('application/json');
    expect(JSON.parse(answer.body)).toEqual({
      'subsonic-response': {
        status: 'ok',
        version: '1.16.1',
        type: 'valence',
        serverVersion: '1.0.0',
        openSubsonic: true,
        license: { valid: true },
      },
    });
  });

  it('answers a failure in XML, with its code', () => {
    const answer = subsonicAnswer('xml', {}, { code: 70, message: 'Not found' });

    expect(answer.contentType).toBe('application/xml');
    expect(answer.body).toBe(
      '<?xml version="1.0" encoding="UTF-8"?><subsonic-response xmlns="http://subsonic.org/restapi" status="failed" version="1.16.1" type="valence" serverVersion="1.0.0" openSubsonic="true"><error code="70" message="Not found"/></subsonic-response>',
    );
  });

  it('leaves out what isn’t known rather than saying null in JSON', () => {
    const answer = subsonicAnswer('json', { song: { id: 's1', year: null, genre: null } });

    expect(JSON.parse(answer.body)['subsonic-response'].song).toEqual({ id: 's1' });
  });
});
