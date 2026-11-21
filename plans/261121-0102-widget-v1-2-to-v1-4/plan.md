# Widget v1.2.0 to v1.4.0

Status: done (2026-11-21). v1.2.0 reviewed, checked on the installed
sites and released; v1.3.0, v1.4.0, v1.5.0 (accent), v1.6.0 (orbit) and v1.7.0 (orbit by default) released.

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

Done. Five brand marks from simple-icons (CC0). LinkedIn keeps the generic icon:
simple-icons removed its mark because LinkedIn's brand policy forbids most use.
The size gate's budget is 17.5 KB (the build is 17.2 KB); the old 13 KB target
was dropped because the brand paths add about 2.7 KB. Review found no code bugs;
the site check passed in round 1.

- `data-layout="list|grid|icons"`, default `list`. `grid` shows tiles with an
  11 px caption, 4 columns. `icons` hides the caption visually but keeps it as
  the accessible name and `title`.
- Prerequisite: real brand marks for github, facebook, linkedin, x, youtube
  and telegram (filled paths, so `icon()` needs a fill variant). Check each
  mark's source and licence.
- A bundle size check in CI.

## v1.4.0: placement and language

Done. Review found one real bug (a `/cv/` link stayed visible on `/cv`), fixed.
Position memory is on by default; it only changes anything for a visitor who
drags. The site check passed in round 1; `top-left` sits on the header of all
three installed sites, so they keep the default corner. Bundle 18.9 KB, budget
19.2 KB.

- `data-position` corners (`top-left|top-right|bottom-left|bottom-right`;
  `left`/`right` stay as bottom) and `data-offset`.
- Remember the dragged position in `localStorage` (the visitor's own choice).
- Vietnamese UI strings: `data-lang`, then `<html lang>`, then English.
- Hide the link that points to the current site.
- Skip counts when `navigator.globalPrivacyControl` is set.

## v1.5.0: accent colour

Done. Optional `accent` in the profile (`#rgb` or `#rrggbb` only), used for the
bubble and focus rings in both themes, with the icon colour picked for
contrast. Additive, still schema version 1. Size budget raised to 19.7 KB.

## v1.6.0: orbit layout

`data-layout="orbit"`, opt-in. Round link icons fly out from the bubble onto
arcs facing the middle of the screen, the inner ring filling first, with no
panel, name or tagline. Hide is the last icon, so keyboard visitors can still
dismiss. The label shows as a chip beside an icon only on keyboard focus; the
arrow keys step through the icons and wrap. No fallback to another layout.
Review found a hang on windows under 76 px tall, link chips clipped by the
grid rules, chips running off phone screens, an unlabelled Hide for pointer
users, and modifier arrows swallowed; all fixed with tests. Crowding on short
windows is a known issue. Size budget raised to 22.65 KB (about 9.3 KB gzipped).

## v1.7.0: orbit by default

Orbit becomes the layout when the tag names none or an unknown one, at the
user's choice, so every site on `@1` switches without editing its tag. Sites
that want the panel set `data-layout="list"`. Released as a minor version so
`@1` sites get it.

## Skipped

Cross-site dismissal, attention animations, a JS event API, and `rel="me"`.
