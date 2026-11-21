/**
 * Entry point: reads the script tag's options, loads the profile and mounts
 * the widget unless the visitor dismissed it within the hide period.
 *
 * Script tag options:
 * - `data-profile`: URL of the profile JSON. Without it, the profile JSON is read
 *   from the script tag's own text, which browsers never run when `src` is set.
 * - `data-hide`: hide period after a dismissal, such as `1d` or `2w` (default `7d`).
 * - `data-position`: starting corner, `top-left`, `top-right`, `bottom-left` or
 *   `bottom-right` (default); `left` and `right` mean the bottom corners.
 * - `data-offset`: starting distance in px from the top or bottom edge (default `32`).
 * - `data-lang`: UI language, `en` or `vi` (default: the page's `<html lang>`, else `en`).
 * - `data-theme`: `auto` (default, follows the page), `light` or `dark`.
 * - `data-layout`: `orbit` (default; round icons that fly out around the bubble, with no
 *   panel), `list` (a panel with one row per link), `grid` (captioned tiles) or `icons`
 *   (tiles without visible captions).
 */

import {
  hideFor,
  isHidden,
  parseDuration,
  parseLayout,
  parseOffset,
  parsePosition,
  pickLang,
  readPlacement,
  savePlacement,
  validateProfile,
  visibleLinks,
} from './core.js';
import { mount } from './widget.js';

/**
 * Returns localStorage, or null when the browser blocks it.
 * @returns {Storage | null} Storage or null.
 */
function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Sends one anonymous count. It carries no cookie and no visitor id; the
 * server reads the site from the request's Origin header. CORS mode keeps that
 * header real even on pages whose referrer policy is `no-referrer`, and a
 * `text/plain` body needs no preflight. Nothing is sent when the visitor's
 * browser signals Global Privacy Control.
 * @param {string | null} url Count endpoint, or null to send nothing.
 * @param {string} event Event name.
 * @param {string} [target] Link id for clicks.
 */
function track(url, event, target) {
  if (!url || navigator.globalPrivacyControl === true) return;
  try {
    fetch(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: true,
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify(target ? { event, target } : { event }),
    }).catch(() => {});
  } catch {
    // Counting is best effort.
  }
}

/**
 * Loads the profile and mounts the widget.
 * @param {HTMLScriptElement} script The widget's own script tag.
 */
async function start(script) {
  const profileUrl = script.dataset.profile;
  const inline = profileUrl ? '' : script.textContent.trim();
  const hide = script.dataset.hide;
  const { position, offset } = script.dataset;
  const theme = ['light', 'dark'].includes(script.dataset.theme) ? script.dataset.theme : 'auto';
  const layout = parseLayout(script.dataset.layout);
  if ((!profileUrl && !inline) || isHidden(storage(), Date.now())) return;

  let profile;
  try {
    if (inline) {
      profile = validateProfile(JSON.parse(inline), document.baseURI);
    } else {
      const url = new URL(profileUrl, document.baseURI).href;
      const response = await fetch(url, { credentials: 'omit' });
      if (!response.ok) return;
      profile = validateProfile(await response.json(), url);
    }
  } catch {
    return;
  }
  if (!profile) return;
  profile.links = visibleLinks(profile.links, location.href);
  // The visitor's own dragged position wins over the script tag's.
  const placement = readPlacement(storage()) ?? { ...parsePosition(position), gap: parseOffset(offset), share: 1 };

  const ready = () =>
    mount({
      profile,
      placement,
      lang: pickLang(script.dataset.lang, document.documentElement.lang),
      theme,
      layout,
      hide: hide ?? '',
      track: (event, target) => track(profile.events, event, target),
      onDismiss: () => hideFor(storage(), Date.now(), parseDuration(hide)),
      onMove: (moved) => savePlacement(storage(), moved),
    });
  if (document.body) ready();
  else document.addEventListener('DOMContentLoaded', ready, { once: true });
}

const script = document.currentScript;
if (script instanceof HTMLScriptElement && !window.__aboutmeLoaded) {
  window.__aboutmeLoaded = true;
  start(script);
}
