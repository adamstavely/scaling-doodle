# Intellect (frontend)

Angular 21 frontend for **Intellect**, a research-portfolio management app. It's built from [Trench Coat](https://github.com/adamstavely/legendary-chainsaw/tree/main/trenchcoat) components and talks to [intellect-api](https://github.com/adamstavely/intellect-api).

- Plan: [`docs/milestone-1-plan.md`](docs/milestone-1-plan.md)
- Design reference: `claude-design/Intellect (standalone).html`

## Setup

Trench Coat installs from GitHub Packages, which needs a GitHub token with the `read:packages` scope:

```bash
gh auth refresh -h github.com -s read:packages
export NODE_AUTH_TOKEN=$(gh auth token)
npm install
```

npm 11.4 crashes on this dependency tree; use npm 11.21.2 or later (`npm install -g npm@11.21.2`).

## Run

Start intellect-api on port 3000 (see its README), then:

```bash
npm start
```

The app runs at http://localhost:4200 and proxies `/api` to the API (`proxy.conf.mjs`). If the API runs somewhere other than localhost:3000, set `API_URL`, e.g. `API_URL=http://localhost:3100 npm start`.

## Tests

```bash
npm test          # unit tests (Vitest)
npm run e2e       # smoke tests (Playwright) against recorded API responses
```

The smoke tests mock `/api` with the JSON in `e2e/fixtures`, recorded from a freshly seeded intellect-api, one folder per viewer (`hv` is the Chief, `mo` a PI). Re-record them after API changes that affect the screens.

## Docker

```bash
docker build --secret id=npm_token,env=NODE_AUTH_TOKEN -t intellect-web .
docker run -p 8080:8080 -e API_UPSTREAM=http://intellect-api:3000 intellect-web
```

nginx serves the app on port 8080 and proxies `/api` to `API_UPSTREAM`. In EKS the ingress can route `/api` instead.

## API client

The typed client in `src/app/api/generated` is generated from `api/openapi.json` and isn't committed. `npm start`, `npm test` and `npm run build` regenerate it. To pick up API changes, run `npm run api:sync`, which downloads the spec from intellect-api's `main` and regenerates.

## Auth (stub)

Real auth comes later. The header's role switch picks Chief view (Helena Vance) or PI view (Marcus Okonkwo), and `userInterceptor` sends that person's id as `X-Intellect-User`.
