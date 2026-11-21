# Going further

Ideas worth the extra setup once the [standard setup](setup-standard.md) runs.
They are suggestions, not features: each one says whether today's code already
allows it or what it would take.

| Idea | Effort | Code change |
| --- | --- | --- |
| Your own domain | Low | None |
| Pinned widget version with SRI | Low | None |
| Different links per site | Low | None (with a limit) |
| Counts dashboard | Medium | None |
| Weekly counts report | Medium | Worker |
| Rate-limited counts | Medium | Worker |
| Edit links without a deploy | High | Worker |
| Your own widget build | High | Widget, release |

## Your own domain

Serve the Worker from a hostname on a domain you already have on Cloudflare,
such as `about.example.com`, instead of `workers.dev`. It looks more trustworthy
in a site's CSP and network tab, and you can move the Worker later without
editing every site again. Add a
[custom domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
to `worker/wrangler.jsonc` (`"routes": [{ "pattern": "about.example.com",
"custom_domain": true }]`), deploy, then update `data-profile` and each site's
`connect-src`.

## Pinned widget version with SRI

`@1` takes every 1.x release automatically. A site that must never change
without review can load an exact file such as
`@tiennm99/aboutme@1.7.0/dist/aboutme.js` with an `integrity` hash, so the browser
refuses any other content ([usage.md](usage.md#script-tag-options)). The cost is
updating each such site by hand.

## Different links per site

`data-profile` takes any URL, so a second file in `worker/public/`, such as
`profile-work.json` with only professional links, works for the bubble today.
The limit: the Worker accepts click counts only for link ids in
`profile.json`, so clicks on a link that exists only in the second file are
dropped. Keep the ids a subset of `profile.json`, or extend the Worker to load
every profile's ids.

## Counts dashboard

Instead of running SQL by hand, chart the counts per site and per link in
Grafana: Cloudflare documents
[querying Analytics Engine from Grafana](https://developers.cloudflare.com/analytics/analytics-engine/grafana/).
Grafana Cloud's free tier is enough, and the token needs only **Account
Analytics: Read**.

## Weekly counts report

Add a [Cron Trigger](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
to the Worker that runs the counts query once a week and sends the totals to you
by Telegram or email. It needs a `scheduled` handler, the analytics token stored
as a [Worker secret](https://developers.cloudflare.com/workers/configuration/secrets/),
and a bot token or mail service. Useful if you would otherwise never look.

## Rate-limited counts

`POST /e` is open, so anyone can inflate counts
([known issues](known-issues.md)). The
[Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
can cap requests per key per minute. Keying it by IP would rate-limit fakes
best, but it brings visitor IPs into the Worker's logic, even if they are never
stored; keying by site hostname avoids that and still bounds the damage. Decide
which fits your privacy promise before adding it.

## Edit links without a deploy

Keep the profile in [Workers KV](https://developers.cloudflare.com/kv/) and add
a small edit page behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/),
so a link can change from your phone. Today the profile is a static asset and
the Worker reads link ids at build time, so this means serving the profile from
the Worker and validating it against `widget/profile.schema.json` on save. Worth
it only if your links change often.

## Your own widget build

Changing the widget itself (new icons, another language, a different look)
means publishing your own build: rename the package in `widget/package.json` to
your npm scope, set up
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers) for your
fork, and release by tag as in [usage.md](usage.md#releasing-the-widget). Your
sites then load your package from jsDelivr. Before forking the widget, consider
opening an issue or pull request here, so everyone gets the change and you keep
taking updates.
