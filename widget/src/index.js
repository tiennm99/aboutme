/**
 * Entry point: reads the script tag's options, loads the profile and mounts
 * the widget unless the visitor dismissed it within the hide period.
 *
 * Script tag options:
 * - `data-profile` (required): URL of the profile JSON.
 * - `data-hide`: hide period after a dismissal, such as `1d` or `2w` (default `7d`).
 * - `data-position`: starting side, `left` or `right` (default `right`).
 * - `data-theme`: `auto` (default, follows the page), `light` or `dark`.
 * - `data-layout`: `list` (default), `grid` (captioned tiles) or `icons` (tiles without visible captions).
 */

import { hideFor, isHidden, parseDuration, parseLayout, validateProfile } from './core.js';
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
 * `text/plain` body needs no preflight.
 * @param {string | null} url Count endpoint, or null to send nothing.
 * @param {string} event Event name.
 * @param {string} [target] Link id for clicks.
 */
function track(url, event, target) {
  if (!url) return;
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
  const hide = script.dataset.hide;
  const position = script.dataset.position === 'left' ? 'left' : 'right';
  const theme = ['light', 'dark'].includes(script.dataset.theme) ? script.dataset.theme : 'auto';
  const layout = parseLayout(script.dataset.layout);
  if (!profileUrl || isHidden(storage(), Date.now())) return;

  let profile;
  try {
    const url = new URL(profileUrl, document.baseURI).href;
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) return;
    profile = validateProfile(await response.json(), url);
  } catch {
    return;
  }
  if (!profile) return;

  const ready = () =>
    mount({
      profile,
      position,
      theme,
      layout,
      hide: hide ?? '',
      track: (event, target) => track(profile.events, event, target),
      onDismiss: () => hideFor(storage(), Date.now(), parseDuration(hide)),
    });
  if (document.body) ready();
  else document.addEventListener('DOMContentLoaded', ready, { once: true });
}

const script = document.currentScript;
if (script instanceof HTMLScriptElement && !window.__aboutmeLoaded) {
  window.__aboutmeLoaded = true;
  start(script);
}
