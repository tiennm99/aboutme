# Known issues

- **Dismissal is per site.** Browsers keep each site's storage separate, so hiding
  the bubble on one site does not hide it on another. Sharing it would need a
  cross-site id, which this project avoids on purpose.
- **Counts can be faked.** `POST /e` is open, so anyone can send counts. It only
  accepts known events and link ids, so fake counts can inflate numbers but not
  write arbitrary data.
- **Auto theme reads only `<html>` and `<body>`.** A dark page painted on a
  wrapper element is seen as light; such sites set `data-theme`. A theme that
  fades in over more than about 0.8 s may be read mid-fade while the panel is
  open; reopening the panel picks it up.
- **On very small screens** (narrower than about 372 px with no room above or
  below the bubble, such as heavy zoom) the panel opens over the bubble; it
  still scrolls and closes normally.
- **The orbit layout crowds on short or very narrow windows.** With many links,
  on a window under about 300 px tall (a short desktop window, a phone in split
  screen) or under about 260 px wide, outer icons can touch or overlap. Common
  phone and desktop sizes, portrait and landscape, are clear.
- **Shared hosts share state.** Sites on one origin (project pages under one
  `github.io` host) share the hide period and the remembered position, and a
  link to that host's root is hidden on all of them.
- **Ad blockers** may block the count requests; the bubble still works.
- **The simple setup has fewer guarantees.** It sends no counts, its script has no
  version to pin or check with SRI, GitHub Pages caches files for 10 minutes, and
  changing the `ABOUTME_PROFILE` variable publishes nothing until the Pages
  workflow runs again ([setup-simple.md](setup-simple.md)).
