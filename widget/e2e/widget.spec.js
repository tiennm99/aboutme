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

async function setup(page, { hide = '1d', attrs = '', head = '', data = profile, meta = 'width=device-width' } = {}) {
  const events = [];
  const origins = [];
  await page.route(`${SITE}/`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      // no-referrer is the strictest policy for the Origin header the Worker relies on.
      body: `<!doctype html><meta name="viewport" content="${meta}"><meta name="referrer" content="no-referrer">${head}
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
  // The bubble comes before the panel, so Tab moves into the panel and back.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(bubble(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(bubble(page)).toBeFocused();
});

test('the bubble is hidden when printing', async ({ page }) => {
  await setup(page);
  await expect(bubble(page)).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(bubble(page)).toBeHidden();
});

for (const reducedMotion of ['reduce', 'no-preference']) {
  test(`the panel animates its opening only without reduced motion (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await setup(page);
    await bubble(page).click();
    const animations = await page.getByRole('dialog').evaluate((panel) => panel.getAnimations().length);
    expect(animations).toBe(reducedMotion === 'reduce' ? 0 : 1);
  });
}

test('rotating keeps a bubble in the lower half there, and rotating back restores it', async ({ page, hasTouch }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  const start = await bubble(page).boundingBox();
  // Rest the bubble at y = 440, its centre just below the middle.
  await drag(page, hasTouch, { x: start.x + 20, y: start.y + 20 }, { x: start.x + 20, y: 460 }, 8);
  await expect.poll(async () => Math.round((await bubble(page).boundingBox()).y)).toBe(440);
  await page.setViewportSize({ width: 915, height: 412 });
  await expect.poll(async () => (await bubble(page).boundingBox()).x).toBe(915 - 68);
  const turned = await bubble(page).boundingBox();
  expect(turned.y + turned.height / 2).toBeGreaterThan(412 / 2);
  await page.setViewportSize({ width: 412, height: 915 });
  await expect.poll(async () => Math.round((await bubble(page).boundingBox()).y)).toBe(440);
});

test.describe('with classic scrollbars', () => {
  // Chromium hides scrollbars in automation by default, and launch options
  // cannot change per test, so these tests launch their own browser.
  let browser;
  let page;
  test.beforeEach(async ({ playwright, channel, isMobile }) => {
    test.skip(isMobile, 'Mobile scrollbars overlay the page');
    browser = await playwright.chromium.launch({ channel, ignoreDefaultArgs: ['--hide-scrollbars'] });
    page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  });
  test.afterEach(async () => {
    await browser?.close();
    browser = undefined;
  });
  const head = '<style>::-webkit-scrollbar { width: 17px } ::-webkit-scrollbar-thumb { background: #888 }</style>';
  const clientWidth = (page) => page.evaluate(() => document.documentElement.clientWidth);

  // Bubble and panel stay at least 16px clear of the scrollbar, and lined up.
  async function expectClearOfScrollbar(page) {
    const width = await clientWidth(page);
    expect(width).toBeLessThan(page.viewportSize().width);
    const ball = await bubble(page).boundingBox();
    expect(ball.x + ball.width).toBeLessThanOrEqual(width - 16);
    await bubble(page).click();
    const box = await page.getByRole('dialog').boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(width - 16 + 0.5);
    expect(box.x + box.width).toBeCloseTo(ball.x + ball.width, 0);
  }

  test('on a long page the bubble and panel stay clear of the scrollbar', async () => {
    await setup(page, { head: `${head}<style>html { overflow-y: scroll } body { height: 3000px }</style>` });
    await expectClearOfScrollbar(page);
  });

  test('a scrollbar that appears after the widget loads moves the bubble clear of it', async () => {
    await setup(page, { head });
    await expect(bubble(page)).toBeVisible();
    expect(await clientWidth(page)).toBe(page.viewportSize().width);
    // Content grows later, as when a single-page app renders or images load.
    await page.evaluate(() => (document.body.style.height = '3000px'));
    await expect.poll(async () => {
      const ball = await bubble(page).boundingBox();
      return ball.x + ball.width;
    }).toBe((await clientWidth(page)) - 16);
    await expectClearOfScrollbar(page);
  });
});

const crowded = {
  ...profile,
  name: 'N'.repeat(60),
  tagline: 'Builds small tools, writes about the web, and keeps a long list of side projects that never quite get finished in time..',
  links: Array.from({ length: 12 }, (_, i) => ({ id: `l${i}`, label: `Link number ${i} with a long label here`, url: 'https://example.com', icon: 'link' })),
};
const crowdedBubble = (page) => page.getByRole('button', { name: /^About N+$/ });

async function openCrowded(page, size, attrs = '') {
  await page.setViewportSize(size);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page, { data: crowded, attrs });
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

