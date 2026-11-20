/**
 * The floating bubble and its panel, drawn inside a Shadow DOM so the host
 * page's CSS and the widget's CSS never affect each other.
 */

import { describeDuration } from './core.js';

const SIZE = 52;
const MARGIN = 16;
const DRAG_THRESHOLD = 6;
const TARGET_RADIUS = 72;

const ICON_PATHS = {
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  blog: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  github: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
  facebook: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 15c3 0 6 1.5 6 4.5"/>',
  linkedin: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/>',
  x: '<path d="M4 5h16v11H9l-5 4z"/>',
  youtube: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M10 9l5 3-5 3z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  telegram: '<path d="M21 4L3 11l6 2 2 6 3-4 5 4z"/><path d="M9 13l12-9"/>',
  cv: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; }
.root {
  --bg: #ffffff; --fg: #1f2328; --muted: #59636e; --line: #d1d9e0; --hover: #f2f4f6;
  --accent: #2563eb; --accent-fg: #ffffff; --danger: #dc2626;
  font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--fg);
}
@media (prefers-color-scheme: dark) {
  .root { --bg: #1c2128; --fg: #e6edf3; --muted: #9198a1; --line: #3d444d; --hover: #262c36; --accent: #4493f8; }
}
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.bubble {
  position: fixed; left: 0; top: 0; width: ${SIZE}px; height: ${SIZE}px; z-index: 2147483001;
  border: 0; border-radius: 50%; padding: 0; cursor: grab; touch-action: none; user-select: none;
  background: var(--accent); color: var(--accent-fg); display: grid; place-items: center; overflow: hidden;
  box-shadow: 0 4px 14px rgb(0 0 0 / 25%); transition: transform .2s ease;
}
.bubble svg { width: 26px; height: 26px; }
.bubble img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
.bubble:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.bubble.dragging { cursor: grabbing; transition: none; }
.panel {
  position: fixed; z-index: 2147483000; width: min(280px, calc(100vw - ${MARGIN * 2}px));
  background: var(--bg); border: 1px solid var(--line); border-radius: 14px; padding: 12px;
  box-shadow: 0 8px 30px rgb(0 0 0 / 20%);
}
.panel[hidden] { display: none; }
.head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.head img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.who { flex: 1; min-width: 0; }
.name { font-weight: 600; }
.tagline { color: var(--muted); font-size: 13px; }
.icon-btn { border: 0; background: none; color: var(--muted); padding: 4px; border-radius: 6px; cursor: pointer; display: grid; }
.icon-btn:hover { background: var(--hover); color: var(--fg); }
ul { list-style: none; margin: 0; padding: 0; }
a { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; color: var(--fg); text-decoration: none; }
a:hover { background: var(--hover); }
.hide { width: 100%; margin-top: 8px; padding: 6px; border: 0; border-top: 1px solid var(--line); background: none; color: var(--muted); font: inherit; font-size: 12px; cursor: pointer; }
.hide:hover { color: var(--fg); }
.target {
  position: fixed; left: 50%; bottom: 32px; width: 64px; height: 64px; margin-left: -32px; z-index: 2147483000;
  border-radius: 50%; display: grid; place-items: center; color: #fff; background: rgb(0 0 0 / 55%);
  border: 2px solid rgb(255 255 255 / 70%); transition: transform .15s ease, background .15s ease; pointer-events: none;
}
.target[hidden] { display: none; }
.target.active { transform: scale(1.25); background: var(--danger); }
@media (prefers-reduced-motion: reduce) { .bubble, .target { transition: none; } }
`;

/**
 * Builds an inline SVG icon element.
 * @param {string} name Key of {@link ICON_PATHS}.
 * @returns {SVGSVGElement} The icon.
 */
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICON_PATHS[name] ?? ICON_PATHS.link;
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
 * Mounts the widget on the page.
 * @param {object} options Widget options.
 * @param {import('./core.js').Profile} options.profile Validated profile.
 * @param {'left' | 'right'} options.position Starting side of the screen.
 * @param {string} options.hide Hide period as written in the script tag.
 * @param {(event: string, target?: string) => void} options.track Sends an anonymous count.
 * @param {() => void} options.onDismiss Called once when the visitor dismisses the widget.
 * @returns {HTMLElement} The shadow host, to allow removal.
 */
export function mount({ profile, position, hide, track, onDismiss }) {
  const host = document.createElement('aboutme-widget');
  const shadow = host.attachShadow({ mode: 'open' });
  const root = el('div', 'root');
  const style = el('style');
  style.textContent = STYLE;

  const bubble = el('button', 'bubble');
  bubble.type = 'button';
  bubble.setAttribute('aria-label', `About ${profile.name}`);
  bubble.setAttribute('aria-expanded', 'false');
  bubble.setAttribute('aria-controls', 'aboutme-panel');
  bubble.title = 'Drag to the bottom to hide';
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
  panel.setAttribute('aria-label', `About ${profile.name}`);
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
  close.setAttribute('aria-label', 'Close');
  close.append(icon('close'));
  head.append(who, close);

  const list = el('ul');
  for (const link of profile.links) {
    const item = el('li');
    const anchor = el('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.append(icon(link.icon), el('span', '', link.label));
    anchor.addEventListener('click', () => track('click', link.id));
    item.append(anchor);
    list.append(item);
  }

  const hideButton = el('button', 'hide', `Hide for ${describeDuration(hide)}`);
  hideButton.type = 'button';
  panel.append(head, list, hideButton);

  const target = el('div', 'target');
  target.hidden = true;
  target.append(icon('close'));

  root.append(style, panel, target, bubble);
  shadow.append(root);
  document.body.append(host);

  let x = 0;
  let y = 0;
  let side = position;

  /** Moves the bubble to the current coordinates. */
  function place() {
    bubble.style.transform = `translate(${x}px, ${y}px)`;
  }

  /** Snaps the bubble to the nearest side and keeps it on screen. */
  function snap() {
    const maxY = window.innerHeight - SIZE - MARGIN;
    side = x + SIZE / 2 < window.innerWidth / 2 ? 'left' : 'right';
    x = side === 'left' ? MARGIN : window.innerWidth - SIZE - MARGIN;
    y = Math.min(Math.max(y, MARGIN), Math.max(maxY, MARGIN));
    place();
  }

  /** Places the panel beside the bubble, above or below whichever has more room. */
  function placePanel() {
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const left = side === 'left' ? MARGIN : window.innerWidth - width - MARGIN;
    const above = y - height - 8;
    const top = above >= MARGIN ? above : Math.min(y + SIZE + 8, window.innerHeight - height - MARGIN);
    panel.style.left = `${Math.max(left, MARGIN)}px`;
    panel.style.top = `${Math.max(top, MARGIN)}px`;
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
      placePanel();
      track('open');
    }
  }

  /** Removes the widget and records the dismissal. */
  function dismiss() {
    track('dismiss');
    host.remove();
    window.removeEventListener('resize', snap);
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', escape);
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
   * otherwise snaps to a side. Taps are handled here rather than on `click`,
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
    else snap();
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
  window.addEventListener('resize', snap);
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', escape);

  // Place without the snap animation, so the bubble does not slide in from the corner.
  bubble.classList.add('dragging');
  x = side === 'left' ? 0 : window.innerWidth;
  y = window.innerHeight - SIZE - MARGIN * 2;
  snap();
  bubble.getBoundingClientRect();
  bubble.classList.remove('dragging');
  return host;
}
