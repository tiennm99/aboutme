# aboutme

Let visitors of every site you build find the rest of you. aboutme adds one
small floating bubble to your pages; tap it and your blog, GitHub, CV, LinkedIn
and email fly out around it. One line of HTML, one list of links for all your
sites, no framework, no cookies.

- **Feels native:** drag it like an Android chat bubble, drop it on the target
  to hide it, or press "Hide" for a period you choose.
- **Fits any page:** follows the page's light or dark theme, English and
  Vietnamese, four layouts, keyboard and screen-reader friendly.
- **Free to run:** GitHub Pages alone is enough; add a Cloudflare Worker for
  anonymous counts of opens and clicks.

Demo: [tiennm99.github.io/aboutme](https://tiennm99.github.io/aboutme/).

## Quick start

Save your links as `profile.json` on your site (format below), then paste this
into the `<head>` of your pages:

```html
<script src="https://cdn.jsdelivr.net/npm/@tiennm99/aboutme@1" data-profile="/profile.json" defer></script>
```

```json
{ "schemaVersion": 1, "name": "Your name", "links": [
  { "id": "blog", "label": "Blog", "url": "https://example.com/", "icon": "blog" },
  { "id": "github", "label": "GitHub", "url": "https://github.com/you", "icon": "github" }
] }
```

The [demo page](https://tiennm99.github.io/aboutme/) has these ready to copy.

## Pick a setup

| | [Simple](docs/setup-simple.md) | [Standard](docs/setup-standard.md) |
| --- | --- | --- |
| For | Trying the idea with no tools | A dependable setup with counts |
| You need | Nothing (a GitHub account for a shared links file) | Cloudflare account, Node.js |
| Script from | jsDelivr CDN, this project's Pages, or your own site | jsDelivr CDN |
| Links from | The script tag, a file on your site, or your fork's Pages | Your Cloudflare Worker |
| Anonymous counts | No | Yes |

Ideas beyond the standard setup: [docs/going-further.md](docs/going-further.md).

## More

- `widget/`: the bubble, published to npm as `@tiennm99/aboutme`.
- `worker/`: a Cloudflare Worker that serves `profile.json` and keeps anonymous
  counts of opens, link clicks and dismissals. No cookies, IPs or visitor ids.

Options, the profile format, counts and development: [docs/usage.md](docs/usage.md).
Known issues: [docs/known-issues.md](docs/known-issues.md). Sites using the widget:
[docs/installed-sites.md](docs/installed-sites.md).

## Contributing

Questions, bugs and ideas (a new icon, a new language, a layout) are welcome as
[issues](https://github.com/tiennm99/aboutme/issues/new), and pull requests too:
[docs/usage.md](docs/usage.md#development) shows how to build and test. Every
improvement here reaches all sites on `@1`. If aboutme is on your site, a star
helps others find it.

## License

[Apache License 2.0](LICENSE)