test('long names clamp to two lines and long labels end in an ellipsis', async ({ page }) => {
  await openCrowded(page, { width: 320, height: 568 });
  const dialog = page.getByRole('dialog');
  const name = await dialog.locator('.name').evaluate((node) => ({ height: node.clientHeight, line: parseFloat(getComputedStyle(node).lineHeight) }));
  expect(name.height).toBeLessThanOrEqual(name.line * 2 + 0.5);
  const label = await dialog.locator('a span').first().evaluate((node) => ({ scroll: node.scrollWidth, client: node.clientWidth, overflow: getComputedStyle(node).textOverflow }));
  expect(label.scroll).toBeGreaterThan(label.client);
  expect(label.overflow).toBe('ellipsis');
});

const branded = {
  ...crowded,
  links: ['github', 'facebook', 'linkedin', 'x', 'youtube', 'telegram', 'home', 'blog', 'cv', 'email', 'link', 'unknown'].map((icon, i) => ({
    id: `l${i}`,
    label: `Link number ${i} with a long label here`,
    url: 'https://example.com',
    icon,
  })),
};

// Every tile sits inside the list, at least 44 px square, and the list never scrolls sideways.
async function tileLayout(page) {
  return page.getByRole('dialog').locator('ul').evaluate((list) => {
    const box = list.getBoundingClientRect();
    const tiles = [...list.querySelectorAll('a')].map((a) => a.getBoundingClientRect());
    return {
      display: getComputedStyle(list).display,
      columns: getComputedStyle(list).gridTemplateColumns.split(' ').length,
      overflowX: list.scrollWidth - list.clientWidth,
      inside: tiles.every((t) => t.left >= box.left - 0.5 && t.right <= box.right + 0.5),
      small: tiles.filter((t) => t.width < 44 || t.height < 44).length,
      count: tiles.length,
    };
  });
}

for (const attrs of ['', 'data-layout="bogus"']) {
  test(`the list layout stays the default (${attrs || 'no attribute'})`, async ({ page }) => {
    await setup(page, { attrs });
    await bubble(page).click();
    const dialog = page.getByRole('dialog');
    expect(await dialog.locator('ul').evaluate((list) => getComputedStyle(list).display)).toBe('block');
    const link = dialog.getByRole('link', { name: 'GitHub' });
    expect(await link.evaluate((a) => getComputedStyle(a).flexDirection)).toBe('row');
    expect(await link.locator('span').evaluate((span) => getComputedStyle(span).fontSize)).toBe('14px');
  });
}

test('brand marks are filled in the list layout too', async ({ page }) => {
  await setup(page);
  await bubble(page).click();
  const github = page.getByRole('link', { name: 'GitHub' }).locator('svg');
  await expect(github).toHaveClass('fill');
  expect(await github.evaluate((svg) => getComputedStyle(svg).stroke)).toBe('none');
  await expect(page.getByRole('link', { name: 'Homepage' }).locator('svg')).not.toHaveClass('fill');
});

for (const layout of ['grid', 'icons']) {
  test(`${layout}: tiles with brand marks fit four to a row`, async ({ page }) => {
    await openCrowded(page, { width: 1280, height: 800 }, `data-layout="${layout}"`);
    const tiles = await tileLayout(page);
    expect(tiles).toMatchObject({ display: 'grid', columns: 4, overflowX: 0, inside: true, small: 0, count: 12 });
  });

  test(`${layout}: a narrow panel shows fewer columns`, async ({ page }) => {
    await openCrowded(page, { width: 240, height: 600 }, `data-layout="${layout}"`);
    const tiles = await tileLayout(page);
    expect(tiles.columns).toBeLessThan(4);
    expect(tiles).toMatchObject({ overflowX: 0, inside: true, small: 0 });
  });

  for (const size of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
    test(`${layout}: a panel with 12 links fits a ${size.width}x${size.height} viewport`, async ({ page }) => {
      await openCrowded(page, size, `data-layout="${layout}"`);
      await expectPanelFits(page);
      expect(await tileLayout(page)).toMatchObject({ overflowX: 0, inside: true, small: 0 });
    });
  }

  test(`${layout}: the keyboard reaches every tile in order`, async ({ page }) => {
    await page.setViewportSize({ width: 568, height: 320 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(page, { data: branded, attrs: `data-layout="${layout}"` });
    await crowdedBubble(page).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
    const list = page.getByRole('dialog').locator('ul');
    for (const link of branded.links) {
      await page.keyboard.press('Tab');
      const tile = page.getByRole('link', { name: link.label });
      await expect(tile).toBeFocused();
      // The scrolling list brings the focused tile into view.
      const [box, tileBox] = [await list.boundingBox(), await tile.boundingBox()];
      expect(tileBox.y).toBeGreaterThanOrEqual(box.y - 0.5);
      expect(tileBox.y + tileBox.height).toBeLessThanOrEqual(box.y + box.height + 0.5);
    }
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /^Hide for/ })).toBeFocused();
  });
}

