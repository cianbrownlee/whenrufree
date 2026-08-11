# whenrufree

A tiny, link-based scheduling tool. A creator picks a date range and a daily time window and gets a shareable link. Anyone with the link enters a name (no account) and drags across a grid to mark when they're free. Everyone viewing the link sees a live aggregate: every slot shaded by how many people are available, names on hover.

No sign-in, ever — the link itself is the access control.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL (Neon) via Prisma
- Tailwind CSS
- Vitest for unit/integration tests
- GitHub Actions CI (typecheck, lint, test)
- Deployed on Vercel

## Local development

```bash
npm install
npm run dev
```

See `shared-availability-handoff.md` for the full product/design spec this was built from.
