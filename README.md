# bennelson.dev

Personal site, built as what it documents: a service dashboard. Portfolio as
running services, a homelab tour with the machines renamed to kitchen
appliances, and the [froggy-bird](https://github.com/BenGNelson/froggy-bird)
field simulator at `/froggy-bird`.

Ships with a **Professional Mode toggle** that starts ON. What happens when you
turn it off is between you and the frogs.

_AI-assisted build._

## Stack

Hand-written static HTML/CSS/JS — no framework, no build step, no external
requests of any kind (the CSP enforces it). Hosted on Cloudflare Workers as an
assets-only Worker; deploys are `git push`.

## Development

```bash
make serve         # wrangler dev in a container on :8090 (real 404/_headers behavior)
make serve-quick   # dumb static server, fastest iteration
make test          # syntax, link check, vendored-module drift, forbidden-pattern scan
make sync-froggy   # pull froggy-bird from a sibling checkout into site/vendor/
```

## Layout

```
wrangler.jsonc   assets-only Worker config (site/ is the deployed directory)
site/            the site: index, homelab/, froggy-bird/, contact/,
                 hq-demo/, 404.html, _headers
site/js/mode.js  the Professional Mode machine (pro/frog)
site/vendor/     synced copies of external modules — never edited in place
```