test('grid: captions show in 11 px type', async ({ page }) => {
  await setup(page, { attrs: 'data-layout="grid"' });
  await bubble(page).click();
  const caption = page.getByRole('link', { name: 'GitHub' }).locator('span');
  await expect(caption).toBeVisible();
  expect(await caption.evaluate((span) => getComputedStyle(span).fontSize)).toBe('11px');
});

test('icons: captions are hidden but stay the accessible name and the title', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await setup(page, { data: branded, attrs: 'data-layout="icons"' });
  await crowdedBubble(page).click();
  for (const link of branded.links) {
    const tile = page.getByRole('link', { name: link.label, exact: true });
    await expect(tile).toHaveCount(1);
    await expect(tile).toHaveAttribute('title', link.label);
    const caption = await tile.locator('span').boundingBox();
    expect(caption.width).toBeLessThanOrEqual(1);
    expect(caption.height).toBeLessThanOrEqual(1);
  }
});

for (const theme of ['light', 'dark']) {
  test(`grid: the ${theme} theme colours the tiles`, async ({ page }) => {
    await setup(page, { attrs: `data-layout="grid" data-theme="${theme}"` });
    await bubble(page).click();
    const colour = await page.getByRole('link', { name: 'GitHub' }).evaluate((a) => getComputedStyle(a).color);
    expect(colour).toBe(theme === 'dark' ? 'rgb(230, 237, 243)' : 'rgb(31, 35, 40)');
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
  ['an lch dark body is dark', { head: '<style>body { background: lch(12 0 0); color: lch(92 0 0) }</style>' }, 'dark'],
  ['a display-p3 dark body is dark', { head: '<style>body { background: color(display-p3 0.05 0.05 0.05); color: color(display-p3 0.9 0.9 0.9) }</style>' }, 'dark'],
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

test.describe('a page wider than the phone screen', () => {
  test.skip(({ isMobile }) => !isMobile, 'desktop browsers ignore the viewport meta tag');
  const wide = '<style>h1 { width: 700px }</style>';
  // Boxes in page coordinates, and the visible area from the visual viewport.
  const boxes = (page) =>
    page.evaluate(() => {
      const shadow = document.querySelector('aboutme-widget').shadowRoot;
      const rect = (selector) => shadow.querySelector(selector).getBoundingClientRect().toJSON();
      const { width, height, scale } = visualViewport;
      return { ball: rect('.bubble'), panel: rect('.panel'), target: rect('.target'), view: { x: 0, y: 0, width, height }, scale };
    });

  // Starts a drag with the mouse, in the coordinates Playwright gives the bubble.
  async function startDrag(page) {
    const ball = await bubble(page).boundingBox();
    const at = { x: ball.x + ball.width / 2, y: ball.y + ball.height / 2 };
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x - 30, at.y - 30, { steps: 4 });
  }

  test('when it loads zoomed out, the bubble, panel and dismiss target sit in the visible corner', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(page, { head: wide });
    await expect(bubble(page)).toBeVisible();
    const { ball, view, scale } = await boxes(page);
    expect(scale).toBeLessThan(1);
    expect(contains(view, ball)).toBe(true);
    expect(ball.x + ball.width).toBeGreaterThan(view.width - 20);
    expect(ball.y + ball.height).toBeGreaterThan(view.height - 40);

    await bubble(page).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(contains(view, (await boxes(page)).panel)).toBe(true);
    await page.keyboard.press('Escape');

    await startDrag(page);
    const { target } = await boxes(page);
    expect(contains(view, target)).toBe(true);
    expect(target.y + target.height).toBeGreaterThan(view.height - 40);
    await page.mouse.up();
  });

  test('at normal zoom the dismiss target is on screen, and zooming out moves the bubble to the corner', async ({ page, hasTouch }) => {
    await setup(page, { head: wide, meta: 'width=device-width, initial-scale=1' });
    await expect(bubble(page)).toBeVisible();
    const first = await boxes(page);
    expect(first.scale).toBe(1);
    expect(first.ball.x + first.ball.width).toBe(page.viewportSize().width - 16);

    await startDrag(page);
    expect(contains(first.view, (await boxes(page)).target)).toBe(true);
    await page.mouse.up();

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 0.6 });
    await expect.poll(async () => {
      const { ball, view } = await boxes(page);
      return contains(view, ball) && ball.x + ball.width > view.width - 20;
    }).toBe(true);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await expect.poll(async () => (await boxes(page)).ball.x).toBe(page.viewportSize().width - 68);

    // Dropping on the target still dismisses.
    const start = await bubble(page).boundingBox();
    const viewport = page.viewportSize();
    await drag(page, hasTouch, { x: start.x + 20, y: start.y + 20 }, { x: viewport.width / 2, y: viewport.height - 64 }, 12);
    await expect(bubble(page)).toHaveCount(0);
  });
});
