import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Every request is served from memory, so no web server is needed.
const SITE = 'https://site.test';
const DATA = 'https://data.test';
const bundle = readFileSync(new URL('../dist/aboutme.js', import.meta.url), 'utf8');
const profile = {
  schemaVersion: 1,
  name: 'Jane Doe',
  tagline: 'Builds things',
  events: '/e',
  links: [
    { id: 'home', label: 'Homepage', url: 'https://example.com', icon: 'home' },
    { id: 'github', label: 'GitHub', url: 'https://github.com/example', icon: 'github' },
  ],
};

async function setup(page, { hide = '1d' } = {}) {
  const events = [];
  const origins = [];
  await page.route(`${SITE}/`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      // no-referrer is the strictest policy for the Origin header the Worker relies on.
      body: `<!doctype html><meta name="viewport" content="width=device-width"><meta name="referrer" content="no-referrer">
        <h1>Host page</h1>
        <script src="${DATA}/aboutme.js" data-profile="${DATA}/profile.json" data-hide="${hide}" defer></script>`,
    }),
  );
  await page.route(`${DATA}/aboutme.js`, (route) => route.fulfill({ contentType: 'text/javascript', body: bundle }));
  await page.route(`${DATA}/profile.json`, (route) =>
    route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(profile) }),
  );
  await page.route(`${DATA}/e`, (route) => {
    events.push(JSON.parse(route.request().postData()));
    origins.push(route.request().headers().origin);
    route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
  });
  await page.route('https://example.com/**', (route) => route.fulfill({ body: 'ok' }));
  await page.goto(`${SITE}/`);
  return { events, origins };
}

const bubble = (page) => page.getByRole('button', { name: 'About Jane Doe' });

// Drags with touch on touch devices (as a phone would) and with the mouse otherwise.
async function drag(page, hasTouch, from, to, steps) {
  if (!hasTouch) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps });
    await page.mouse.up();
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', from.x, from.y);
  for (let i = 1; i <= steps; i++) {
    await touch('touchMove', from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
  }
  await touch('touchEnd');
}

test('opens the panel and counts the open and link clicks', async ({ page }) => {
  const { events, origins } = await setup(page);
  await bubble(page).click();
  await expect(page.getByRole('dialog', { name: 'About Jane Doe' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/example');

  const popup = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Homepage' }).click();
  await (await popup).close();
  await expect.poll(() => events).toEqual([{ event: 'open' }, { event: 'click', target: 'home' }]);
  expect(origins).toEqual([SITE, SITE]);
});

test('closes the panel with Escape and with an outside click', async ({ page }) => {
  await setup(page);
  const dialog = page.getByRole('dialog');
  await bubble(page).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await bubble(page).click();
  await page.getByRole('heading', { name: 'Host page' }).click();
  await expect(dialog).toBeHidden();
});

test('dragging elsewhere snaps the bubble to a side without dismissing', async ({ page, hasTouch }) => {
  await setup(page);
  const start = await bubble(page).boundingBox();
  const viewport = page.viewportSize();
  await drag(page, hasTouch, { x: start.x + 20, y: start.y + 20 }, { x: 60, y: 120 }, 8);
  const end = await bubble(page).boundingBox();
  expect(end.x).toBeLessThan(viewport.width / 2);
  expect(end.x).toBeGreaterThanOrEqual(0);
  await expect(bubble(page)).toBeVisible();

  // The next tap after a drag still opens the panel.
  if (hasTouch) await bubble(page).tap();
  else await bubble(page).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('dropping on the bottom target dismisses for the configured period', async ({ page, hasTouch }) => {
  const { events } = await setup(page, { hide: '1d' });
  const start = await bubble(page).boundingBox();
  const viewport = page.viewportSize();
  await drag(page, hasTouch, { x: start.x + 20, y: start.y + 20 }, { x: viewport.width / 2, y: viewport.height - 64 }, 12);
  await expect(bubble(page)).toHaveCount(0);
  await expect.poll(() => events).toEqual([{ event: 'dismiss' }]);

  const until = Number(await page.evaluate(() => localStorage.getItem('aboutme:hiddenUntil')));
  expect(until - Date.now()).toBeGreaterThan(86_400_000 - 60_000);
  expect(until - Date.now()).toBeLessThanOrEqual(86_400_000);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(bubble(page)).toHaveCount(0);
});

test('the hide button dismisses too', async ({ page }) => {
  await setup(page, { hide: '2w' });
  await bubble(page).click();
  await page.getByRole('button', { name: 'Hide for 2 weeks' }).click();
  await expect(bubble(page)).toHaveCount(0);
});

test('the keyboard opens and closes the panel', async ({ page }) => {
  await setup(page);
  await bubble(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(bubble(page)).toBeFocused();
});
