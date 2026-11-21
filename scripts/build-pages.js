/**
 * Builds the GitHub Pages site for the simple setup into `_site/`: the widget
 * script, the profile without a count endpoint (Pages has no Worker to
 * receive counts) and the demo page in `pages/index.html`, which loads both.
 *
 * The profile comes from the `ABOUTME_PROFILE` environment variable when it is
 * set (the Pages workflow fills it from the repository variable of that name),
 * otherwise from `worker/public/profile.json`. Keeping a fork's profile in the
 * variable leaves the file untouched, so syncing the fork never conflicts.
 * The build fails with a clear message when the profile cannot be shown.
 *
 * Run `npm run build` first so `widget/dist/aboutme.js` exists.
 */

import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { validateProfile } from '../widget/src/core.js';

const PROFILE_FILE = 'worker/public/profile.json';

/**
 * Stops the build with a message GitHub Actions shows as an error.
 * @param {string} message What is wrong and how to fix it.
 */
function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

const fromVariable = Boolean(process.env.ABOUTME_PROFILE?.trim());
const source = fromVariable ? 'the ABOUTME_PROFILE variable' : PROFILE_FILE;
const raw = fromVariable ? process.env.ABOUTME_PROFILE : readFileSync(PROFILE_FILE, 'utf8');

let profile;
try {
  profile = JSON.parse(raw);
} catch (error) {
  fail(`The profile in ${source} is not valid JSON: ${error.message}. Check for a missing or extra comma or quote.`);
}

const checked = validateProfile(profile, 'https://example.com/');
if (!checked) {
  fail(
    `The profile in ${source} cannot be shown. It needs "schemaVersion": 1, a "name", ` +
      'and at least one link with an "id", a "label" and an https:, http: or mailto: "url".',
  );
}
const inputLinks = Array.isArray(profile.links) ? profile.links.length : 0;
if (checked.links.length < inputLinks) {
  const kept = new Set(checked.links.map((link) => link.id));
  const dropped = profile.links.filter((link) => !kept.has(link?.id)).map((link) => link?.id ?? '(no id)');
  fail(
    `These links in ${source} would not show: ${dropped.join(', ')}. Each needs a unique "id" ` +
      '(lowercase letters, digits or -, up to 32 characters), a "label" and an https:, http: or mailto: "url"; at most 12 links.',
  );
}
console.log(`Profile from ${source}: ${checked.name}, ${checked.links.length} links.`);

const out = '_site';
rmSync(out, { recursive: true, force: true });
mkdirSync(out);

copyFileSync('widget/dist/aboutme.js', `${out}/aboutme.js`);

delete profile.events;
writeFileSync(`${out}/profile.json`, `${JSON.stringify(profile, null, 2)}\n`);

copyFileSync('pages/index.html', `${out}/index.html`);
