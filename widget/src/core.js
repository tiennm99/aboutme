/**
 * Pure helpers shared by the widget: hide timer, placement, UI strings,
 * profile validation and URLs.
 * Nothing here touches the DOM, so it is unit tested directly.
 */

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'aboutme:hiddenUntil';
export const DEFAULT_HIDE = '7d';
export const ICONS = ['home', 'blog', 'github', 'facebook', 'linkedin', 'x', 'youtube', 'email', 'telegram', 'cv', 'link'];

export const LAYOUTS = ['list', 'grid', 'icons', 'orbit'];
export const POSITION_KEY = 'aboutme:pos';
export const DEFAULT_OFFSET = 32;

const UNIT_MS = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
const DURATION = /^(\d{1,4})\s*([mhdw])$/i;
const LINK_ID = /^[a-z0-9-]{1,32}$/;

/**
 * Parses a hide period such as `30m`, `12h`, `1d` or `2w`.
 * @param {string | undefined} value Period from the script tag.
 * @returns {number} Milliseconds; the default period when the value is missing or invalid.
 */
export function parseDuration(value) {
  const match = DURATION.exec(String(value ?? '').trim());
  if (!match || Number(match[1]) === 0) return parseDuration(DEFAULT_HIDE);
  return Number(match[1]) * UNIT_MS[match[2].toLowerCase()];
}

/**
 * @typedef {'en' | 'vi'} Lang
 */

/**
 * UI strings per language. `{name}` is the profile name and `{period}` the
 * hide period; `units` names each unit once, and `plural` is added after it
 * when the count is not 1.
 */
export const STRINGS = {
  en: {
    about: 'About {name}',
    drag: 'Drag to the bottom to hide',
    close: 'Close',
    hide: 'Hide for {period}',
    units: { m: 'minute', h: 'hour', d: 'day', w: 'week' },
    plural: 's',
  },
  vi: {
    about: 'Giới thiệu về {name}',
    drag: 'Kéo xuống dưới để ẩn',
    close: 'Đóng',
    hide: 'Ẩn trong {period}',
    // Vietnamese nouns have no plural form.
    units: { m: 'phút', h: 'giờ', d: 'ngày', w: 'tuần' },
    plural: '',
  },
};

/**
 * Picks the UI language: the script tag's `data-lang`, then the page's
 * `<html lang>` (`vi` or `vi-*` means Vietnamese), then English.
 * @param {string | undefined} dataLang Language from the script tag.
 * @param {string | null | undefined} pageLang The page's `lang` attribute.
 * @returns {Lang} The language.
 */
export function pickLang(dataLang, pageLang) {
  if (dataLang === 'en' || dataLang === 'vi') return dataLang;
  return /^vi(-|$)/i.test(String(pageLang ?? '').trim()) ? 'vi' : 'en';
}

/**
 * Fills a `{key}` placeholder in a UI string; values are inserted literally.
 * @param {string} template String from {@link STRINGS}.
 * @param {string} key Placeholder name.
 * @param {string} value Replacement.
 * @returns {string} The filled string.
 */
export function fill(template, key, value) {
  return template.replace(`{${key}}`, () => value);
}

/**
 * Describes a hide period for the hide button, such as `1 week` or `3 days`.
 * @param {string | undefined} value Period from the script tag.
 * @param {Lang} [lang] UI language.
 * @returns {string} Human-readable period.
 */
export function describeDuration(value, lang = 'en') {
  const match = DURATION.exec(String(value ?? '').trim());
  if (!match || Number(match[1]) === 0) return describeDuration(DEFAULT_HIDE, lang);
  const count = Number(match[1]);
  const { units, plural } = STRINGS[lang];
  return `${count} ${units[match[2].toLowerCase()]}${count === 1 ? '' : plural}`;
}

/**
 * @typedef {object} Placement
 * @property {'left' | 'right'} side Side of the screen.
 * @property {boolean} fromBottom Whether the distance is from the bottom edge.
 * @property {number} gap Distance in px from that edge to the bubble.
 * @property {number} share The gap as a share of the height the bubble can move in.
 */

