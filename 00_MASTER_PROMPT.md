# MASTER PROMPT — Antigravity mein ye paste karo

> Setup: new folder banao, uske andar `docs/` folder mein baqi saari `.md` files (01–06) rakh do, phir Antigravity (Agent mode, planning ON) mein neeche wala prompt paste karo.

---

```
You are a senior full-stack engineer shipping a hackathon MVP called UniSphere (university society & event management platform). HARD DEADLINE: 78 minutes total. Do not ask me questions. Make decisions yourself, following the docs.

READ FIRST, IN ORDER, before writing any code:
- docs/01_REQUIREMENTS.md  (business rules = source of truth)
- docs/02_ARCHITECTURE.md  (stack, Prisma schema, API, realtime, concurrency)
- docs/03_BUILD_PHASES.md  (phase order + time boxes)
- docs/04_DESIGN_SYSTEM.md (palette, type, motion — follow EXACTLY)
- docs/05_QA_CHECKLIST.md  (you must pass this before finishing)
- docs/06_README_AND_SLIDES.md (README + slide outline to generate at the end)

NON-NEGOTIABLE RULES
1. Stack is fixed: Next.js 14 App Router + TypeScript + Prisma + SQLite + Tailwind + framer-motion. Do not swap it, do not add a separate backend.
2. Everything must hit the real database. No hardcoded stats, no fake buttons, no mocked flows. Every button on screen must work.
3. All business rules live in server-side code (route handlers / server actions + service functions in /lib/services). The UI never decides permissions. Re-check role + ownership + event state on every mutation.
4. Build phase by phase in the order of 03_BUILD_PHASES.md. After each phase: run the app, test that phase's flow end to end, fix every bug, then `git commit`. Never start the next phase with a broken current phase.
5. Core first. Bonus features ONLY after the core smoke test passes (OTP login -> create society -> create event -> admin approves -> student registers via public link).
6. Dates: input is Asia/Karachi, stored UTC, displayed Asia/Karachi (use Luxon). Money is integer PKR.
7. OTP codes are generated per login attempt, hashed in DB, and printed ONLY to the server console. Never show them in the UI, never hardcode one.
8. Design: follow docs/04_DESIGN_SYSTEM.md literally. The UI must NOT look AI-generated: no purple/blue gradients, no glassmorphism, no glowing blobs, no identical rounded-card grids, no Inter, no emoji icons, no centered-everything hero with gradient text. Use the given palette, fonts, hard-edge shadows, and motion rules.
9. Handle loading, empty, and error states on every screen (with useful copy, see design doc). Forms show inline validation errors from the server.
10. TypeScript strict, zero console errors, `npm run build` must pass at the end.
11. Seed script (`npx prisma db seed`) must create: 1 admin, 2 presidents, 6 students, 2 societies, events in every state (Draft, Pending, Approved upcoming, Approved ongoing, Approved completed, Rejected, Cancelled), registrations, invitations, tasks, expenses. Seed users are pre-verified normal accounts (they still go through OTP at login).

WORKFLOW
- First reply: a short plan (max 15 lines) confirming the phases, then start building immediately.
- Use a todo/task list in the agent and tick items as you go.
- When a rule in the docs is ambiguous, pick the simplest interpretation that satisfies the statement and note it in README under "Assumptions".
- When all phases are done, run through docs/05_QA_CHECKLIST.md item by item, fix failures, then generate README.md and docs/SLIDES.md per 06_README_AND_SLIDES.md.

START NOW with Phase 0.
```

---

## Agar Antigravity beech mein atak jaye (copy-paste fixes)

**Bug aaya:**
```
Stop adding features. Reproduce this bug, find the root cause, fix it in the service layer (not just the UI), then re-run the full flow of the current phase. Bug: <describe>
```

**UI AI-type lag raha ho:**
```
Re-read docs/04_DESIGN_SYSTEM.md. Audit every page against its "Anti-patterns" list and fix violations. Replace any gradient, glass blur, uniform card grid, or fade-up-on-everything with the specified treatments.
```

**Time kam bacha ho:**
```
Freeze new features. Run docs/05_QA_CHECKLIST.md "Smoke test" section only, fix failures, ensure `npm run build` passes, then write README.md.
```

**Final check:**
```
Run the entire 05_QA_CHECKLIST.md. Print a table: item | pass/fail | fix applied. Do not stop until all core items pass.
```
