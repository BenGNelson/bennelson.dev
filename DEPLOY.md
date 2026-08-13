# Deploying bennelson.dev

The site is an **assets-only Cloudflare Worker** (no script — `wrangler.jsonc`
has no `main`), deployed by **Workers Builds** connected to this repo.

## The flow

1. Commit, run `make test`.
2. `git push origin main` → Workers Builds runs `npx wrangler deploy` → live.
3. Any other branch → a **version upload** with its own preview URL
   (find it in the build details in the dashboard).

There is no server, no vhost, no certificate renewal, and no deploy script.
The CDN cache is invalidated automatically per deploy.

## Rollback

Dashboard → the Worker → Deployments → ⋯ on any of the last 100 versions →
**Rollback**. Instant. (Or `npx wrangler rollback` from any machine with Node.)

## Custom domain

The apex is attached as a Workers **Custom Domain** (Settings → Domains &
Routes); `www` is a proxied placeholder DNS record plus a 301 Redirect Rule to
the apex — Workers custom domains match hostnames exactly, so `www` is not
covered by the apex attachment. TLS is issued and renewed by the platform.

## Gotchas

- `_headers` and `_redirects` apply only to static asset responses.
- Per-file cap is 25 MiB — nothing on this site should ever approach it; large
  media doesn't belong in this repo at all.
- The friends portal (`requests.` subdomain) is separate infrastructure — a
  tunnel from home — and deploys have no effect on it.
