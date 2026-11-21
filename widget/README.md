# @tiennm99/aboutme

A floating "about me" bubble for any website: one script tag, and your blog,
GitHub, CV and socials fly out around it. Drag it onto the target at the bottom of
the screen, or press "Hide", and it stays hidden for a period you choose. No
framework, no cookies. [Live demo](https://tiennm99.github.io/aboutme/).

```html
<script
  src="https://cdn.jsdelivr.net/npm/@tiennm99/aboutme@1"
  data-profile="https://example.com/profile.json"
  defer
></script>
```

Or put the profile JSON inside the script tag instead of `data-profile`. The
profile format is in [`profile.schema.json`](profile.schema.json). Setups (GitHub Pages, or a
Cloudflare Worker with anonymous counts) and options: [github.com/tiennm99/aboutme](https://github.com/tiennm99/aboutme).

MIT licensed.
