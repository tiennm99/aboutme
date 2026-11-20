/**
 * Pure helpers shared by the widget: hide timer, profile validation and URLs.
 * Nothing here touches the DOM, so it is unit tested directly.
 */

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'aboutme:hiddenUntil';
export const DEFAULT_HIDE = '7d';
export const ICONS = ['home', 'blog', 'github', 'facebook', 'linkedin', 'x', 'youtube', 'email', 'link'];

const UNIT_MS = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
const UNIT_NAMES = { m: 'minute', h: 'hour', d: 'day', w: 'week' };
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
 * Describes a hide period for the hide button, such as `1 week` or `3 days`.
 * @param {string | undefined} value Period from the script tag.
 * @returns {string} Human-readable period.
 */
export function describeDuration(value) {
  const match = DURATION.exec(String(value ?? '').trim());
  if (!match || Number(match[1]) === 0) return describeDuration(DEFAULT_HIDE);
  const count = Number(match[1]);
  const unit = UNIT_NAMES[match[2].toLowerCase()];
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
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
  };
}
