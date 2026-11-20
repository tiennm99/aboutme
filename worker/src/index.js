/**
 * Serves the profile (a static asset in `public/`) and records anonymous
 * counts. A count holds the site's hostname, the event and, for clicks, the
 * link id: no IP, no cookie, no visitor id.
 */

import { Hono } from 'hono';
import profile from '../public/profile.json';

export const EVENTS = ['open', 'click', 'dismiss'];
const LINK_IDS = new Set(profile.links.map((link) => link.id));
const MAX_BODY = 256;

/**
 * Reads the site hostname from the Origin header the browser sets.
 * @param {string | undefined} origin Origin header.
 * @returns {string | null} Hostname, or null when missing or not http(s).
 */
function siteOf(origin) {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.hostname.slice(0, 253) : null;
  } catch {
    return null;
  }
}

/**
 * Checks a count body against the allowed events and link ids.
 * @param {string} body Raw request body.
 * @returns {{ event: string, target: string } | null} The count, or null when invalid.
 */
export function parseCount(body) {
  if (body.length > MAX_BODY) return null;
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  if (!data || !EVENTS.includes(data.event)) return null;
  if (data.event === 'click') {
    return LINK_IDS.has(data.target) ? { event: 'click', target: data.target } : null;
  }
  return { event: data.event, target: '' };
}

const app = new Hono();

app.post('/e', async (c) => {
  // Counts come from any site; nothing private is returned.
  c.header('Access-Control-Allow-Origin', '*');
  const site = siteOf(c.req.header('origin'));
  const count = parseCount(await c.req.text());
  if (!site || !count) return c.body(null, 400);
  c.env.EVENTS?.writeDataPoint({
    indexes: [site],
    blobs: [site, count.event, count.target],
    doubles: [1],
  });
  return c.body(null, 204);
});

app.notFound((c) => c.text('Not found', 404));

export default app;
