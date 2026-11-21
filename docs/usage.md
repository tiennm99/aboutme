# Usage

## Script tag options

| Attribute | Default | Meaning |
| --- | --- | --- |
| `data-profile` | required | URL of the profile JSON |
| `data-hide` | `7d` | How long the bubble stays hidden after a dismissal: a number and `m`, `h`, `d` or `w` (`30m`, `12h`, `1d`, `2w`) |
| `data-position` | `right` | Starting side: `left` or `right` |
| `data-theme` | `auto` | Colours: `auto` matches the page (its background, a `dark`/`light` class or `data-theme`-style attribute on `<html>` or `<body>`, its text colour, then the system setting) and follows it when it changes; `light` or `dark` fixes them |
| `data-layout` | `list` | How links show: `list` is one row each with icon and label; `grid` is tiles, the icon above an 11 px caption, up to 4 a row; `icons` is the same tiles without the caption, which stays the link's accessible name and tooltip |

Auto mode reads only `<html>` and `<body>`. A site that paints its background
and text on a wrapper element, or switches theme by swapping a stylesheet,
should set `data-theme` (or a `dark`/`light` class on `<html>`).

Load it with `defer` so it never blocks the page. Major tag `@1` follows every 1.x
release. To pin an exact file and check its hash with
[SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity),
use a full version such as `@tiennm99/aboutme@1.0.0/dist/aboutme.js` with an
`integrity` attribute; SRI does not work with `@1`, whose content changes.

A site with a Content-Security-Policy must allow `cdn.jsdelivr.net` in
`script-src` and the Worker's origin in `connect-src`.

## Profile format

[`widget/profile.schema.json`](../widget/profile.schema.json) is the contract; the
Worker's tests check `profile.json` against it.

```json
{
  "schemaVersion": 1,
  "name": "Your name",
  "tagline": "Optional short line",
  "avatar": "https://... (optional, https only)",
  "events": "/e",
  "links": [
    { "id": "github", "label": "GitHub", "url": "https://github.com/you", "icon": "github" }
  ]
}
```

- `icon` is one of `home`, `blog`, `github`, `facebook`, `linkedin`, `x`,
  `youtube`, `email`, `telegram`, `cv`, `link` (the default). `github`,
  `facebook`, `x`, `youtube` and `telegram` show the brand's mark; LinkedIn's
  brand policy does not allow its logo here, so `linkedin` shows a generic icon.
- Link URLs must be `https:`, `http:` or `mailto:`; anything else is dropped.
- Unknown fields are ignored, so adding an optional field needs no new version.
  A breaking change raises `schemaVersion` together with a new widget major
  (`@2`), and the Worker serves both until every site has moved.
- Leave out `events` to send no counts.

The Worker serves `profile.json` with `Cache-Control: max-age=3600,
stale-while-revalidate=86400`. A visitor's browser keeps a copy for an hour and may
show it once more while fetching the new one in the background, so an edit can take
up to a day to reach a returning visitor and reaches new visitors right away.

## Anonymous counts

The widget sends `{"event":"open"}`, `{"event":"click","target":"<link id>"}` or
`{"event":"dismiss"}` to `POST /e`. The Worker takes the site from the browser's
`Origin` header, accepts only known events and link ids, and writes one data point
to the Workers Analytics Engine dataset `aboutme_events`:

| Column | Value |
| --- | --- |
| `index1`, `blob1` | Site hostname |
| `blob2` | `open`, `click` or `dismiss` |
| `blob3` | Link id for clicks, empty otherwise |

No cookie, IP, visitor id or user agent is stored, and Workers logs are off. The
only thing kept in the visitor's browser is the dismissal time, a choice the
visitor made, which is never sent.

Query the counts with the
[Analytics Engine SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/):

```sql
SELECT blob1 AS site, blob2 AS event, blob3 AS link, SUM(_sample_interval) AS count
FROM aboutme_events
WHERE timestamp > NOW() - INTERVAL '30' DAY
GROUP BY site, event, link
ORDER BY count DESC
```

## Development

```sh
npm install
npm run check        # lint, build, bundle size budget, unit tests
npm run test:e2e     # Playwright drag and dismiss tests, desktop and touch
npm run dev -w worker
```

The e2e tests use the system Chrome (`channel: 'chrome'`). Set `PW_CHANNEL=` to
use Playwright's bundled Chromium instead (`npx playwright install chromium`).

### Releasing the widget

The `Publish` workflow (`.github/workflows/publish.yml`) publishes on a `v*` tag
through npm trusted publishing, so no npm token is needed. It checks that the tag
matches the widget's version, runs every check and the e2e tests, then publishes.
`npm version` inside a workspace does not tag, so tag by hand:

```sh
npm version patch -w widget          # or minor / major
v=$(node -p "require('./widget/package.json').version")
git commit -am "chore(widget): release v$v"
git tag -a "v$v" -m "v$v"   # annotated, so --follow-tags pushes it
git push --follow-tags
```

A major release (`2.0.0`) is for breaking changes, such as a new `schemaVersion`;
sites on `@1` keep the old major.
