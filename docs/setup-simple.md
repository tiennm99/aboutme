# Simple setup

For anyone who likes the idea and wants it on their site without learning any
tools. The quickest way needs nothing but the ability to paste one tag into your
pages: no account, no Node.js, no Cloudflare.

The [demo page](https://tiennm99.github.io/aboutme/) does steps 1 to 3 for you:
edit your links there and press **Copy** on the tag you want.

What you get: the bubble with your own links. No visit counts; for those, see
the [standard setup](setup-standard.md).

## 1. Write your links

Your links are a small JSON document, the profile:

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
  `icon`: `home`, `blog`, `github`, `facebook`, `linkedin`, `x`, `youtube`,
  `email`, `telegram`, `cv` or `link`. Up to 12 links.
- `tagline` and `avatar` are optional. Mind the commas: the last item in a list
  has none. Keep `"schemaVersion": 1` as it is.

The full format is in [usage.md](usage.md#profile-format).

## 2. Choose where your links live

| | Where | Best for |
| --- | --- | --- |
| A | Inside the script tag | One site, or the fewest steps |
| B | A `profile.json` file on your site | Keeping links apart from the page code |
| C | Your fork's GitHub Pages | Several sites sharing one list of links |

### A: inside the script tag

Put the JSON between the opening and closing script tags (step 3 shows it in
place). Browsers never run text inside a tag that has `src`, so the widget reads
it from there. Nothing else to host. Needs widget 1.8.0 or later.

### B: a file on your site

Save the JSON as `profile.json` and upload it with your pages. In step 3, point
`data-profile` at it: a path such as `/profile.json` for the same site, or a full
`https://` address. A file on another host must be served with
`Access-Control-Allow-Origin: *` (GitHub Pages does this).

### C: your fork's GitHub Pages

One list of links, shared by every site you put the tag on, changed in one place.

1. Fork [tiennm99/aboutme](https://github.com/tiennm99/aboutme) on GitHub. Keep
   the name `aboutme`; the addresses below assume it.
2. In the fork, open the **Actions** tab and press **I understand my workflows,
   go ahead and enable them**. Then open **Settings** > **Pages** and, under
   **Build and deployment** > **Source**, choose **GitHub Actions**. A new fork
   has both switched off.
3. Open **Settings** > **Secrets and variables** > **Actions**, select the
   **Variables** tab, and press **New repository variable**. Set **Name** to
   exactly `ABOUTME_PROFILE` and paste your JSON into **Value**.
   - Use **Variables**, not **Secrets**: your links are public on the page
     anyway, and a secret could not be read back to fix a typo.
   - Keeping the links in a variable, not in a file, means syncing your fork
     later never conflicts.
4. Open **Actions** > **Pages** > **Run workflow**. Saving a variable does not
   publish anything by itself.
5. When the run shows a green tick, open
   `https://<your-github-username>.github.io/aboutme/`: the bubble there shows
   your links. If the run is red, open it: the build checks your profile and
   says what is wrong. Fix the variable and run it again.

Your profile is then at
`https://<your-github-username>.github.io/aboutme/profile.json`. Without the
variable, the build uses the original author's `worker/public/profile.json`, so
a page showing someone else's name means the variable is missing or misnamed.

To change your links later, edit the variable (pencil icon) and run the
**Pages** workflow again. GitHub Pages caches files for 10 minutes.

## 3. Choose where the script comes from

Paste one tag into the `<head>` of every page, or of the shared layout or
template your site builder uses. The examples below embed the profile (A). For B
or C, leave the tag empty and add `data-profile` instead:

```html
<script src="https://cdn.jsdelivr.net/npm/@tiennm99/aboutme@1"
  data-profile="https://<your-github-username>.github.io/aboutme/profile.json" defer></script>
```

### 1. From npm, through the jsDelivr CDN (recommended)

```html
<script src="https://cdn.jsdelivr.net/npm/@tiennm99/aboutme@1" defer>
{ "schemaVersion": 1, "name": "Your name", "links": [
  { "id": "github", "label": "GitHub", "url": "https://github.com/<you>", "icon": "github" }
] }
</script>
```

- **Faster for returning visitors.** jsDelivr lets browsers keep the script for
  7 days; GitHub Pages only for 10 minutes, after which the browser checks again.
  A first visit is about as fast either way, since both are served from CDNs
  near the visitor.
- **Updates on its own.** `@1` follows every compatible release. A breaking
  change comes as `@2` and never reaches `@1` sites.
- **Can be pinned.** Swap `@1` for an exact version with an
  [SRI hash](usage.md#script-tag-options) if a site must never change unreviewed.

### 2. From this project's GitHub Pages

```html
<script src="https://tiennm99.github.io/aboutme/aboutme.js" defer>
{ ... your profile ... }
</script>
```

Built from this repository's latest code on every change, with no npm involved.
It is not versioned, so it changes whenever the project does, and it can be a
step ahead of the npm release. With option C, your fork serves the same file at
`https://<your-github-username>.github.io/aboutme/aboutme.js`, which changes only
when you sync your fork (**Sync fork** > **Update branch**).

### 3. Self-hosted on your own site

Download [aboutme.js](https://tiennm99.github.io/aboutme/aboutme.js), upload it
with your pages, and load it from there:

```html
<script src="/aboutme.js" defer>
{ ... your profile ... }
</script>
```

Nothing loads from another host, which keeps a strict Content-Security-Policy
simple, and the script changes only when you replace the file. To update,
download it again.

Optional attributes such as `data-hide="7d"`, `data-position="bottom-left"` or
`data-layout="list"` work with every option and are listed in
[usage.md](usage.md#script-tag-options).

## Limits

- No visit counts.
- Options 2 and 3 have no version to pin or check with SRI.
- Several project sites on the same `github.io` address share the hide period;
  see [known issues](known-issues.md).

When you want counts or your own domain, move to the
[standard setup](setup-standard.md). Copy your profile into
`worker/public/profile.json` there, and add `"events": "/e"`.

## Ideas, problems, improvements

If something is unclear, broken, or could be better, please
[open an issue](https://github.com/tiennm99/aboutme/issues/new): a question, a
bug, or an idea such as a new icon or language is all welcome. Pull requests are
welcome too; [usage.md](usage.md#development) shows how to build and test. A
change made here reaches everyone on `@1`, including you.
