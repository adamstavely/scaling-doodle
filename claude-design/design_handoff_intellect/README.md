# Handoff: Intellect — Research Portfolio Management

## Overview
**Intellect** is a portfolio-intelligence console for a research lab. A **Lab Director (Chief view)** uses it for whole-portfolio health, resourcing and risk; a **Principal Investigator (PI view)** uses it for their own topics, gaps and impact. The same screens re-scope to the active role.

It tracks a single linked graph: **Topics → Questions → Gaps → Work (projects) → Papers → Citations**, plus people, money and organizational structure. The Topic Detail screen renders this chain literally as a left-to-right "traceability spine."

> A richly formatted, print-ready version of this spec — with live color swatches, type specimens and component previews — ships alongside this folder as **`Intellect — Design Handoff.html`**. Read that for the visual detail; this README is the text-complete companion for a developer (or Claude Code) working in a terminal.

## About the design files
The files in this bundle are **design references created as an HTML/React prototype** — they demonstrate the intended look, layout and behavior. They are **not production code to copy directly**. Your task is to **recreate these designs in the target codebase's existing environment** (React, Vue, Svelte, SwiftUI, native, etc.) using its established patterns, component library and conventions. If no environment exists yet, choose the most appropriate framework for the project and implement the designs there.

The prototype's file structure (in-browser Babel, `window`-shared components) is **illustrative of the responsibility split only** — replace it with proper modules/imports/state management.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are specified. Recreate the UI to pixel level using your codebase's libraries — treat every measurement, color and interaction here as the contract.

---

## Design tokens

### Color (Light theme)
| Token | Hex | Role |
|---|---|---|
| `--brand` | `#1D3557` | Primary navy. Logo, P1 badges, active nav (re-tintable via Accent). |
| `--brand-2` | `#16293F` | Brand hover/pressed. |
| `--blue` | `#0073E6` | Links, focus ring, active work, PI accent. |
| `--green` | `#1F9D62` | On track · healthy · positive · complete · up delta. |
| `--amber` | `#C77D11` | Watch · addressing · mixed. |
| `--rose` | `#D8453D` | At risk · open · critical · blocked · down delta. |
| `--violet` | `#5E7596` | Quiet 5th hue — altmetric, in-review, postdoc. |
| `--bg` | `#F3F6FB` | App canvas (2-hue radial mesh). |
| `--panel` | `#ffffff` | Cards / surfaces. |
| `--line` / `-2` / `-3` | `#E6EAF1` / `#DCE3ED` / `#C4CEDD` | Hairlines → borders. |
| `--ink` ramp | `#1B2A41` → `#46536A` (`-2`) → `#76829A` (muted) → `#A7B1C3` (faint) | Text. |

Semantic colors carry **meaning only** — never decoration. Each signal has a `-dim` tint (≈11–13% alpha) for backgrounds.

### Dark theme
Set `data-theme="dark"` and override the same token names: canvas `#0E1626`, panel `#16223B`, ink `#EAF0F8`, blue `#3D9BFF`. Full map = `DARK` in `app.jsx`. **Build both themes off identical token names** so one switch flips everything.

### Accent (user-swappable)
A Tweak repoints `--gold/-2/-dim` (P1 badges, active nav) to one of `#1D3557`, `#0073E6`, `#0E7C86`, each with light+dark variants (`SIGNAL` map). Make the accent a themeable token, not a hardcoded color.

### Type
- **Spectral** (serif) — display: H1 (30px/500, −0.4px), panel titles, hero numbers. Italic = the one expressive flourish.
- **Inter** — all UI text. Body 13–14px/450, line-height 1.5, base letter-spacing −0.006em.
- **JetBrains Mono** — every number, date, chip, eyebrow metric. `font-variant-numeric: tabular-nums`, −0.3px. **Load-bearing for table alignment.**

### Radius / shadow / motion
- Radii: `--r-sm 8 · --r 10 · --r-lg 12 · --r-xl 16` px.
- Elevation: `--sh-1` subtle · `--sh-2` card lift · `--sh-pop` popover (navy-tinted light, black dark).
- Entrance: `riseIn` translateY(12px)→0, 0.5s `cubic-bezier(.2,.7,.2,1)`; gauges 0.7–0.9s; respect `prefers-reduced-motion`.

