# 03 — BUILD PHASES (78 min total)

Rule: finish phase -> run the flow in the browser -> fix bugs -> `git commit -m "phase N"` -> next phase.
If a phase runs over its time box, cut polish, never cut correctness.

| Phase | Minutes | Window |
|---|---|---|
| 0 Setup + schema + seed + design tokens | 8 | 0–8 |
| 1 Auth + OTP + guards + `next` redirect | 12 | 8–20 |
| 2 Societies + membership | 10 | 20–30 |
| 3 Events + admin approval + public page + registration + landing | 18 | 30–48 |
| 4 Volunteers + tasks + expenses | 12 | 48–60 |
| 5 Real-time + notifications | 7 | 60–67 |
| 6 QA pass + bug fixing + polish | 7 | 67–74 |
| 7 Bonus (only if smoke test passes) + README + slides + push | 4 | 74–78 |

---

## Phase 0 — Foundation (8 min)
- `npx create-next-app@latest unisphere --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"`
- Install deps from 02_ARCHITECTURE.md. Add `prisma/schema.prisma` exactly as given. `prisma db push`.
- `lib/db.ts`, `lib/time.ts`, `lib/errors.ts` (`AppError(code, message, status)`), `lib/realtime.ts`.
- Tailwind theme tokens + fonts from 04_DESIGN_SYSTEM.md. Build base UI kit: Button, Input, Select, Textarea, Badge, Card (3 variants), Modal, Toast, Skeleton, EmptyState, Tabs, AppShell (sidebar for roles, top bar with bell).
- `prisma/seed.ts` (admin + sample data per master prompt). Admin: `admin@unisphere.test` / `Admin@12345`.
- Done when: `npm run dev` runs, seed works, styled blank pages render.

## Phase 1 — Auth (12 min)
- Signup page (role switch Student/President only; `next` param kept), login, verify (6 boxes, auto-advance, paste support, resend countdown 60s, attempts left shown only after a wrong try).
- `otp.ts`: create / verify / resend with all rules (10 min expiry, 5 attempts, 60s cooldown, invalidate previous).
- Session cookie + `getUser()` helper + `requireRole()`; `middleware.ts` guards `/president`, `/student`, `/admin`.
- Preserve `next` through signup -> login -> verify (validate `next` is a relative path starting with `/` to avoid open redirect).
- Done when: all three roles can sign in via console OTP; wrong OTP x5 invalidates; resend < 60s is rejected; `/admin` unreachable for non-admin; signup with role=ADMIN via curl fails.

## Phase 2 — Societies & Membership (10 min)
- President: onboarding screen "Create your society" if none; edit profile page; members tab (pending requests approve/reject, approved list with remove).
- Student: societies list (search + category filter), detail page with Join/Requested/Member/Rejected -> "Request again" states.
- Services enforce: one society per president, one pending per student+society, re-request after reject/remove.
- Notifications (DB only for now) via `notify()`.
- Done when: full request -> approve -> remove -> re-request loop works with two browser profiles.

## Phase 3 — Events, Approval, Public Page, Registration, Landing (18 min)
Order inside the phase:
1. `eventCaps()` pure function + unit-ish test script for table rows.
2. President event form (datetime-local in PKT), list, detail with status banner, remarks, actions (Edit, Submit, Cancel).
3. Edit rules (Approved -> Pending), capacity rule, past-start rules.
4. Admin: dashboard stats, pending list, review screen (approve/reject + remarks, approve hidden if started).
5. Public `/events/[id]`: visibility per table, seats remaining, Register flow (logged out -> login with next -> back), Cancel registration.
6. Student "My registrations".
7. Landing page with real next 3–6 approved upcoming events.
- Done when the **core smoke test** passes end to end (see 05). Run the 20-parallel-register test.

## Phase 4 — Volunteers, Tasks, Expenses (12 min)
- Invite UI (search students, society members suggested first), student invitations inbox accept/decline.
- Kanban (3 columns, drag or buttons — buttons are acceptable and safer), assignee dropdown limited to ACCEPTED, progress bar %.
- Student "My tasks" with deadlines; status update only on own tasks.
- Expenses tab: add/edit/delete, summary cards (approved, spent, remaining, Over budget label), server-side cap.
- Done when all guards in the Event Status Table hold (try each state).

## Phase 5 — Real-time + Notifications (7 min)
- SSE endpoint + `useStream`. Bell with unread count, dropdown, mark read, toast.
- Live: seats remaining (public page), registrations count (president), Kanban updates for assignee/president, admin pending count.
- Wire notification triggers for every event in 01_REQUIREMENTS.md.
- Done when: two windows — student registers, president's count + bell update without refresh.

## Phase 6 — QA & Polish (7 min)
- Run 05_QA_CHECKLIST.md fully. Fix everything failing.
- Empty/loading/error states everywhere. Mobile layout check (375px). Keyboard focus visible. `prefers-reduced-motion` respected.
- `npm run build` must pass, zero TS errors, zero console errors.

## Phase 7 — Bonus + Ship (4 min)
Only if the core smoke test is green, in this order: cancellation notifications -> member labels -> PDF report -> logo upload -> withdrawal/reset -> over-budget warning -> meetings.
Then: README.md, docs/SLIDES.md, `.env.example`, `git push`.
