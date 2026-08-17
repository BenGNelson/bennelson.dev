.PHONY: serve serve-quick test check-secrets sync-froggy

# Local dev on :8090 via wrangler in a container (faithful 404/_headers
# behavior; no host Node required anywhere). The named volume caches npx
# downloads so only the first start is slow. Two hard-won pins:
#  - Debian image, not alpine: wrangler spawns the workerd binary, which is
#    glibc-linked and dies with a bogus ENOENT on musl.
#  - Exact wrangler version: a bare "wrangler" sticks at whatever npx cached,
#    whose runtime eventually predates wrangler.jsonc's compatibility_date.
#    Bump WRANGLER when bumping that date.
WRANGLER := 4.123.0
serve:
	docker run --rm -it -p 8090:8090 -v "$(PWD)":/app -w /app \
		-v bennelson-dev-npx:/root/.npm \
		node:22-bookworm-slim npx --yes wrangler@$(WRANGLER) dev --ip 0.0.0.0 --port 8090

# Dumb static server fallback (no 404 routing, no headers) — fast iteration.
serve-quick:
	docker run --rm -it -p 8090:80 -v "$(PWD)/site":/usr/local/apache2/htdocs:ro httpd:2.4-alpine

test:
	scripts/test.sh

check-secrets:
	scripts/test.sh secrets

sync-froggy:
	scripts/sync-froggy.sh