---

## App shell
- **Sidebar** — 212px fixed, `--bg-2`. Logo, 7 nav items, spacer, "Portfolio review" promo card (+ Prep brief button). Active item: `linear-gradient(90deg,--gold-dim,transparent)` + 2.5px accent rail + accent icon.
- **Topbar** — 60px sticky, `backdrop-filter: blur(8px)`. 440px search (⌘K hint), role switch, bell w/ unread dot, current user avatar+name+role.
- **Content** — scrolling column, inner `max-width:1440px`, 22–26px padding, 14px card gap.
- **Atoms** (`styles.css`): `.panel` (white card, 1px `--line`, radius 12, `--sh-1`), `.btn` / `.btn-gold` / `.btn-ghost`, `.chip` (mono pill), `.dot` (health dot + colored halo), `.eyebrow`, `.num`, `.serif`.

## Component catalog (`components.jsx`)
Recreate as your components — props are the API.
- **Avatar** (id, size, ring) — round monogram; color by role (Chief→accent, PI→blue, Staff→green, Postdoc→violet). **AvatarStack** caps at 4 + "+N".
- **Sparkline** (data, w, h, color, fill, dot) — SVG line + gradient area, 1.6px.
- **Ring** (value 0–1, size, stroke, color, label, sub) — donut gauge, −90° start, 0.9s dash anim.
- **StackBar** (parts[{label,v,color}]) · **MiniBars** · **Progress** (v, color, h).
- **Delta** (v) — signed % + up/down triangle (green/rose).
- **PriorityBadge** (bin 1–4) — P1 filled, P2 tinted, P3/P4 outlined.
- **KPI** (label, value, sub, accent, spark, delta) — metric tile.
- **Tag / HealthTag** — status chips (health, work, gap, severity).
- **PanelHead** (title, hint, action) — serif card header.

---

## Screens
Every screen takes `scope` and re-scopes by role.

1. **Portfolio Health — Dashboard** (`view: dashboard`, landing). Header (+New topic, quarter filter); 6-KPI strip (Active priorities · Open gaps · Gap coverage · Work in flight · Papers YTD · Readership YTD); left **Priorities** table (topic rows: momentum sparkline+delta, coverage bar, gaps, work — sorted at-risk→healthy); right rail (coverage ring + health bar, Gaps needing attention top-5, Impact pulse top-3 papers).
2. **Centers & Teams — Organization** (`view: org`). 3 Centers (CIS/CEC/CQL), each rolling up teams → topics; expandable team rows; Directorate brief button.
3. **Topic Detail** (`view: topic`, `topicId`). Header (priority+health, name+summary, lead/sponsors/tags, coverage ring + 2×2 stat cluster); resourcing strip (budget · people/FTE · experiments · **paper-grade roll-up**); **TraceMap** Question→Gap→Work→Paper→Citation node columns with SVG connectors — click a node to highlight its chain (others dim to 0.32); work board + citations below.
4. **Research Topics — TopicsList** (`view: topics`). Index grouped by priority bin P1–P4, health filter.
5. **Gaps & Coverage** (`view: gaps`). Gap rows (severity, topic, text, owner, CoverageChip — "No work" rose when uncovered); group + coverage toggles; Export button.
6. **Resourcing** (`view: resourcing`). Resource rows (budget burn, FTE share vs priority); PersonLoad (flags >1.0 capacity).
7. **Papers & Impact** (`view: papers`, `paperId`). 320px list (grade dot, title, venue, ↓/◇) + PaperDetail (grade badge, metrics: downloads/views/citations/altmetric + reads sparkline, mention tiles, audience/geo/split, filterable feedback).
8. **People & Teams** (`view: people`). Roster by role/team/load.

**Modals:** Directorate Brief (`brief.jsx`) — generated print-ready quarterly review (loading → numbered sections; period FY26·Q2). New Topic (`newtopic.jsx`) — topic creation flow.

---

