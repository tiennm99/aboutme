# aboutme

A floating bubble for your websites. Click it to see links about you (homepage,
blog, GitHub, ...). Drag it onto the target at the bottom of the screen, like an
Android chat bubble, or press "Hide", and it stays hidden for a period you choose.

- `widget/`: the bubble, published to npm as `@tiennm99/aboutme` and loaded from
  jsDelivr.
- `worker/`: a Cloudflare Worker that serves your `profile.json` and keeps anonymous
  counts of opens, link clicks and dismissals. No cookies, IPs or visitor ids.

## Quick start

Add this to the `<head>` of every site:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@tiennm99/aboutme@1"
  data-profile="https://aboutme.tiennm99.workers.dev/profile.json"
  data-hide="7d"
  defer
></script>
```

Edit your links in [`worker/public/profile.json`](worker/public/profile.json), then deploy:

```sh
npm install
npm run check
npm run deploy
```

Options, the profile format, counts and development: [docs/usage.md](docs/usage.md).
Known issues: [docs/known-issues.md](docs/known-issues.md). Sites using the widget:
[docs/installed-sites.md](docs/installed-sites.md).

## License

[MIT](LICENSE)
