# E2E Auth Checks

These scripts validate Firebase email link URLs and follow a magic link end-to-end.

## Requirements
- Node 18+
- Repo root `type: module`

## Scripts

### redirects-oobcode.js
Validates `oobCode`, `apiKey`, and `continueUrl` in one or more magic links.

Examples:
```sh
node tests/e2e/redirects-oobcode.js "<MAGIC_LINK_URL>"
E2E_MAGIC_LINK_URLS="<URL1>,<URL2>" node tests/e2e/redirects-oobcode.js
```

Configure allowed continue URLs (defaults to client/admin login):
```sh
E2E_ALLOWED_CONTINUE_URLS="https://solaire-frontend.web.app/client/login,https://solaire-frontend.web.app/admin/login" \
  node tests/e2e/redirects-oobcode.js "<MAGIC_LINK_URL>"
```

### e2e-magic-link-auto-follow.js
Follows a magic link and reports the final URL/host.

Examples:
```sh
node tests/e2e/e2e-magic-link-auto-follow.js "<MAGIC_LINK_URL>"
E2E_MAGIC_LINK_URL="<MAGIC_LINK_URL>" npm run e2e:auto:follow
```

Optional settings:
```sh
E2E_ALLOWED_FINAL_HOSTS="solaire-frontend.web.app,solaire-frontend.firebaseapp.com" \
E2E_TIMEOUT_MS=15000 \
node tests/e2e/e2e-magic-link-auto-follow.js "<MAGIC_LINK_URL>"
```