## Paper grades (key feature)
A qualitative assessment on each paper — a fixed **4-level enum**, never free text:

| Grade | Color |
|---|---|
| `outstanding` | green `#1F9D62` |
| `excellent` | blue `#0073E6` |
| `satisfactory` | amber `#C77D11` |
| `dissatisfactory` | rose `#D8453D` |

Stored as `paper.grade`; `GRADE` map holds label+color+tint. Surfaced in **three places**: (1) "Assessment" badge top-right of the paper detail header; (2) color dot beside each list title; (3) **roll-up** in the Topic Detail resourcing strip — stacked bar + per-grade counts ("N assessed"), zero-counts dimmed. In production this should be an **editable reviewer field** with the roll-up recomputing live. Keep the color mapping centralized.

## Interactions
Screen entrance `riseIn` 0.5s. Button hover 0.12–0.15s (`.btn-gold` lifts −1px). Trace-map click → BFS chain highlight, unrelated → 0.32 opacity, SVG edges recompute on resize. Gauges/bars eased 0.6–0.9s. Focus: 2px `--blue` ring, 2px offset.

## State
Local hooks in the mock: `role` (→ memoized `scope`), `route {view,params}`, `brief`/`newTopic` (modals), `tw {theme,signal}` (applied to `documentElement`), `sel` (paper/trace node), per-screen `filters`, brief `phase`. Data is a synchronous `window.DATA`. **In production:** lift the data graph into a store/query layer returning the same entity shapes; keep UI state local. All screens are pure functions of (scope, data). No URL routing in the mock — add real routes (`/topic/:id`, `/papers/:id`).

## Data model
Linked graph keyed by short string ids. Entities: **Person** (role, team, alloc[[topic,fte]], cap, load) · **Topic** (bin 1–4, health, coverage, momentum, counts, tags, sponsors, budget, fte) · **Question** (status, owner, →gaps[]) · **Gap** (severity, status, owner, →work[]) · **Work** (status, lead, team[], progress, due, budget, fte, →papers[]) · **Paper** (venue, authors[], **grade**, reads{downloads,views,citations,altmetric}, readTrend, audience, geo, split, mentions, feedback[], citedBy[]) · **Lab** (portfolio aggregates, budget, headcount, bin mixes) · **SubLab/Center** (code, lead, teams[], focus). Keep the Question→Gap→Work→Paper→Citation chain bidirectionally queryable so any node can light its lineage.

## Implementation notes
- Port `styles.css` tokens into your theming system **first**; both themes off one set of names; accent swappable.
- Numbers = JetBrains Mono + tabular-nums (don't substitute the UI font).
- Color = meaning; never decorative; extend the semantic set deliberately.
- Charts are hand-rolled SVG — match stroke weights, easing, no-axis aesthetic if swapping in a lib.
- Scope everything by role from a single filtering source.
- Density is intentional (13–14px body, 14px gaps, hairlines) — don't inflate.
- Keep `:focus-visible` ring, honor reduced-motion, never rely on dot color alone — pair with a text label.

## Assets
- **Icons** — inline SVG, 1.6 stroke, 24px grid (`icons` map in `app.jsx`). No icon font.
- **Logo** — inline SVG gradient mark (`Logo` in `app.jsx`).
- **Fonts** — Spectral, Inter, JetBrains Mono (Google Fonts).
- No raster image assets; charts are generated SVG.

## Files in this bundle
| File | Contents |
|---|---|
| `Intellect — Design Handoff.html` | Formatted visual spec (open in a browser) |
| `Intellect.html` | Live runnable prototype (entry point) |
| `styles.css` | Design tokens + atoms |
| `data.js` | Mock dataset (`window.DATA`) |
| `components.jsx` | Shared visual components |
| `app.jsx` | Shell, nav, routing, theming, role switch |
| `dashboard.jsx` `org.jsx` `topic.jsx` `gaps.jsx` `resourcing.jsx` `papers.jsx` `people.jsx` | The 8 screens |
| `brief.jsx` `newtopic.jsx` | Modals |
| `tweaks-panel.jsx` | Tweaks panel scaffold |
