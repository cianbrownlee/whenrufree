# Shared Availability — Handoff for Claude Code

This document is meant to be self-contained. Read it before writing any code.

## What this is

A tiny, link-based scheduling tool. A creator picks a date range and a daily time window, and gets back a shareable link. Anyone with the link opens it, enters a name (no account), and clicks/drags across a grid to mark when they're free. Everyone viewing the link sees a live aggregate: every time slot shaded by how many people are available, with names on hover. No sign-in, ever — the link itself is the access control.

## Explicit non-goals (do not build any of this)

- User accounts / sign-in of any kind, for creators or respondents
- Timezone conversion — assume everyone uses the timezone the creator had in mind when they set the time window; no per-visitor conversion
- Recurring events, email notifications, reminders
- Admin dashboard, event listing/search, usage analytics
- Real-time live sync (WebSockets/SSE) — refetching on page load/manual refresh is enough
- A native mobile app — responsive web only
- Non-contiguous date selection — creator picks one contiguous date range, not an arbitrary list of days
- Configurable slot granularity — fixed at 30-minute blocks for v1
- Editing the event itself after creation (title/date range/time window) — if the creator makes a mistake, they create a new event
- Automatic event expiry or cleanup

## Stack and why

- **Framework:** Next.js (App Router) + TypeScript. This is a full-stack app — frontend and API routes together — so there's exactly one thing to deploy, not a frontend/backend pair to keep in sync.
- **Database:** PostgreSQL (Neon or Vercel Postgres, whichever is faster to provision) via **Prisma**. A real relational schema, not a JSON blob — the aggregation query should be a straightforward group-by, not application-level JSON parsing.
- **Styling:** plain CSS or Tailwind, whichever is faster to get right. The app lives or dies on the grid interaction feeling good; don't spend time on visual polish elsewhere.
- **Testing:** Vitest for the aggregation logic (pure functions — no excuse not to test these thoroughly) plus a handful of integration tests against the API routes. Playwright/E2E is a stretch goal, not required for v1.
- **CI:** GitHub Actions — typecheck (`tsc --noEmit`), lint, and the test suite on every push/PR. A failing check should block, not just report.
- **Deploy:** Vercel, connected to the GitHub repo for automatic deploys on push to main.

## Core user flow

1. Creator visits the homepage, fills in: title, a contiguous date range (cap it — see Edge Cases), and a daily time window (e.g. 9:00 AM–9:00 PM) applied identically across every day in the range.
2. On submit, the event is created with a random, unguessable slug (e.g. via `nanoid`, not a sequential ID) — this slug *is* the access control.
3. Creator is redirected to `/e/[slug]` — the same page every respondent uses.
4. A respondent enters a display name (free text, no uniqueness check) and clicks/drags across a grid (days as columns, 30-minute blocks as rows) to mark availability, then submits.
5. The same page shows the aggregate view: every slot shaded by how many respondents marked it, hover/click reveals names.
6. A respondent returning **on the same browser** should see their prior selections pre-filled and be able to edit them (see below). From a different browser/device, they're a new respondent — state this limitation in the UI rather than pretending otherwise.

## Editing without accounts — the one design decision to get right

No login means "let someone edit their own response" needs its own mechanism:
- On first submission, generate a random `respondentToken`, store it on the respondent's row, and save it in the browser's `localStorage` keyed by the event slug.
- On page load, check `localStorage` for a token for this event slug. If present, fetch that respondent's existing availability and treat the visit as an edit.
- No token found → new respondent, even if the name matches someone else's. Don't attempt name-based deduplication — two people named "Alex" are two different respondents, and that's expected.

## Data model (Prisma schema — adjust field names as needed)

```prisma
model Event {
  id           String       @id @default(cuid())
  slug         String       @unique   // random, unguessable — used in the URL
  title        String
  startDate    DateTime               // date-only, no time component
  endDate      DateTime
  dayStartTime String                 // e.g. "09:00"
  dayEndTime   String                 // e.g. "21:00"
  createdAt    DateTime     @default(now())
  respondents  Respondent[]
}

model Respondent {
  id              String             @id @default(cuid())
  eventId         String
  event           Event              @relation(fields: [eventId], references: [id])
  name            String
  respondentToken String             @unique   // matched against localStorage on return visits
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  availability    AvailabilitySlot[]
}

model AvailabilitySlot {
  id           String     @id @default(cuid())
  respondentId String
  respondent   Respondent @relation(fields: [respondentId], references: [id])
  slotStart    DateTime               // the actual date+time of the 30-min block start

  @@unique([respondentId, slotStart])
}
```

## The aggregation logic — the actual interesting part of this app

Given an event, produce: for every 30-minute slot in the event's date range × time window, the count of respondents available and the list of their names. Write this as a pure function, testable with no database or browser involved:

```ts
function aggregateAvailability(
  slots: { slotStart: Date; respondentName: string }[],
  allSlotStarts: Date[]
): Map<string /* ISO slotStart */, { count: number; names: string[] }>
```

This is the function to test most thoroughly — realistic fixtures (overlapping respondents, a respondent with zero selections, a slot nobody picked, slots at the exact start/end boundary of the time window). Get this exactly right before worrying about how it renders.

## Concurrency note

Two respondents submitting near-simultaneously should never corrupt each other's data. Since each respondent's slots are scoped to their own `respondentId`, this is safe by construction as long as a submission is handled as "delete this respondent's existing slots, insert the new set" inside a single Prisma transaction — not as N individual upserts racing each other.

## Edge cases to actually handle

- Respondent submits zero available slots — valid, don't error; they still count as a response, just one with no marked availability.
- Event with zero respondents yet — aggregate view renders an empty grid cleanly, no crash.
- Creator requests a very large date range — hard-cap it in the UI (e.g. 31 days) rather than silently rendering a grid with hundreds of columns.
- Slug collision on creation — vanishingly unlikely with a real random generator, but handle the unique-constraint failure by retrying with a new slug instead of crashing.

## Testing expectations

- Full unit coverage of `aggregateAvailability` and any date/slot-generation helpers.
- A handful of integration tests against the real API routes (a test database, or an in-memory/sqlite substitute if that's faster to wire up — use judgment, don't over-build the test infrastructure itself).
- `tsc --noEmit` and the test suite both run in CI on every push; a failing check blocks, doesn't just report.
- Playwright/E2E is fine to skip for v1 unless it turns out to be quick.

## Suggested build order

1. Prisma schema + local Postgres (or a Neon dev branch) — confirm migrations run clean.
2. `aggregateAvailability` and slot-generation helpers, fully unit tested, before any UI exists.
3. Event creation flow (form → API route → redirect to `/e/[slug]`).
4. Respondent flow: name entry, grid click/drag, submit, localStorage token handling.
5. Aggregate view on the same page, reading real data.
6. GitHub Actions CI (typecheck + lint + test) — wire this up now, not once everything else already works.
7. Deploy to Vercel, connect to GitHub for auto-deploy on push to main.

## Deliberately deferred (fine to skip entirely for v1)

- Timezone handling beyond "everyone uses the creator's stated times at face value"
- Non-contiguous date selection
- Configurable slot granularity
- Any real-time sync beyond refetch-on-load
- Playwright/E2E tests
