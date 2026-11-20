import Ajv from 'ajv/dist/2020.js';
import { describe, expect, it, vi } from 'vitest';
import schema from '../../widget/profile.schema.json';
import profile from '../public/profile.json';
import app, { parseCount } from '../src/index.js';

function post(body, origin = 'https://blog.example.com') {
  const writeDataPoint = vi.fn();
  const headers = { 'content-type': 'text/plain' };
  if (origin) headers.origin = origin;
  const response = app.request('/e', { method: 'POST', headers, body }, { EVENTS: { writeDataPoint } });
  return { response, writeDataPoint };
}

describe('profile.json', () => {
  it('matches the widget schema', () => {
    const validate = new Ajv({ strict: false }).compile(schema);
    expect(validate(profile), JSON.stringify(validate.errors)).toBe(true);
  });
});

describe('parseCount', () => {
  const linkId = profile.links[0].id;

  it('accepts known events and link ids', () => {
    expect(parseCount('{"event":"open"}')).toEqual({ event: 'open', target: '' });
    expect(parseCount('{"event":"dismiss"}')).toEqual({ event: 'dismiss', target: '' });
    expect(parseCount(JSON.stringify({ event: 'click', target: linkId }))).toEqual({ event: 'click', target: linkId });
  });

  it('rejects unknown events, unknown link ids, bad JSON and large bodies', () => {
    expect(parseCount('{"event":"hack"}')).toBeNull();
    expect(parseCount('{"event":"click","target":"not-a-link"}')).toBeNull();
    expect(parseCount('not json')).toBeNull();
    expect(parseCount(JSON.stringify({ event: 'open', pad: 'x'.repeat(300) }))).toBeNull();
  });
});

describe('POST /e', () => {
  it('writes one data point keyed by the Origin hostname', async () => {
    const { response, writeDataPoint } = post('{"event":"open"}');
    expect((await response).status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalledWith({
      indexes: ['blog.example.com'],
      blobs: ['blog.example.com', 'open', ''],
      doubles: [1],
    });
  });

  it('rejects requests without an Origin or with an invalid body', async () => {
    const noOrigin = post('{"event":"open"}', null);
    expect((await noOrigin.response).status).toBe(400);
    const bad = post('{"event":"hack"}');
    expect((await bad.response).status).toBe(400);
    expect(noOrigin.writeDataPoint).not.toHaveBeenCalled();
    expect(bad.writeDataPoint).not.toHaveBeenCalled();
  });
});
