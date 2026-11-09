# whenrufree

A tiny, link-based scheduling tool. A creator picks a date range and a daily time window and gets a shareable link. Anyone with the link enters a name (no account) and drags across a grid to mark when they're free. Everyone viewing the link sees a live aggregate: every slot shaded by how many people are available, names on hover.

No sign-in, ever: the link itself is the access control.

**Live demo:** [whenrufree-rouge.vercel.app](https://whenrufree-rouge.vercel.app/)

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL (Neon) via Prisma
- Tailwind CSS
- Vitest for unit/integration tests
- GitHub Actions CI (typecheck, lint, test)
- Deployed on Vercel

## Design notes

- **Editing without accounts.** Each respondent gets a random token stored in their browser, which lets them come back and change their answers without signing in.
- **Safe resubmission.** Updating a response runs as a single database transaction that deletes and recreates that respondent's slots, so repeated or near-simultaneous submissions can't leave another respondent's data partly overwritten.
- **Tests and CI.** The 35 Vitest tests cover the slot-generation and aggregation logic and the API routes. GitHub Actions runs them against a real Postgres container, along with the typecheck and lint, and a failure in any of them blocks the build.

## Local development

```bash
npm install
npm run dev
```

See `shared-availability-handoff.md` for the full product/design spec this was built from.
