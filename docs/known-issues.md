# Known issues

- **Dismissal is per site.** Browsers keep each site's storage separate, so hiding
  the bubble on one site does not hide it on another. Sharing it would need a
  cross-site id, which this project avoids on purpose.
- **Counts can be faked.** `POST /e` is open, so anyone can send counts. It only
  accepts known events and link ids, so fake counts can inflate numbers but not
  write arbitrary data.
- **Ad blockers** may block the count requests; the bubble still works.
