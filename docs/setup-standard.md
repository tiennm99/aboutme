# Standard setup: CDN and counts

For anyone who wants the bubble to be dependable and to see how it is used. You
deploy one small Cloudflare Worker of your own; the widget script comes from the
published npm package through jsDelivr.

What you get over the [simple setup](setup-simple.md):

- **A global CDN for the script.** jsDelivr serves `@tiennm99/aboutme` with
  versioned releases: `@1` takes every compatible update, and an exact version
  can be pinned with SRI ([usage.md](usage.md#script-tag-options)).
- **Your profile at the edge.** The Worker serves `profile.json` from Cloudflare's
  network with a one-hour browser cache.
- **Anonymous counts** of opens, link clicks and dismissals per site, with no
  cookies, IPs or visitor ids ([usage.md](usage.md#anonymous-counts)).
- **Room to grow:** your own domain, dashboards and more in
  [going further](going-further.md).

It all fits Cloudflare's free plan: Workers Analytics Engine includes 100,000
written data points and 10,000 read queries a day
([pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/)).

## You need

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free).
- [Node.js](https://nodejs.org/) 24, the version CI uses, with npm.
- git and a GitHub account.

## 1. Get the code

Fork [tiennm99/aboutme](https://github.com/tiennm99/aboutme) on GitHub and clone
your fork:

```sh
git clone https://github.com/<you>/aboutme.git
cd aboutme
npm install
```

A fork runs no workflows until you enable them in its **Actions** tab. If you
enable them for CI, also disable the **Pages** workflow there (**Actions** >
**Pages** > **...** > **Disable workflow**): it belongs to the simple setup and
fails while Pages is off.

## 2. Put in your own links

Edit [`worker/public/profile.json`](../worker/public/profile.json). The format is
in [usage.md](usage.md#profile-format). Keep `"events": "/e"`: it tells the
widget where to send counts. The Worker accepts click counts only for the link
ids in this file, so redeploy whenever you add, remove or rename a link.

Optionally rename the Worker: `name` in
[`worker/wrangler.jsonc`](../worker/wrangler.jsonc) becomes part of its address.

## 3. Deploy

```sh
npx -w worker wrangler login   # opens a Cloudflare sign-in page; on a machine without a browser, copy the URL it prints
npm run check                  # lint, build, size budget, unit tests
npm run deploy
```

The first deploy asks you to pick a `workers.dev` subdomain if your account has
none. It ends by printing the Worker's address, such as
`https://aboutme.<your-subdomain>.workers.dev`. Check it:

```sh
curl -i https://aboutme.<your-subdomain>.workers.dev/profile.json
```

You should see your profile, `access-control-allow-origin: *` and a
`cache-control` header.

## 4. Add the bubble to your sites

Put this in the `<head>` of every site:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@tiennm99/aboutme@1"
  data-profile="https://aboutme.<your-subdomain>.workers.dev/profile.json"
  data-hide="7d"
  defer
></script>
```

All options are in [usage.md](usage.md#script-tag-options). A site with a
Content-Security-Policy must allow `cdn.jsdelivr.net` in `script-src` and the
Worker's address in `connect-src`.

Keep a list of the sites that carry the tag (this repository keeps its own in
[installed-sites.md](installed-sites.md)), so you can check them after a widget
update.

## 5. Read the counts

Counts show up a few minutes after the first visits. Read them with the
[Analytics Engine SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/):

1. In the Cloudflare dashboard, create an API token with the **Account Analytics:
   Read** permission, and note your account ID (on the Workers overview page).
2. Run the query, with the token typed in at the prompt so it stays out of your
   shell history:

```sh
printf 'API token: '; read -rs CF_TOKEN; echo
curl -s "https://api.cloudflare.com/client/v4/accounts/<account-id>/analytics_engine/sql" \
  -H "Authorization: Bearer $CF_TOKEN" \
  --data "SELECT blob1 AS site, blob2 AS event, blob3 AS link, SUM(_sample_interval) AS count
FROM aboutme_events
WHERE timestamp > NOW() - INTERVAL '30' DAY
GROUP BY site, event, link
ORDER BY count DESC"
```

The columns are described in [usage.md](usage.md#anonymous-counts).

## Keeping it up to date

- **Links:** edit `profile.json` and run `npm run deploy`. Browsers keep the old
  copy for up to an hour, and returning visitors may see it once more after that.
- **Widget:** nothing to do. Sites on `@1` get every 1.x release from jsDelivr.
  A breaking change comes as `@2`, and `@1` keeps working until you move.
- **Worker code:** sync your fork (or `git pull upstream main`), then
  `npm install`, `npm run check` and `npm run deploy`.

Moving from the simple setup: copy your `ABOUTME_PROFILE` variable's value into
`worker/public/profile.json`, add `"events": "/e"`, deploy the Worker as above,
then change both URLs in your script tag.
