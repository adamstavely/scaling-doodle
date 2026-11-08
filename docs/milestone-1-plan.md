# Intellect — Milestone 1 plan

Status: draft, 2026-11-06. Covers three repos:

| Repo | Role |
|---|---|
| `scaling-doodle` (this repo) | Angular frontend |
| [`intellect-api`](https://github.com/adamstavely/intellect-api) | NestJS backend, Elastic datastore |
| `legendary-chainsaw/trenchcoat` | Trench Coat component library, published to GitHub Packages |

Design reference: `claude-design/Intellect (standalone).html`. It's used for layout, content and behaviour. Where it disagrees visually with Trench Coat, **Trench Coat wins**.

## Scope

**In milestone 1:** Portfolio Health (dashboard), Topic Detail with the traceability spine, Papers & Impact (including editable paper grades), Org (centers → teams → topics), People, the Directorate Brief modal, the New Topic flow, ⌘K search, and the Chief/PI role switch.

**Later:** Gaps & Coverage, Resourcing, the Topics index, real auth, the internal paper-metrics API integration, and EKS/Elastic Cloud deployment.

---

## 0. Trench Coat on GitHub Packages (blocks the frontend)

Trench Coat is `"private": true` and unscoped (`trenchcoat`). GitHub Packages only accepts scoped names, so publishing it takes these changes:

1. Rename to `@adamstavely/trenchcoat`, drop `"private"`, and add `publishConfig: { registry: "https://npm.pkg.github.com" }` and a `repository` field. The `trenchcoat` and `trenchcoat-mcp` bin names can stay.
2. Update self-references. Roughly 400 files mention the `trenchcoat` package name, mostly generated docs, JSDoc import examples and CLI output. Most come from `gen-angular`, `gen-docs` and `gen-registry`, so fix the generators and regenerate rather than hand-editing.
3. Add a `publish` workflow: on a `v*` tag, run `npm run ci`, then `npm run build:package`, then `npm publish`.
4. Grant `scaling-doodle` read access to the package so its CI can install it with `GITHUB_TOKEN`.
5. The consumer `.npmrc` gets `@adamstavely:registry=https://npm.pkg.github.com` plus a token with `read:packages`. The token comes from the environment and is never committed.

The package is pre-1.0, so pin an exact version in the frontend.

---

## 1. Data model in Elastic

Elastic is the only datastore. It has no joins and no multi-document transactions, so the model follows four rules:

- **Every record carries `topicId`.** A topic's whole spine (questions, gaps, work, papers, citations) loads with one `_msearch` across five indices filtered on `topicId`, and the API assembles the graph in memory. Each topic has only tens of records, so this is cheap.
- **Each link is stored once, on the child.** For example, `gap.questionIds`, `work.gapIds`, `paper.workIds` and `citation.paperId`. Reverse lookups use a `terms` query on keyword fields. The prototype stores links in both directions; we drop that so the two sides can't drift apart.
- **Rollups are stored on the topic and recomputed after every write.** These are counts, coverage, open gaps, FTE and budget spent, kept on the topic document under `stats.*`. The dashboard and org views read ~200 topics and can't afford to recompute them per request. Writes use optimistic concurrency (`if_seq_no`/`if_primary_term`) and `refresh=wait_for`. A nightly `reconcile` job recomputes every topic's stats and logs any drift.
- **Health is computed, not entered.** Each topic gets a `healthScore` from 0 to 100, recomputed alongside `stats`. The starting formula, to be tuned:
  - Start from coverage × 100.
  - Subtract 15 per uncovered critical gap, 8 per uncovered high gap, 10 per blocked work item, and 5 per overdue work item.
  - Clamp the result to 0–100.

  Bands: 70 or above is `healthy`, 45–69 is `watch`, below 45 is `at-risk`. The formula lives in one module with unit tests.
- **Coverage** is the share of open gaps that have at least one `active` work item against them. Work in `planning`, `blocked`, `review` or `complete` doesn't count.
- **Momentum is the change in health.** The reconcile job writes a monthly `healthScore` snapshot to `topic-health-history`. The topic's `trend[]` sparkline shows the last 12 snapshots, and `momentum` is the current score minus the score three months ago.
- **Portfolio-level numbers are computed live.** Elastic aggregations produce health mix, priority-bin mix, open gaps, coverage, papers YTD and reads YTD. The prototype's hard-coded `lab.portfolio` constants go away.

### Indices

Each index sits behind an alias (`topics` → `topics-v1`) and uses `dynamic: "strict"` mappings, so mapping changes are a reindex plus an alias swap.

| Index | Key fields |
|---|---|
| `people` | id, name, initials, role (`chief`/`pi`/`staff`/`postdoc`), team, allocations[{topicId, fte}] (nested), capacity |
| `org-units` | id, kind (`center`/`team`), name, code, parentId, leadId, focus |
| `topics` | id, name, summary, bin 1–4, priorityLabel, healthScore, health (derived band), leadId, teamId, centerId, tags[], sponsors[], budget{allocated, spent, fy}, `stats{questions, gaps, openGaps, coverage, work, papers, fte}`, momentum, trend[] |
| `questions` | id, topicId, text, status (`open`/`partially`/`answered`), ownerId, gapIds[] |
| `gaps` | id, topicId, text, severity (`critical`/`high`/`medium`), status (`open`/`addressing`/`closing`/`closed`), ownerId, questionIds[] |
| `work` | id, topicId, title, status (`planning`/`active`/`blocked`/`review`/`complete`), leadId, memberIds[], progress, due, budget, fte, gapIds[], note |
| `papers` | id, topicId, title, venue, published, authorIds[], questionIds[], gapIds[], workIds[], **grade** (`outstanding`/`excellent`/`satisfactory`/`dissatisfactory`, nullable), gradedBy, gradedAt, feedback[] (nested) |
| `paper-metrics` | paperId, topicId, month, downloads, views, citations, altmetric, audience{}, geo[], split{}, mentions{} |
| `citations` | id, paperId, topicId, title, venue, year, org, sector |
| `topic-health-history` | topicId, month, healthScore, coverage |

`paper-metrics` holds one document per paper per month. It's filled through a `MetricsSource` interface. Milestone 1 ships `SeedMetricsSource`, which reads the prototype's figures. The internal metrics API becomes a second implementation later, and nothing else changes.

**Seed data:** a script turns the prototype's `data.js` into bulk NDJSON, covering its 12 topics only. The dashboard will show totals for those 12 rather than the prototype's "200 topics". The seed drops the prototype's hand-set `health`, `coverage` and `momentum` values and recomputes them. It also backfills 12 months of `topic-health-history` so the sparklines have data to draw.

---

## 2. Backend — `intellect-api` (NestJS)

**Foundation**
- Nest 11 with `@elastic/elasticsearch` 8.x, `@nestjs/config`, `@nestjs/swagger` and `@nestjs/terminus`. The terminus `/health` endpoint serves as the EKS liveness and readiness probe.
- A `docker-compose.yml` runs single-node Elasticsearch 8 (with Kibana optional) for local dev. Elastic Cloud is reached by API key from config.
- `npm run es:migrate` creates the index templates and aliases, and `npm run es:seed` loads the seed.
- **Scope:** a `ScopeService` turns the current user into one Elastic filter clause. Chief sees everything; a PI sees topics they lead or have FTE on. Every query goes through it. Until real auth arrives, the user comes from an `X-Intellect-User` header via a stub guard, which the frontend's role switch sets. The guard is the only thing real auth replaces.

**Endpoints (REST, OpenAPI at `/docs`)**

| Endpoint | Serves |
|---|---|
| `GET /me`, `GET /people`, `GET /people/:id` | Header, People |
| `GET /portfolio/summary?period=` | Dashboard KPIs, health mix, coverage ring |
| `GET /topics?sort=risk&bin=&health=` | Dashboard priorities table |
| `GET /topics/:id` | Topic header and resourcing strip |
| `GET /topics/:id/spine` | Traceability spine: nodes and edges for Question → Gap → Work → Paper → Citation |
| `POST /topics` | New Topic flow (topic plus its initial questions) |
| `GET /gaps?attention=true&limit=5` | Dashboard "Gaps needing attention" |
| `GET /papers`, `GET /papers/:id` | Papers list and detail (metrics joined from `paper-metrics`) |
| `PATCH /papers/:id/grade` | Grade edit, **Chief only** (403 for anyone else). Enum-validated; sets `gradedBy`/`gradedAt`; recomputes the topic's grade roll-up. |
| `GET /papers/top?limit=3` | Dashboard "Impact pulse" |
| `GET /org` | Centers → teams → topic roll-ups |
| `GET /brief?period=FY26-Q2` | Directorate Brief, as structured sections computed from the data (no LLM in milestone 1) |
| `GET /search?q=` | ⌘K multi-index search over topics, gaps, papers and people |

**Contract:** CI publishes `openapi.json` as a build artifact. The frontend generates its typed client from it with `ng-openapi-gen`. There's no shared code between the two repos; the spec is the contract.

**Tests:** Jest unit tests, plus integration tests against a real Elasticsearch via Testcontainers. Seed fixtures double as test data.

---

## 3. Frontend — `scaling-doodle` (Angular)

**Foundation**
- Angular 21 is the newest version Trench Coat's peer range (`>=19 <22`) allows. Use standalone components, signals and the built-in control flow, and don't use NgModules.
- Load `@adamstavely/trenchcoat/tokens.css` once in `angular.json`, and import element directives from `@adamstavely/trenchcoat/angular` (or `.../angular/forms` for form controls).
- **Theming:** Trench Coat's `data-tc-look` (standard) and `data-tc-theme` (light/dark/system) on `<html>`. This replaces the prototype's Tweaks panel. The prototype's accent swatches and Geist font are dropped in favour of Trench Coat's tokens and Inter.
- **Data:** feature services wrap the generated API client and expose signals (`httpResource` where it fits). An `HttpInterceptor` adds `X-Intellect-User` from the role switch.
- **Routes:** `/` (dashboard), `/topics/:id`, `/papers`, `/papers/:id`, `/org`, `/people`. The brief and New Topic open as Trench Coat dialogs, each with its own URL (`?brief=FY26-Q2`, `?new=topic`) so it can be linked to.
- Run `npx trenchcoat lint` in CI.

**Screen → Trench Coat element map**

| Screen | Elements |
|---|---|
| Shell | `tc-header-nav` (search, role switch, notifications, profile), `tc-command-menu` (⌘K). For the sidebar nav, see the open questions. |
| Dashboard | `tc-kpi-board` / `tc-kpi-chart`, `tc-priority-list` (priorities table: momentum sparkline, coverage, gaps, work), `tc-coverage-ring`, `tc-segmented-bar` (health mix), `tc-gap-exposure` (gaps needing attention), `tc-publication-impact` (impact pulse) |
| Topic Detail | `tc-traceability-spine` (stages and nodes; selected-node chain highlight), `tc-coverage-ring`, `tc-budget-burn`, `tc-capacity-bars`, `tc-grade-distribution` (grade roll-up), `tc-work-item` / `tc-task-board` (work board), `tc-person-hovercard` |
| Papers & Impact | `tc-results-list` or `tc-data-table` (list with grade dot), `tc-publication-impact` (detail: metrics, grade, authors), `tc-sparkline`, `tc-audience-mix`, `tc-world-map` (geo), `tc-comment-thread` (feedback); grade editor uses `tc-segmented-control` or `tc-radio-group` |
| Org | `tc-org-unit-card`, `tc-org-chart`, `tc-collapse` (expandable teams) |
| People | `tc-team-roster`, `tc-capacity-bars` (load vs capacity, flags over 1.0) |
| New Topic | `tc-dialog` + `tc-stepper-form` (Define → Scope → Resourcing), `tc-tag-input`, `tc-number-field`, `tc-combobox` |
| Directorate Brief | `tc-dialog`, `tc-digest` / `tc-handoff-brief`, `tc-shimmer-loader` while loading; print stylesheet |

Each mapping still needs checking against the element's real API as the screen is built. **Rule:** if Intellect needs something Trench Coat lacks, it gets added to Trench Coat (new element, or a new prop on an existing one), released, and then used here. Intellect doesn't hand-roll UI. One gap is already known: the app-shell sidebar nav, which exists only as a React screen and has no Lit element yet.

The grade editor only renders for the Chief. Everyone else sees the grade read-only.

**Tests:** component tests with Trench Coat's `trenchcoat/testing` drivers, and one Playwright smoke test per route against the seeded API.

---

## 4. Sequencing

| Step | Work | Repo | Depends on |
|---|---|---|---|
| A | Publish Trench Coat to GitHub Packages | legendary-chainsaw | — |
| A2 | Add the missing elements to Trench Coat (the sidebar nav first, then whatever screens turn up) and release them | legendary-chainsaw | A |
| B | Nest scaffold, compose, index templates, seed, scope stub, OpenAPI | intellect-api | — |
| C | Read endpoints: portfolio, topics, spine, papers, org, people, search | intellect-api | B |
| D | Angular scaffold, Trench Coat install, shell, role switch, generated client | scaling-doodle | A, B (spec) |
| E | Dashboard, then Topic Detail, then Papers, then Org and People | scaling-doodle | C, D |
| F | Writes: New Topic, grade edit (+ roll-up recompute), and the Brief | both | E |
| G | Dockerfiles, CI for both repos, Playwright smoke | both | F |

A and B can run in parallel. EKS manifests and Elastic Cloud provisioning come after milestone 1.

---

## 5. Decisions

1. **Health** is computed by the system, and **momentum** is the change in health (§1). The New Topic flow no longer asks for a health value.
2. **Coverage** counts only `active` work. Work in `review` doesn't count.
3. **Only the Chief** can grade papers.
4. **Trench Coat gets bug fixes and reusable features** (step A2): anything another app would plausibly use. Layout and styling only Intellect needs stay in the app's CSS. Trench Coat changes go out as one release per task, and app work that doesn't need the new release ships without waiting for it.
5. **The seed** starts with the prototype's 12 topics.
