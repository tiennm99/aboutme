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

async function setup(page, { hide = '1d', attrs = '', head = '', data = profile } = {}) {
  const events = [];
  const origins = [];
  await page.route(`${SITE}/`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      // no-referrer is the strictest policy for the Origin header the Worker relies on.
      body: `<!doctype html><meta name="viewport" content="width=device-width"><meta name="referrer" content="no-referrer">${head}
        <h1>Host page</h1>
        <script src="${DATA}/aboutme.js" data-profile="${DATA}/profile.json" data-hide="${hide}" ${attrs} defer></script>`,
    }),
  );
  await page.route(`${DATA}/aboutme.js`, (route) => route.fulfill({ contentType: 'text/javascript', body: bundle }));
  await page.route(`${DATA}/profile.json`, (route) =>
    route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) }),
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

const crowded = {
  ...profile,
  name: 'N'.repeat(60),
  tagline: 'Builds small tools, writes about the web, and keeps a long list of side projects that never quite get finished in time..',
  links: Array.from({ length: 12 }, (_, i) => ({ id: `l${i}`, label: `Link number ${i} with a long label here`, url: 'https://example.com', icon: 'link' })),
};
const crowdedBubble = (page) => page.getByRole('button', { name: /^About N+$/ });

async function openCrowded(page, size) {
  await page.setViewportSize(size);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page, { data: crowded });
  await crowdedBubble(page).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

const intersects = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const contains = (outer, inner) =>
  inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 && inner.x + inner.width <= outer.x + outer.width + 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;

// The panel stays inside the viewport, keeps Close and Hide inside it, and shows
// at least one whole link row.
async function expectPanelUsable(page) {
  const { width, height } = page.viewportSize();
  const dialog = page.getByRole('dialog');
  const box = await dialog.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.y + box.height).toBeLessThanOrEqual(height);
  const hideBox = await page.getByRole('button', { name: /^Hide for/ }).boundingBox();
  const closeBox = await page.getByRole('button', { name: 'Close' }).boundingBox();
  expect(contains(box, hideBox)).toBe(true);
  expect(contains(box, closeBox)).toBe(true);
  const listHeight = await dialog.locator('ul').evaluate((list) => list.clientHeight);
  expect(listHeight).toBeGreaterThanOrEqual(36);
  await page.getByRole('button', { name: 'Close' }).click({ trial: true });
  await page.getByRole('button', { name: /^Hide for/ }).click({ trial: true });
  return box;
}

// As above, and the panel and its Hide button stay clear of the bubble.
async function expectPanelFits(page) {
  const box = await expectPanelUsable(page);
  const ball = await crowdedBubble(page).boundingBox();
  expect(intersects(box, ball)).toBe(false);
  const hideBox = await page.getByRole('button', { name: /^Hide for/ }).boundingBox();
  expect(intersects(hideBox, ball)).toBe(false);
}

for (const size of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 640, height: 360 }]) {
  test(`a crowded panel fits a ${size.width}x${size.height} viewport`, async ({ page }) => {
    await openCrowded(page, size);
    await expectPanelFits(page);
  });
}

test('a crowded panel fits a short 640x280 viewport', async ({ page }) => {
  await openCrowded(page, { width: 640, height: 280 });
  await expectPanelFits(page);
});

test('on a narrow, short screen the panel opens over the bubble and stays usable', async ({ page }) => {
  await openCrowded(page, { width: 320, height: 240 });
  await expectPanelUsable(page);
});

test('a crowded panel fits at a short spec viewport with the bubble raised (640x360)', async ({ page, hasTouch }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page, { data: crowded });
  const start = await crowdedBubble(page).boundingBox();
  // Rest the bubble at y = 190, leaving 166 px above it.
  await drag(page, hasTouch, { x: start.x + 20, y: start.y + 20 }, { x: start.x + 20, y: 210 }, 8);
  await expect.poll(async () => Math.round((await crowdedBubble(page).boundingBox()).y)).toBe(190);
  if (hasTouch) await crowdedBubble(page).tap();
  else await crowdedBubble(page).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectPanelFits(page);
});

test('resizing while open keeps the panel inside the viewport', async ({ page }) => {
  await openCrowded(page, { width: 640, height: 360 });
  for (const size of [{ width: 568, height: 320 }, { width: 320, height: 568 }, { width: 900, height: 700 }]) {
    await page.setViewportSize(size);
    // The bubble rests 16px from the right edge once the resize is handled.
    await expect.poll(async () => (await crowdedBubble(page).boundingBox()).x).toBe(size.width - 68);
    await expectPanelFits(page);
  }
});

test('the panel opens beside the bubble when there is no room above or below', async ({ page, hasTouch }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page, { data: crowded });
  const start = await crowdedBubble(page).boundingBox();
  await drag(page, hasTouch, { x: start.x + 20, y: start.y + 20 }, { x: 540, y: 160 }, 8);
  if (hasTouch) await crowdedBubble(page).tap();
  else await crowdedBubble(page).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectPanelFits(page);
});

test('widening the window keeps the side and the distance from the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  const before = await bubble(page).boundingBox();
  expect(before.x).toBeGreaterThan(160);
  await page.setViewportSize({ width: 1000, height: 700 });
  await expect.poll(async () => (await bubble(page).boundingBox()).x).toBeGreaterThan(500);
  const after = await bubble(page).boundingBox();
  expect(700 - (after.y + after.height)).toBeCloseTo(568 - (before.y + before.height), 0);
});

const themeOf = (page) => page.locator('aboutme-widget').evaluate((host) => host.shadowRoot.querySelector('.root').dataset.t);

for (const [name, options, expected] of [
  ['an opaque dark body is dark', { head: '<style>body { background: #111; color: #eee }</style>' }, 'dark'],
  ['a gradient body with light text is dark', { head: '<style>body { background: linear-gradient(#000, #333); color: #eee; min-height: 100vh }</style>' }, 'dark'],
  ['data-theme="light" wins on a dark page', { head: '<style>body { background: #111; color: #eee }</style>', attrs: 'data-theme="light"' }, 'light'],
  ['a plain page is light', {}, 'light'],
]) {
  test(`theme: ${name}`, async ({ page }) => {
    await setup(page, options);
    await bubble(page).click();
    await expect.poll(() => themeOf(page)).toBe(expected);
    const background = await page.getByRole('dialog').evaluate((panel) => getComputedStyle(panel).backgroundColor);
    expect(background).toBe(expected === 'dark' ? 'rgb(28, 33, 40)' : 'rgb(255, 255, 255)');
  });
}

test('theme: follows the page when it toggles the html dark class while open', async ({ page }) => {
  await setup(page);
  await bubble(page).click();
  await expect.poll(() => themeOf(page)).toBe('light');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect.poll(() => themeOf(page)).toBe('dark');
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await expect.poll(() => themeOf(page)).toBe('light');
});

test('theme: follows a prefers-color-scheme change that the page animates', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await setup(page, {
    head: '<style>body { background: #fff; color: #000; transition: background-color .3s, color .3s } @media (prefers-color-scheme: dark) { body { background: #111; color: #eee } }</style>',
  });
  await bubble(page).click();
  await expect.poll(() => themeOf(page)).toBe('light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => themeOf(page)).toBe('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => themeOf(page)).toBe('light');
});
