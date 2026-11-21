# Widget v1.2.0 to v1.4.0

Status: in progress (2026-11-21). v1.2.0 reviewed, checked on the installed
sites and released; v1.3.0 next.

Scope comes from an advisor review of v1.1.0. The review read the code and live
CSS but did not run a browser, so its pixel numbers are estimates. Nothing here
needs `schemaVersion` 2.

## Process for each release

1. Implement with tests.
2. Review by three independent reviewers (geometry, theme, regressions and
   accessibility); fix the findings that hold up.
3. Load the local build into every site in
   [docs/installed-sites.md](../../docs/installed-sites.md) through Playwright
   (route the jsDelivr URL to `widget/dist/aboutme.js`, stub `POST /e`), at
   1280x800, 1280x650, Pixel 7 portrait and 915x412 landscape, light and dark.
   Fix widget bugs found there.
4. Release through a `v*` tag, then check the live sites again.

## v1.2.0: theme detection and overflow fixes

Done. Review found 6 real issues (all fixed); the site check found widget bugs
in round 1, fixed and rechecked clean in round 2. 58 e2e tests pass. The bundle
is 14.0 KB minified, over the 13 KB target.

- `data-theme="auto|light|dark"`, default `auto`. Auto detection order: opaque
  `body` then `html` background; a `dark`/`light` class or `data-theme`-style
  attribute (a missing marker never means light); `body` text colour;
  `prefers-color-scheme` only for mid-grey text. `brightnessOf` handles `rgb`,
  `rgba`, `oklch`, `oklab`, `lab`, `color(srgb)`, and returns null for
  transparent or unknown. Re-detect on open, on `matchMedia` change, and on
  `html`/`body` attribute changes (plus one re-measure about 400 ms later).
- Overflow fixes:
  1. The panel scrolls within a height cap.
  2. The panel never overlaps the bubble, except below about 372 px wide with
     no room above or below, where it opens over it.
  3. Resizing re-places an open panel.
  4. Resizing keeps the bubble's side.
  5. The bubble keeps its vertical position across rotation.
  6. Widths use `clientWidth`, so scrollbars aren't counted.
  7. Long text wraps or clamps.
  8. The bubble comes before the panel in tab order.
  9. The bubble is hidden when printing.
- Polish: close button aligned to the top of the header; a 120 ms open
  animation that respects reduced motion.
- Bundle budget: under about 13 KB minified.

## v1.3.0: layouts and brand icons

- `data-layout="list|grid|icons"`, default `list`. `grid` shows tiles with an
  11 px caption, 4 columns. `icons` hides the caption visually but keeps it as
  the accessible name and `title`.
- Prerequisite: real brand marks for github, facebook, linkedin, x, youtube
  and telegram (filled paths, so `icon()` needs a fill variant). Check each
  mark's source and licence.
- A bundle size check in CI.

## v1.4.0: placement and language

- `data-position` corners (`top-left|top-right|bottom-left|bottom-right`;
  `left`/`right` stay as bottom) and `data-offset`.
- Remember the dragged position in `localStorage` (the visitor's own choice).
- Vietnamese UI strings: `data-lang`, then `<html lang>`, then English.
- Hide the link that points to the current site.
- Skip counts when `navigator.globalPrivacyControl` is set.

## Later

- An optional `accent` colour in the profile (additive field).

## Skipped

Cross-site dismissal, attention animations, a JS event API, and `rel="me"`.