/**
 * Reads the starting corner from the script tag. `left` and `right` mean the
 * bottom corners; anything unknown is `bottom-right`.
 * @param {string | undefined} value Position from the script tag.
 * @returns {{ side: 'left' | 'right', fromBottom: boolean }} Side and vertical edge.
 */
export function parsePosition(value) {
  const match = /^(?:(top|bottom)-)?(left|right)$/.exec(String(value ?? ''));
  return match ? { side: /** @type {'left' | 'right'} */ (match[2]), fromBottom: match[1] !== 'top' } : { side: 'right', fromBottom: true };
}

/**
 * Reads the starting distance from the vertical edge, such as `24` or `24px`.
 * @param {string | undefined} value Offset from the script tag.
 * @returns {number} Pixels; {@link DEFAULT_OFFSET} when missing or invalid.
 */
export function parseOffset(value) {
  const match = /^(\d+)(px)?$/.exec(String(value ?? '').trim());
  return match ? Number(match[1]) : DEFAULT_OFFSET;
}

/**
 * Reads the visitor's dragged position from storage.
 * @param {Pick<Storage, 'getItem'> | null} storage Browser storage, or null when unavailable.
 * @returns {Placement | null} The stored placement; null when missing or corrupt.
 */
export function readPlacement(storage) {
  try {
    const value = JSON.parse(storage?.getItem(POSITION_KEY) ?? 'null');
    const { side, fromBottom, gap, share } = value ?? {};
    const ok = (n, max) => typeof n === 'number' && n >= 0 && n <= max;
    if ((side === 'left' || side === 'right') && typeof fromBottom === 'boolean' && ok(gap, 1e5) && ok(share, 1)) {
      return { side, fromBottom, gap, share };
    }
  } catch {
    // Blocked storage or bad JSON: use the script tag's position.
  }
  return null;
}

/**
 * Stores the visitor's dragged position. It stays in their browser only.
 * @param {Pick<Storage, 'setItem'> | null} storage Browser storage, or null when unavailable.
 * @param {Placement} placement Where the bubble rests.
 */
export function savePlacement(storage, { side, fromBottom, gap, share }) {
  try {
    storage?.setItem(POSITION_KEY, JSON.stringify({ side, fromBottom, gap, share }));
  } catch {
    // Storage blocked: the position lasts for this page view only.
  }
}

/**
 * Reports whether a link points at the page it is shown on: same origin, and
 * the link is the site root or the page sits at or under the link's path.
 * @param {string} linkUrl Link target.
 * @param {string} pageUrl Address of the current page.
 * @returns {boolean} True for a link to the current site.
 */
export function isCurrentSite(linkUrl, pageUrl) {
  try {
    const link = new URL(linkUrl);
    const page = new URL(pageUrl);
    if (!/^https?:$/.test(link.protocol) || link.origin !== page.origin) return false;
    // '/cv/' and '/cv' name the same site: hosts redirect one to the other.
    const path = link.pathname.replace(/(.)\/$/, '$1');
    return path === '/' || page.pathname === path || page.pathname.startsWith(`${path}/`);
  } catch {
    return false;
  }
}

/**
 * Drops the links to the current site, keeping all of them when every link matches.
 * @template {{ url: string }} T
 * @param {T[]} links Validated links.
 * @param {string} pageUrl Address of the current page.
 * @returns {T[]} The links to show.
 */
export function visibleLinks(links, pageUrl) {
  const others = links.filter((link) => !isCurrentSite(link.url, pageUrl));
  return others.length ? others : links;
}

/**
 * @typedef {'list' | 'grid' | 'icons' | 'orbit'} Layout
 */

/**
 * Reads the link layout from the script tag.
 * @param {string | undefined} value Layout from the script tag.
 * @returns {Layout} One of {@link LAYOUTS}; `orbit` when the value is missing or unknown.
 */
