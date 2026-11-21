# aboutme

A floating bubble for your websites. Click it to see links about you (homepage,
blog, GitHub, ...). Drag it onto the target at the bottom of the screen, like an
Android chat bubble, or press "Hide", and it stays hidden for a period you choose.

Demo: [tiennm99.github.io/aboutme](https://tiennm99.github.io/aboutme/).

## Pick a setup

| | [Simple](docs/setup-simple.md) | [Standard](docs/setup-standard.md) |
| --- | --- | --- |
| For | Trying the idea with no tools | A dependable setup with counts |
| You need | A GitHub account | Cloudflare account, Node.js |
| Script from | Your GitHub Pages | jsDelivr CDN, versioned |
| Links from | Your GitHub Pages | Your Cloudflare Worker |
| Anonymous counts | No | Yes |

Ideas beyond the standard setup: [docs/going-further.md](docs/going-further.md).

## Quick start (simple)

1. Fork this repository, enable **Actions** in the fork, and set **Settings** >
   **Pages** > **Source** to **GitHub Actions**.
2. Put your profile JSON in the repository variable `ABOUTME_PROFILE`, then run
   the **Pages** workflow.
3. Add this to the `<head>` of your site:

```html
<script
  src="https://<you>.github.io/aboutme/aboutme.js"
  data-profile="https://<you>.github.io/aboutme/profile.json"
  defer
></script>
```

Step by step: [docs/setup-simple.md](docs/setup-simple.md).

## More

- `widget/`: the bubble, published to npm as `@tiennm99/aboutme`.
- `worker/`: a Cloudflare Worker that serves `profile.json` and keeps anonymous
  counts of opens, link clicks and dismissals. No cookies, IPs or visitor ids.

Options, the profile format, counts and development: [docs/usage.md](docs/usage.md).
Known issues: [docs/known-issues.md](docs/known-issues.md). Sites using the widget:
[docs/installed-sites.md](docs/installed-sites.md).

## License

[MIT](LICENSE)
