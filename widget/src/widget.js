/**
 * The floating bubble and its panel, drawn inside a Shadow DOM so the host
 * page's CSS and the widget's CSS never affect each other.
 */

import { STRINGS, describeDuration, fill, pickTheme } from './core.js';

const SIZE = 52;
const MARGIN = 16;
const GAP = 8;
const PANEL_WIDTH = 280;
// Below this much room above or below the bubble, the panel opens beside it,
// even when its header, Hide button and first link rows would fit.
const MIN_ROOM = 160;
// Link rows the panel must show before it may open above or below the bubble.
const MIN_ROWS = 2;
const BESIDE_WIDTH = MARGIN * 2 + SIZE + GAP + PANEL_WIDTH;
const DRAG_THRESHOLD = 6;
const TARGET_RADIUS = 72;
const THEME_ATTRIBUTES = ['data-theme', 'data-bs-theme', 'data-mode', 'data-color-mode', 'data-color-scheme'];

const ICON_PATHS = {
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  blog: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  linkedin: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  cv: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};

// Filled single-path brand marks, drawn in the text colour. LinkedIn keeps the
// generic stroke icon above: simple-icons removed its mark in 14.0.0 because
// LinkedIn's brand policy forbids such use (simple-icons#11372, #11380).
const BRAND_PATHS = {
  // simple-icons 16.38.0, slug "github", CC0-1.0 (https://github.com/simple-icons/simple-icons)
  github: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  // simple-icons 16.38.0, slug "facebook", CC0-1.0 (https://github.com/simple-icons/simple-icons)
  facebook: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  // simple-icons 16.38.0, slug "x", CC0-1.0 (https://github.com/simple-icons/simple-icons)
  x: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
  // simple-icons 16.38.0, slug "youtube", CC0-1.0 (https://github.com/simple-icons/simple-icons)
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  // simple-icons 16.38.0, slug "telegram", CC0-1.0 (https://github.com/simple-icons/simple-icons)
  telegram: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
};

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; }
.root {
  --bg: #ffffff; --fg: #1f2328; --muted: #59636e; --line: #d1d9e0; --hover: #f2f4f6;
  --accent: #2563eb; --accent-fg: #ffffff; --danger: #dc2626;
  font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--fg); color-scheme: light;
}
.root[data-t="dark"] {
  --bg: #1c2128; --fg: #e6edf3; --muted: #9198a1; --line: #3d444d; --hover: #262c36; --accent: #4493f8;
  color-scheme: dark;
}
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }
svg.fill { fill: currentColor; stroke: none; padding: 1px; }
.bubble {
  position: fixed; left: 0; top: 0; width: ${SIZE}px; height: ${SIZE}px; z-index: 2147483001;
  border: 0; border-radius: 50%; padding: 0; cursor: grab; touch-action: none; user-select: none;
  background: var(--accent); color: var(--accent-fg); display: grid; place-items: center; overflow: hidden;
  box-shadow: 0 4px 14px rgb(0 0 0 / 25%); transition: transform .2s ease;
}
.bubble svg { width: 26px; height: 26px; }
.bubble img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
.bubble:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
a:focus-visible { outline-offset: -3px; }
.bubble.dragging { cursor: grabbing; transition: none; }
.panel {
  position: fixed; z-index: 2147483000; width: ${PANEL_WIDTH}px; display: flex; flex-direction: column;
  background: var(--bg); border: 1px solid var(--line); border-radius: 14px; padding: 12px;
  box-shadow: 0 8px 30px rgb(0 0 0 / 20%); animation: open .12s ease-out;
  overflow-y: auto; overscroll-behavior: contain;
}
.panel.over { z-index: 2147483002; }
.panel[hidden] { display: none; }
@keyframes open { from { opacity: 0; transform: translateY(4px) scale(.98); } }
.head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex: none; }
.head img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.who { flex: 1; min-width: 0; }
.name, .tagline { overflow-wrap: anywhere; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
.name { font-weight: 600; -webkit-line-clamp: 2; line-clamp: 2; }
.tagline { color: var(--muted); font-size: 13px; -webkit-line-clamp: 3; line-clamp: 3; }
.icon-btn { border: 0; background: none; color: var(--muted); padding: 4px; border-radius: 6px; cursor: pointer; display: grid; align-self: flex-start; }
.icon-btn:hover { background: var(--hover); color: var(--fg); }
ul { list-style: none; margin: 0; padding: 0; flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
a { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; color: var(--fg); text-decoration: none; }
a:hover { background: var(--hover); }
a span { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* Grid and icons layouts: tiles with the icon above a caption, at most 4 columns. */
.root[data-l] ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 4px; align-content: start; }
.root[data-l] a { position: relative; flex-direction: column; justify-content: center; gap: 4px; min-height: 56px; padding: 8px 2px; }
.root[data-l] a svg { width: 24px; height: 24px; }
.root[data-l] a span { flex: none; width: 100%; font-size: 11px; line-height: 1.2; text-align: center; }
.root[data-l="icons"] a span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.hide { flex: none; width: 100%; margin-top: 8px; padding: 6px; border: 0; border-top: 1px solid var(--line); background: none; color: var(--muted); font: inherit; font-size: 12px; cursor: pointer; }
.hide:hover { color: var(--fg); }
.target {
  position: fixed; left: 0; top: 0; width: 64px; height: 64px; z-index: 2147483000;
  border-radius: 50%; display: grid; place-items: center; color: #fff; background: rgb(0 0 0 / 55%);
  border: 2px solid rgb(255 255 255 / 70%); transition: transform .15s ease, background .15s ease; pointer-events: none;
}
.target[hidden] { display: none; }
.target.active { transform: scale(1.25); background: var(--danger); }
@media (prefers-reduced-motion: reduce) { .bubble, .target { transition: none; } .panel { animation: none; } }
@media print { .root { display: none; } }
`;

/**
 * Builds an inline SVG icon element: a filled brand mark, or a stroke icon.
 * @param {string} name Key of {@link BRAND_PATHS} or {@link ICON_PATHS}.
 * @returns {SVGSVGElement} The icon.
 */
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const brand = BRAND_PATHS[name];
  if (brand) svg.classList.add('fill');
  svg.innerHTML = brand ? `<path d="${brand}"/>` : (ICON_PATHS[name] ?? ICON_PATHS.link);
  return svg;
}

/**
 * Creates an element with a class and optional text, never parsing HTML from data.
 * @param {string} tag Tag name.
 * @param {string} [className] Class name.
 * @param {string} [content] Text content.
 * @returns {HTMLElement} The element.
 */
function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content) node.textContent = content;
  return node;
}

/**
 * Returns the visible viewport size without classic scrollbars.
 * @returns {{ w: number, h: number }} Width and height in CSS pixels.
 */
function viewport() {
  // In quirks mode the body, not the root element, reports the viewport.
  const node = document.compatMode === 'BackCompat' ? document.body : document.documentElement;
  const size = { w: node.clientWidth, h: node.clientHeight };
  // On a phone, a page wider than the screen can load zoomed out, or the
  // visitor can zoom out; more of the page is then visible than the client
  // size says. Zooming in is ignored, so the bubble never chases the visitor.
  const visible = window.visualViewport;
  if (visible && visible.scale < 1) {
    size.w = Math.max(size.w, visible.width);
    size.h = Math.max(size.h, visible.height);
  }
  return size;
}

/**
 * Clamps a value between a minimum and a maximum, the minimum winning.
 * @param {number} value Value.
 * @param {number} min Lower bound.
 * @param {number} max Upper bound.
 * @returns {number} The clamped value.
 */
function clamp(value, min, max) {
  return Math.max(Math.min(value, max), min);
}

/**
 * Reads the host page's colours and theme markers and picks the widget theme.
 * @param {MediaQueryList} media The `prefers-color-scheme: dark` query.
 * @returns {'light' | 'dark'} The theme.
 */
function pageTheme(media) {
  const nodes = [document.documentElement, document.body];
  const markers = [];
  for (const node of nodes) {
    markers.push(...['dark', 'light'].filter((name) => node.classList.contains(name)));
    markers.push(...THEME_ATTRIBUTES.map((name) => node.getAttribute(name)));
  }
  return pickTheme({
    backgrounds: [nodes[1], nodes[0]].map((node) => getComputedStyle(node).backgroundColor),
    markers,
    text: getComputedStyle(nodes[1]).color,
    prefersDark: media.matches,
  });
}

/**
 * Mounts the widget on the page.
 * @param {object} options Widget options.
 * @param {import('./core.js').Profile} options.profile Validated profile.
 * @param {import('./core.js').Placement} options.placement Where the bubble starts.
 * @param {import('./core.js').Lang} options.lang UI language.
 * @param {'auto' | 'light' | 'dark'} options.theme Colour theme; `auto` follows the page.
 * @param {import('./core.js').Layout} options.layout How links are shown: rows, captioned tiles or icon tiles.
 * @param {string} options.hide Hide period as written in the script tag.
 * @param {(event: string, target?: string) => void} options.track Sends an anonymous count.
 * @param {() => void} options.onDismiss Called once when the visitor dismisses the widget.
 * @param {(placement: import('./core.js').Placement) => void} options.onMove Called with the resting place after a drag.
 * @returns {HTMLElement} The shadow host, to allow removal.
 */
export function mount({ profile, placement, lang, theme, layout, hide, track, onDismiss, onMove }) {
  const strings = STRINGS[lang];
  const about = fill(strings.about, 'name', profile.name);
  const host = document.createElement('aboutme-widget');
  const shadow = host.attachShadow({ mode: 'open' });
  const root = el('div', 'root');
  // The list look keeps the base styles; grid and icons are styled through this attribute.
  if (layout !== 'list') root.dataset.l = layout;
  const style = el('style');
  style.textContent = STYLE;

  const bubble = el('button', 'bubble');
  bubble.type = 'button';
  bubble.setAttribute('aria-label', about);
  bubble.setAttribute('aria-expanded', 'false');
  bubble.setAttribute('aria-controls', 'aboutme-panel');
  bubble.title = strings.drag;
  if (profile.avatar) {
    const img = el('img');
    img.alt = '';
    img.src = profile.avatar;
    img.addEventListener('error', () => img.replaceWith(icon('person')), { once: true });
    bubble.append(img);
  } else {
    bubble.append(icon('person'));
  }

  const panel = el('div', 'panel');
  panel.id = 'aboutme-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', about);
  panel.hidden = true;

  const head = el('div', 'head');
  if (profile.avatar) {
    const img = el('img');
    img.alt = '';
    img.src = profile.avatar;
    head.append(img);
  }
  const who = el('div', 'who');
  who.append(el('div', 'name', profile.name));
  if (profile.tagline) who.append(el('div', 'tagline', profile.tagline));
  const close = el('button', 'icon-btn');
  close.type = 'button';
  close.setAttribute('aria-label', strings.close);
  close.append(icon('close'));
  head.append(who, close);

  const list = el('ul');
  for (const link of profile.links) {
    const item = el('li');
    const anchor = el('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.title = link.label;
    anchor.append(icon(link.icon), el('span', '', link.label));
    anchor.addEventListener('click', () => track('click', link.id));
    item.append(anchor);
    list.append(item);
  }

  const hideButton = el('button', 'hide', fill(strings.hide, 'period', describeDuration(hide, lang)));
  hideButton.type = 'button';
  panel.append(head, list, hideButton);

  const target = el('div', 'target');
  target.hidden = true;
  target.append(icon('close'));

  // The bubble comes first so Tab moves from it into the open panel.
  root.append(style, bubble, panel, target);
  shadow.append(root);
  document.body.append(host);

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let frame = 0;
  let timer = 0;
  let observer = null;
  let sizer = null;

  /** Applies the fixed theme, or the one the page shows now. */
  function applyTheme() {
    root.dataset.t = theme === 'auto' ? pageTheme(media) : theme;
  }

  /** Re-reads the page theme once per frame, and again after a background transition. */
  function themeChanged() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(applyTheme);
    clearTimeout(timer);
    timer = setTimeout(applyTheme, 400);
  }

  let x = 0;
  let y = 0;
  // The bubble rests this far from the nearer of the top and bottom edges, or
  // at this share of the height it can move in when the screen gets shorter,
  // so a bubble in the lower half stays there after a rotation.
  let { side, fromBottom, gap, share } = placement;
  let last = viewport();

  /** Moves the bubble to the current coordinates. */
  function place() {
    bubble.style.transform = `translate(${x}px, ${y}px)`;
  }

  /** Puts the bubble on its side at its resting distance, kept on screen. */
  function snap() {
    const { w, h } = viewport();
    const offset = Math.min(gap, share * (h - SIZE));
    x = side === 'left' ? MARGIN : w - SIZE - MARGIN;
    y = clamp(fromBottom ? h - SIZE - offset : offset, MARGIN, h - SIZE - MARGIN);
    last = { w, h };
    place();
  }

  /** After a drag, picks the nearer side and edge and records the resting place. */
  function settle() {
    const { w, h } = viewport();
    side = x + SIZE / 2 < w / 2 ? 'left' : 'right';
    fromBottom = y + SIZE / 2 > h / 2;
    const top = clamp(y, MARGIN, h - SIZE - MARGIN);
    gap = fromBottom ? h - SIZE - top : top;
    share = h > SIZE ? Math.min(gap / (h - SIZE), 1) : 1;
    snap();
    onMove({ side, fromBottom, gap, share });
  }

  /**
   * Places the panel above or below the bubble, whichever has more room, capped
   * to that room. When that room cannot hold the header, the Hide button and the
   * first link rows, it goes beside the bubble, or on a narrow screen over it.
   */
  function placePanel() {
    const { w, h } = viewport();
    const above = y - GAP - MARGIN;
    const below = h - y - SIZE - GAP - MARGIN;
    const room = Math.max(above, below);
    const width = Math.min(PANEL_WIDTH, w - MARGIN * 2);
    panel.style.width = `${width}px`;
    // Measure at the final width with nothing capped: everything but the list is fixed.
    panel.style.maxHeight = 'none';
    list.style.minHeight = '0px';
    const row = list.firstElementChild?.offsetHeight ?? 0;
    const fixed = panel.offsetHeight - list.offsetHeight;
    const cramped = room < Math.max(MIN_ROOM, fixed + Math.min(list.scrollHeight, row * MIN_ROWS));
    const beside = cramped && w >= BESIDE_WIDTH;
    panel.classList.toggle('over', cramped && !beside);
    // Always show one whole row; if even that does not fit, the whole panel scrolls.
    list.style.minHeight = `${Math.min(list.scrollHeight, row)}px`;
    panel.style.maxHeight = `${Math.max(cramped ? h - MARGIN * 2 : room, 0)}px`;
    const height = panel.offsetHeight;
    let left = side === 'left' ? MARGIN : w - MARGIN - width;
    let top;
    if (!cramped) {
      top = above >= below ? y - GAP - height : y + SIZE + GAP;
    } else {
      if (beside) left += side === 'left' ? SIZE + GAP : -SIZE - GAP;
      top = clamp(y + SIZE / 2 - height / 2, MARGIN, h - MARGIN - height);
    }
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  /** Keeps the bubble and the open panel on screen after a resize. */
  function resize() {
    if (drag?.moved) return;
    snap();
    if (!panel.hidden) placePanel();
  }

  /** Re-places after a change that may leave the viewport size as it was. */
  function refit() {
    const { w, h } = viewport();
    if (w !== last.w || h !== last.h) resize();
  }

  /**
   * Opens or closes the panel.
   * @param {boolean} open Whether the panel should be open.
   */
  function setOpen(open) {
    if (open === !panel.hidden) return;
    panel.hidden = !open;
    bubble.setAttribute('aria-expanded', String(open));
    if (open) {
      applyTheme();
      placePanel();
      track('open');
    }
  }

  /** Removes the widget and records the dismissal. */
  function dismiss() {
    track('dismiss');
    host.remove();
    window.removeEventListener('resize', resize);
    window.visualViewport?.removeEventListener('resize', refit);
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', escape);
    media.removeEventListener('change', themeChanged);
    observer?.disconnect();
    sizer?.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    onDismiss();
  }

  /**
   * Closes the panel when the visitor clicks elsewhere on the page.
   * @param {PointerEvent} event Pointer event.
   */
  function outside(event) {
    if (!event.composedPath().includes(host)) setOpen(false);
  }

  /**
   * Closes the panel on Escape and returns focus to the bubble.
   * @param {KeyboardEvent} event Key event.
   */
  function escape(event) {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      bubble.focus();
    }
  }

  /**
   * Reports whether the bubble's center is over the dismiss target.
   * @returns {boolean} True when dropping now would dismiss.
   */
  function overTarget() {
    const box = target.getBoundingClientRect();
    const dx = x + SIZE / 2 - (box.left + box.width / 2);
    const dy = y + SIZE / 2 - (box.top + box.height / 2);
    return Math.hypot(dx, dy) < TARGET_RADIUS;
  }

  let drag = null;

  bubble.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, dx: event.clientX - x, dy: event.clientY - y, moved: false };
    bubble.setPointerCapture(event.pointerId);
  });

  bubble.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD) return;
    if (!drag.moved) {
      drag.moved = true;
      bubble.classList.add('dragging');
      // Placed from the same viewport as the bubble: on a page wider than the
      // screen, CSS edges of a fixed element can lie outside the visible area.
      const { w, h } = viewport();
      target.style.left = `${w / 2 - 32}px`;
      target.style.top = `${h - 96}px`;
      target.hidden = false;
      setOpen(false);
    }
    x = event.clientX - drag.dx;
    y = event.clientY - drag.dy;
    place();
    target.classList.toggle('active', overTarget());
  });

  /**
   * Ends a press: a tap toggles the panel; a drag dismisses over the target,
   * otherwise settles on a side. Taps are handled here rather than on `click`,
   * because Chrome stops firing `click` for taps after a touch drag.
   * @param {PointerEvent} event Pointer event.
   */
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const { moved } = drag;
    drag = null;
    if (!moved) {
      if (event.type === 'pointerup') setOpen(panel.hidden);
      return;
    }
    bubble.classList.remove('dragging');
    const drop = event.type === 'pointerup' && overTarget();
    target.hidden = true;
    target.classList.remove('active');
    if (drop) dismiss();
    else settle();
  }

  bubble.addEventListener('pointerup', endDrag);
  bubble.addEventListener('pointercancel', endDrag);
  // Keyboard and assistive-tech activation fire a click with detail 0;
  // pointer presses are already handled in endDrag.
  bubble.addEventListener('click', (event) => {
    if (event.detail === 0) setOpen(panel.hidden);
  });
  close.addEventListener('click', () => {
    setOpen(false);
    bubble.focus();
  });
  hideButton.addEventListener('click', dismiss);
  window.addEventListener('resize', resize);
  // Zooming fires no window resize.
  window.visualViewport?.addEventListener('resize', refit);
  // A classic scrollbar that appears or goes away changes the viewport's
  // client size without a resize event; the root element's box changes with it.
  if (window.ResizeObserver) {
    sizer = new ResizeObserver(refit);
    sizer.observe(document.compatMode === 'BackCompat' ? document.body : document.documentElement);
  }
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', escape);

  applyTheme();
  if (theme === 'auto') {
    // A media-driven change mutates no attribute, and the page may animate its
    // background, so re-read it after the transition as for attribute changes.
    media.addEventListener('change', themeChanged);
    observer = new MutationObserver(themeChanged);
    observer.observe(document.documentElement, { attributes: true });
    observer.observe(document.body, { attributes: true });
  }

  // Place without the snap animation, so the bubble does not slide in from the corner.
  bubble.classList.add('dragging');
  snap();
  bubble.getBoundingClientRect();
  bubble.classList.remove('dragging');
  return host;
}