export function parseLayout(value) {
  return LAYOUTS.includes(value) ? /** @type {Layout} */ (value) : 'orbit';
}

/**
 * Reports whether the visitor dismissed the widget and the period has not ended.
 * @param {Pick<Storage, 'getItem'> | null} storage Browser storage, or null when unavailable.
 * @param {number} now Current time in milliseconds.
 * @returns {boolean} True while the widget should stay hidden.
 */
export function isHidden(storage, now) {
  try {
    const until = Number(storage?.getItem(STORAGE_KEY));
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
}

/**
 * Records the visitor's dismissal so the widget stays hidden for the period.
 * @param {Pick<Storage, 'setItem'> | null} storage Browser storage, or null when unavailable.
 * @param {number} now Current time in milliseconds.
 * @param {number} periodMs Hide period in milliseconds.
 */
export function hideFor(storage, now, periodMs) {
  try {
    storage?.setItem(STORAGE_KEY, String(now + periodMs));
  } catch {
    // Storage blocked: the widget hides for this page view only.
  }
}

/**
 * Accepts only web and mail links, so profile data can never inject a script URL.
 * @param {unknown} value Candidate URL.
 * @param {string[]} protocols Allowed protocols.
 * @returns {string | null} The normalized URL, or null when it is not allowed.
 */
function safeUrl(value, protocols) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Trims a string field and caps its length.
 * @param {unknown} value Candidate text.
 * @param {number} max Maximum length.
 * @returns {string} Trimmed text, empty when the value is not a string.
 */
function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Reads the profile's accent colour, accepting only `#rgb` or `#rrggbb` so the
 * value can never inject other CSS, and picks the text colour that contrasts
 * best with it (WCAG contrast against white and near-black).
 * @param {unknown} value Candidate colour.
 * @returns {{ color: string, fg: string } | null} The accent, or null when absent or invalid.
 */
export function parseAccent(value) {
  if (typeof value !== 'string' || !HEX.test(value.trim())) return null;
  let hex = value.trim().slice(1).toLowerCase();
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  // Above about 0.19 relative luminance, #111111 contrasts better than white.
  return { color: `#${hex}`, fg: 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.19 ? '#111111' : '#ffffff' };
}

/**
 * @typedef {object} ProfileLink
 * @property {string} id Stable id used in click counts.
 * @property {string} label Text shown in the panel.
 * @property {string} url Link target.
 * @property {string} icon One of {@link ICONS}.
 */

/**
 * @typedef {object} Profile
 * @property {string} name Display name.
 * @property {string} tagline Short line under the name, may be empty.
 * @property {string | null} avatar Avatar image URL.
 * @property {ProfileLink[]} links Links shown in the panel.
 * @property {string | null} events Absolute URL of the count endpoint.
 * @property {{ color: string, fg: string } | null} accent Accent colour and its text colour.
 */

/**
 * Validates profile JSON against schema version 1, ignoring unknown fields.
 * @param {unknown} data Parsed profile JSON.
 * @param {string} baseUrl URL the profile was loaded from, used to resolve `events`.
 * @returns {Profile | null} The normalized profile, or null when it cannot be shown.
 */
export function validateProfile(data, baseUrl) {
  if (!data || typeof data !== 'object' || data.schemaVersion !== SCHEMA_VERSION) return null;
  const name = text(data.name, 60);
  if (!name) return null;

  const links = [];
  const seen = new Set();
  for (const raw of Array.isArray(data.links) ? data.links.slice(0, 12) : []) {
    const id = typeof raw?.id === 'string' && LINK_ID.test(raw.id) ? raw.id : null;
    const label = text(raw?.label, 40);
    const url = safeUrl(raw?.url, ['https:', 'http:', 'mailto:']);
    if (!id || !label || !url || seen.has(id)) continue;
    seen.add(id);
    links.push({ id, label, url, icon: ICONS.includes(raw.icon) ? raw.icon : 'link' });
  }
  if (links.length === 0) return null;

  let events = null;
  if (typeof data.events === 'string') {
    try {
      events = safeUrl(new URL(data.events, baseUrl).href, ['https:', 'http:']);
    } catch {
      events = null;
    }
  }

  return {
    name,
    tagline: text(data.tagline, 120),
    avatar: safeUrl(data.avatar, ['https:']),
    links,
    events,
    accent: parseAccent(data.accent),
  };
}

const COLOR = /^(rgba?|oklch|oklab|lab|lch|color)\((.*)\)$/i;

/**
 * Reads one number of a CSS colour function, where `100%` stands for `scale`.
 * @param {string | undefined} token Number, percentage or `none`.
 * @param {number} scale Value of `100%`.
 * @returns {number} The number, NaN when it is missing or not a number.
 */
function channel(token, scale) {
  if (token === 'none') return 0;
  return token?.endsWith('%') ? (parseFloat(token) / 100) * scale : parseFloat(token ?? '');
}

/**
 * Measures how light a computed CSS colour looks.
 * Handles `rgb()`/`rgba()` (comma or space syntax), `oklch()`, `oklab()`,
 * `lab()`, `lch()` (their lightness) and `color()` in `srgb`, `srgb-linear`
 * and `display-p3` (its channels read as if they were sRGB).
 * @param {string} cssColor Colour as `getComputedStyle` returns it.
 * @returns {number | null} Brightness from 0 (black) to 1 (white); null when the
 *   colour is unknown or mostly transparent (alpha below 0.5).
 */
export function brightnessOf(cssColor) {
  const match = COLOR.exec(String(cssColor ?? '').trim());
  if (!match) return null;
  const fn = match[1].toLowerCase();
  const args = match[2].split(/[\s,/]+/).filter(Boolean);
  let value;
  if (fn === 'color') {
    const space = args.shift()?.toLowerCase();
    if (space !== 'srgb' && space !== 'srgb-linear' && space !== 'display-p3') return null;
    // Linear channels are gamma-encoded first, so the weights apply as for sRGB.
    const encode = (c) => {
      if (space !== 'srgb-linear') return c;
      return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    };
    const [r, g, b] = args.slice(0, 3).map((token) => encode(channel(token, 1)));
    value = 0.299 * r + 0.587 * g + 0.114 * b;
  } else if (fn.startsWith('rgb')) {
    const [r, g, b] = args.map((token) => channel(token, 255));
    value = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  } else {
    value = channel(args[0], 1) / (fn.startsWith('ok') || args[0]?.endsWith('%') ? 1 : 100);
  }
  const alpha = args.length > 3 ? channel(args[3], 1) : 1;
  if (!Number.isFinite(value) || !(alpha >= 0.5)) return null;
  return Math.min(Math.max(value, 0), 1);
}

/**
 * Picks the widget theme from what the host page shows, first answer wins:
 * an opaque page background, an explicit dark/light marker, the text colour,
 * and only when the text is mid-grey the visitor's system preference.
 * @param {object} page Values read from the page.
 * @param {string[]} page.backgrounds Computed background colours of body, then html.
 * @param {(string | null)[]} page.markers Classes and theme attribute values of html and body.
 * @param {string} page.text Computed text colour of body.
 * @param {boolean} page.prefersDark Whether `prefers-color-scheme: dark` matches.
 * @returns {'light' | 'dark'} The theme.
 */
export function pickTheme({ backgrounds, markers, text, prefersDark }) {
  for (const color of backgrounds) {
    const value = brightnessOf(color);
    if (value !== null) return value < 0.5 ? 'dark' : 'light';
  }
  for (const marker of markers) {
    const value = marker?.trim().toLowerCase();
    if (value === 'dark' || value === 'light') return value;
  }
  const value = brightnessOf(text);
  if (value !== null && value > 0.6) return 'dark';
  if (value !== null && value < 0.4) return 'light';
  return prefersDark ? 'dark' : 'light';
}
