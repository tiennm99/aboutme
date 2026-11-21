# Simple setup: fork and deploy

For anyone who likes the idea and wants it on their site without learning any
tools. You need only a GitHub account and a web browser: no Node.js, no
terminal, no Cloudflare. GitHub Pages hosts both the bubble's script and your
links, for free.

What you get: the bubble with your own links, on any site where you can paste one
line into the page's `<head>`. No visit counts; for those, see the
[standard setup](setup-standard.md).

## 1. Fork the repository

Open [github.com/tiennm99/aboutme](https://github.com/tiennm99/aboutme) and press
**Fork**, then **Create fork**. Keep the name `aboutme`; the addresses below
assume it.

## 2. Turn on Actions and Pages in your fork

A new fork starts with both switched off, and nothing can be published until
both are on.

1. In your fork, open the **Actions** tab and press **I understand my workflows,
   go ahead and enable them**.
2. Open **Settings** > **Pages**. Under **Build and deployment** > **Source**,
   choose **GitHub Actions**.

## 3. Put in your own links

Your links go in a **repository variable** named `ABOUTME_PROFILE`, not in a file.
The Pages build reads the variable first, so you never edit the repository's own
files, and syncing your fork later never conflicts.

1. In your fork, open **Settings** > **Secrets and variables** > **Actions** and
   select the **Variables** tab. Use **Variables**, not **Secrets**: your links are
   public on the page anyway, and a secret could not be read back to fix a typo.
2. Press **New repository variable**. Set **Name** to exactly `ABOUTME_PROFILE`
   (capital letters, one underscore).
3. Paste this into **Value**, replace the example details with yours, and press
   **Add variable**:

```json
{
  "schemaVersion": 1,
  "name": "Your name",
  "tagline": "What you do, in a few words",
  "avatar": "https://avatars.githubusercontent.com/<your-github-username>?size=96",
  "links": [
    { "id": "blog", "label": "Blog", "url": "https://example.com/", "icon": "blog" },
    { "id": "github", "label": "GitHub", "url": "https://github.com/<you>", "icon": "github" },
    { "id": "email", "label": "Email", "url": "mailto:you@example.com", "icon": "email" }
  ]
}
```

- Each link needs a unique `id` (lowercase letters, digits or `-`), the `label`
  people see, a `url` starting with `https:`, `http:` or `mailto:`, and an
  `icon`. The icons are `home`, `blog`, `github`, `facebook`, `linkedin`, `x`,
  `youtube`, `email`, `telegram`, `cv` and `link`. Up to 12 links.
- `tagline` and `avatar` are optional; delete a line you do not want, and mind the
  commas: the last item in a list has none. Keep `"schemaVersion": 1` as it is.
- Saving a variable does not publish anything by itself. Open **Actions** >
  **Pages** > **Run workflow** > **Run workflow** to publish it.

Without the variable, the build uses the original author's
`worker/public/profile.json`, so a page showing someone else's name means the
variable is missing or misnamed.

## 4. Check that it is live

Open the **Actions** tab and wait for the **Pages** run to show a green tick
(about a minute). Then open:

```text
https://<your-github-username>.github.io/aboutme/
```

The page shows the bubble with your links and the exact line to copy into your
site. If the run is red, open it: the build checks your profile and stops with a
message saying what is wrong, such as a missing comma or a link with a bad URL.
Fix the variable and run the workflow again.

## 5. Add the bubble to your site

Paste this into the `<head>` of every page, or of the shared layout or template
your site builder uses:

```html
<script
  src="https://<your-github-username>.github.io/aboutme/aboutme.js"
  data-profile="https://<your-github-username>.github.io/aboutme/profile.json"
  defer
></script>
```

Optional attributes such as `data-hide="7d"`, `data-position="bottom-left"` or
`data-layout="list"` are listed in [usage.md](usage.md#script-tag-options).

## Changing your links later

Edit the `ABOUTME_PROFILE` variable (**Settings** > **Secrets and variables** >
**Actions** > **Variables**, then the pencil icon), then run the **Pages**
workflow again. GitHub Pages caches files for 10 minutes, so give it that long
after the run turns green.

## Getting widget updates

Your fork keeps the widget version it was built from. To take newer versions,
press **Sync fork** > **Update branch** on your fork's main page; the Pages
workflow then rebuilds. If nothing starts, open **Actions** > **Pages** > **Run
workflow**.

Your links live in the variable, which a sync never touches. If you edited files
in your fork instead, a sync can clash with them; GitHub then offers to open a
pull request, which you resolve by keeping your own lines. You never have to
sync; your copy keeps working as it is.

## Limits

- No visit counts.
- No version pinning or [SRI](usage.md#script-tag-options) on the script.
- Several project sites on the same `github.io` address share the hide period;
  see [known issues](known-issues.md).

When you want counts, a global CDN with versioned releases, or your own domain,
move to the [standard setup](setup-standard.md). Copy your variable's value into
`worker/public/profile.json` there, and add `"events": "/e"`.
