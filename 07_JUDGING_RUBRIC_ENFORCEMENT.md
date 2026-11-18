# 07 — JUDGING RUBRIC ENFORCEMENT (Official Score Sheet)

Ye file judges ki **official score sheet** (100 core + 5 bonus) ke mutabiq hai. Har criterion ke liye: marks, judges kya check karenge, kya implement hona zaroori hai, kaise verify karna hai, aur Antigravity ko dene wala **prompt**.

> Pehle `00`–`06` docs ke mutabiq build karo. Phir is file ke prompts section by section chalao (ya aakhri "MASTER AUDIT PROMPT" ek hi baar mein sab chala deta hai). Bug fix ka rule: **root cause service layer mein fix karo, sirf UI hide karna fix nahi hai.**

---

## 0. Marks Overview

| # | Section | Marks |
|---|---|---|
| 1 | Authentication, OTP and role protection | 12 |
| 2 | Society management and membership | 10 |
| 3 | Event management and lifecycle | 22 |
| 4 | Student registration and capacity | 12 |
| 5 | Volunteer and task management | 12 |
| 6 | Budget and expense tracking | 9 |
| 7 | Administrator dashboard and monitoring | 5 |
| 8 | Notifications and real-time updates | 6 |
| 9 | Landing page, usability, responsiveness | 5 |
| 10 | Technical quality, data integrity, delivery | 7 |
| | **CORE TOTAL** | **100** |
| B | Optional bonus (only after core passes) | +5 |

### Sab se zyada marks wale items (inko pehle perfect karo)
1. **Correct event-state rules: 8**
2. **Role guards and ownership restrictions: 7**
3. **Membership requests flow: 5**
4. Event create validation: 4 · Event submission + combined approval: 4 · Capacity/seat handling: 4 · Kanban + task permissions: 4

### Global rules for the agent
- Har rule **server-side** enforce ho (service layer + route handler). UI sirf reflect kare.
- Har mutation par: session → role → ownership → event state (`eventCaps`) → validation (zod) → transaction.
- Koi hardcoded stats, fake button, ya simulated flow nahi. Sab real DB.
- Har error ka clear message (400/401/403/404/409), UI mein inline dikhe.
- Seed data real DB inserts hon (judges ke liye sample data zaroori).

---

## 1. AUTHENTICATION, OTP AND ROLE PROTECTION (12)

| Item | Marks |
|---|---|
| Registration and login for President and Student; admin NOT available via public signup | 2 |
| Email OTP: expiry, attempt limit, resend cooldown, invalidation of previous code | 3 |
| Role guards and ownership restrictions (no access to another role's/society's records) | 7 |

### Judges kya try karenge
- Signup form mein sirf President/Student ho. `curl` se `role=ADMIN` bhej kar signup try.
- OTP: galat code 5 baar, expired code, resend jaldi, purana code resend ke baad.
- Student se `/admin` ya `/president` khol kar dekhna. Direct API calls. President B se President A ka event/society ID khol kar dekhna.

### Must implement
- Signup: `role in [STUDENT, PRESIDENT]` zod enum; ADMIN reject (400). Password >= 8. Email unique (case-insensitive, lowercase store).
- Login: email+password sahi ho to hi OTP bheje; ghalat par generic "Email or password is incorrect".
- OTP: 6 digits, `crypto.randomInt`, hashed store, 10 min expiry, max 5 attempts (5th wrong = invalidated), 60s resend cooldown (server-side check using last `createdAt`), naya code purane ko `invalidatedAt` set kare. Har login attempt par naya code. Code kabhi response/UI mein na aaye.
- Pre-auth cookie sirf OTP verify ke liye valid; protected routes par session cookie zaroori.
- Role guards: middleware + har API handler mein `requireRole()`.
- Ownership: har president endpoint par `event.society.presidentId === session.userId`; student endpoints par `studentId === session.userId`. Other user ki ID aaye to 403/404.
- Public/other-role endpoints draft/pending/rejected/cancelled data leak na karein.

### Verify
- 15 IDOR/guard cases (student -> admin API, student -> president API, president B -> society A events/tasks/expenses/registrations, student A -> student B invitations/tasks/notifications, unauthenticated -> 401).

### AGENT PROMPT 1
```
Audit and harden section 1 (Auth, OTP, role protection) of the UniSphere project against docs/07_JUDGING_RUBRIC_ENFORCEMENT.md. Do not change UI design.
1. Signup API must accept role only STUDENT or PRESIDENT (zod enum). A request with role=ADMIN, or any other value, returns 400. Emails are lowercased and unique. Password >= 8 chars. Admin exists only via the seed script.
2. OTP service (lib/otp.ts): crypto.randomInt 6-digit code; store only a hash; expiresAt = now+10min; attempts counter; 5th wrong attempt sets invalidatedAt; resend allowed only if now - lastCode.createdAt >= 60s (return 429 with secondsLeft); creating a new code sets invalidatedAt on all previous active codes; a used/invalidated/expired code never verifies. A new code is generated on EVERY successful password check. The code is never in any HTTP response, never in the UI; it is only emailed (or console.log when SMTP is not configured). Verify page shows a live resend countdown from the server's secondsLeft and shows remaining attempts after a wrong entry.
3. Sessions: httpOnly, sameSite=lax, secure in production, signed JWT; pre-auth cookie cannot access any protected route.
4. Guards: every API route handler calls requireRole(); every president route verifies event/society ownership via DB (never trust ids from client); every student route verifies studentId === session.userId. middleware.ts protects /president, /student, /admin pages by role and redirects unauthenticated users to /login?next=...
5. Public endpoints must never return Draft, Pending, Rejected or Cancelled events.
Then write scripts/test-auth-guards.ts (run with `npm run test:auth`) that tests at least: role=ADMIN signup rejected; weak password rejected; duplicate email rejected; wrong password generic error; 5 wrong OTPs invalidate the code (even the right code then fails); expired OTP fails; resend within 60s returns 429; resend invalidates old code; student -> /api/admin/* = 403; student -> president routes = 403; president B -> president A's society/event/task/expense/registration endpoints = 403/404; student A -> student B's invitations/tasks/notifications = 403/404; unauthenticated = 401. Use a separate test DB (DATABASE_URL for tests) and forge session cookies with AUTH_SECRET where OTP is not the subject. Run it and fix every failure in the service layer. Print a pass/fail table.
```

---

## 2. SOCIETY MANAGEMENT AND MEMBERSHIP (10)

| Item | Marks |
|---|---|
| Create/update society with required fields + fixed category list | 3 |
| One society per President; one President owner per society; active immediately | 2 |
| Membership: one pending per student/society; approve, reject, remove, allow re-request | 5 |

### Must implement
- Fields: name (unique), description, category (fixed list), contact info. Server validates category against the list.
- `presidentId` unique -> second create returns 409 "You already manage a society".
- Society active immediately (no approval status); admin sees it instantly.
- Membership single row per (society, student): statuses `PENDING | APPROVED | REJECTED | REMOVED`.
  - Request when status is PENDING or APPROVED -> 409.
  - Request when REJECTED or REMOVED -> same row back to PENDING.
  - President approve/reject only if PENDING; remove only if APPROVED.
  - President can act only on own society's requests.
  - Members linked to real STUDENT accounts only (a PRESIDENT/ADMIN cannot request).
- Student UI states: Join / Requested (pending) / Member / Rejected -> "Request again" / Removed -> "Request again".
- Society browse + details require login.

### AGENT PROMPT 2
```
Audit and harden section 2 (Societies and membership) against docs/07_JUDGING_RUBRIC_ENFORCEMENT.md.
- Society create/update: zod validation (name unique case-insensitive, description, category must be one of the fixed list, contactEmail valid, optional phone/link). A president with an existing society gets 409 on create. Updates only by the owner. Society is active immediately. Admin list shows it instantly.
- Membership service in a transaction: unique (societyId, studentId). Request: if status PENDING or APPROVED -> 409; if REJECTED or REMOVED -> set back to PENDING and notify the president; if no row -> create PENDING. Only users with role STUDENT can request. Approve/reject only from PENDING; remove only from APPROVED; president must own the society. Notify the student on approve/reject/remove.
- Student UI shows exact state per society (Join, Requested, Member, Rejected -> Request again, Removed -> Request again). President members page has Pending / Members tabs with approve, reject, remove.
- Society browse and detail routes require login (redirect with next).
Write scripts/test-societies.ts (`npm run test:societies`) covering: second society creation blocked; invalid category rejected; duplicate pending blocked (also under 10 parallel requests); approve -> remove -> re-request works; reject -> re-request works; president B cannot approve requests of society A; non-student cannot request. Run, fix failures in the service layer, print pass/fail.
```

---

## 3. EVENT MANAGEMENT AND LIFECYCLE (22)

| Item | Marks |
|---|---|
| Create event with all fields + correct input validation | 4 |
| Pakistan Standard Time: accept PKT input, store UTC, display PKT | 3 |
| Event submission + combined event/budget approval or rejection with remarks | 4 |
| **Correct event-state rules: editability, resubmission, cancellation, permitted actions** | **8** |
| Public listing / direct-link visibility according to event state | 3 |

### Must implement
**Validation (server-side):** title, description, venue required; `start < end`; `registrationDeadline <= start`; `capacity >= 1` (integer); `proposedBudget >= 0` (integer); capacity cannot go below active REGISTERED count; edits only before start.

**PKT:** `datetime-local` string interpreted as `Asia/Karachi` via Luxon, stored UTC, always displayed with "PKT". Edit form re-converts UTC -> PKT input (round trip must not shift time).

**Submission:** Draft/Rejected -> `PENDING` (explicit Submit, only before start). Admin: single decision APPROVE/REJECT; reject needs remarks; approve sets `approvedBudget = proposedBudget`, `hasBeenApproved = true`; admin cannot edit the amount; president sees decision + remarks. If start passed while Pending: admin can only Reject.

**State rules (implement one pure `eventCaps(event, now)` used by UI + API):**

| State | Public list/link | Edit | Registrations | Invitations | Expenses | Cancel |
|---|---|---|---|---|---|---|
| Draft | hidden/404 | yes before start | no | no | no | yes |
| Pending (first) | hidden/404 | locked | no | no | no | yes |
| Pending (after editing Approved) | hidden, temporarily unavailable | locked | no (existing kept) | no (existing kept) | no (last approved budget in force) | yes |
| Approved Upcoming | listed + link | yes before start (-> Pending) | until deadline | until start | within approved budget | yes |
| Approved Ongoing | listed + link | no | no | no | within approved budget | yes |
| Approved Completed | direct link only, registration closed | no | no | no | yes (receipts) | no |
| Rejected | hidden/404 | yes before start; explicit Submit | no | no | no (last approved visible) | yes |
| Cancelled | hidden/404 | frozen | no; registrations marked Cancelled | no; invitations kept | no | already cancelled |

Extra: Draft/Rejected with start passed -> cannot submit, only cancel. Cancel is irreversible, closes registration, keeps registration rows with status CANCELLED.

### AGENT PROMPT 3
```
Audit and harden section 3 (Event management and lifecycle) against docs/07_JUDGING_RUBRIC_ENFORCEMENT.md. This is the highest-value section (22 marks); be strict and exact.
1. lib/event-caps.ts: one pure function eventCaps(event, now) implementing the Event Status Table in docs/01_REQUIREMENTS.md and docs/07 section 3 for: publicListed, publicLinkAvailable, canEdit, canSubmit, canRegister, canInvite, canAddExpense, canCancel, canManageTasks, adminCanApprove, adminCanReject. It must handle: Draft, Pending-first-submission (hasBeenApproved=false), Pending-after-edit (hasBeenApproved=true), Approved Upcoming/Ongoing/Completed (computed from now), Rejected, Cancelled, and the past-start special cases (Pending past start => reject only; Draft/Rejected past start => cannot submit, only cancel). EVERY service and route handler calls it; the UI uses the same function for button visibility. No other code may re-implement these rules.
2. Create/edit validation with zod + service checks: start<end, deadline<=start, capacity integer>=1, proposedBudget integer>=0, capacity >= active REGISTERED count, edit only before start. Return field-level errors; the form shows them inline.
3. Time: all datetime-local inputs go through fromPKTInput (Luxon, zone Asia/Karachi) to UTC; all displays use fmtPKT with "PKT". Edit form pre-fills with toPKTInput; saving without changes must not change the stored time (round-trip test). Never use new Date(string) on user input.
4. Editing an Approved Upcoming event sets approvalStatus=PENDING, keeps hasBeenApproved=true and approvedBudget (last approved budget stays in force), hides it from public list/link, keeps registrations and invitations, notifies admins. Rejected edit stays Rejected until explicit Submit. Submit blocked after start.
5. Admin decision: one endpoint, APPROVE or REJECT; REJECT requires non-empty remarks; APPROVE sets approvedBudget=proposedBudget and hasBeenApproved=true; admin cannot send/change an amount; if start passed, APPROVE returns 409. President event page shows the decision, remarks, and budget outcome as part of the decision.
6. Cancel: irreversible; sets isCancelled, closes registration, marks all REGISTERED registrations as CANCELLED (rows retained), keeps invitations, notifies registered students and invited/accepted volunteers; second cancel returns 409; Completed events cannot be cancelled.
7. Public visibility: /events/[id] and public list use eventCaps; hidden states return 404; Pending-after-edit shows a "temporarily unavailable" page; Completed Approved shows details with registration closed.
Write scripts/test-events.ts (`npm run test:events`) with a table-driven test: for every state x action in the Event Status Table (including time-based cases by injecting `now`) assert the API result (allowed vs 403/409) AND eventCaps output. Also test: validation errors, PKT round trip (enter 2026-12-01T22:00 -> stored 17:00Z -> shown 10:00 PM PKT), capacity cannot drop below registrations, edit-approved -> pending flow, reject needs remarks, admin cannot approve past-start pending, cancel flows. Run and fix every failure; print a pass/fail table.
```

---

## 4. STUDENT REGISTRATION AND CAPACITY (12)

| Item | Marks |
|---|---|
| Eligibility: approved event, before deadline/start, not cancelled | 3 |
| Prevent duplicate active registrations; retain cancelled record; support re-registration | 3 |
| Enforce capacity; release seats on cancellation; handle simultaneous registrations safely | 4 |
| Preserve public event destination through signup/login and OTP before registration | 2 |

### Must implement
- One row per (event, student), unique constraint; statuses REGISTERED / CANCELLED.
- Register allowed only if: event APPROVED, not cancelled, `now <= registrationDeadline`, `now < start`, not already REGISTERED, capacity available. Only STUDENT role can register (president/admin get 403).
- Cancel: any time before start, event not cancelled; row stays with status CANCELLED; seat released.
- Re-register: same row flips CANCELLED -> REGISTERED after capacity check.
- **Concurrency:** capacity check + write in one transaction (SQLite) or with `SELECT ... FOR UPDATE` row lock (Postgres). 20 parallel requests at capacity 5 => exactly 5 succeed.
- Seats remaining shown on public page; updates live.
- Logged-out Register click -> `/login?next=/events/ID` (or signup) -> OTP -> back to event, which shows Register ready. `next` must be relative path only (no open redirect).

### AGENT PROMPT 4
```
Audit and harden section 4 (Student registration and capacity) against docs/07_JUDGING_RUBRIC_ENFORCEMENT.md.
- Registration service in ONE transaction: lock/serialize on the event (Postgres: SELECT id FROM "Event" WHERE id=$1 FOR UPDATE via tx.$queryRaw; SQLite: the transaction suffices), re-read the event, verify via eventCaps (approved, not cancelled, now<=registrationDeadline, now<startAt), reject if the student already has status REGISTERED (409 ALREADY_REGISTERED), count REGISTERED, reject if count>=capacity (409 EVENT_FULL), then upsert the single (eventId, studentId) row to REGISTERED (re-registration flips CANCELLED->REGISTERED). Only role STUDENT may register.
- Unregister: allowed any time before start while the event is not cancelled; keeps the row with status CANCELLED; seat is released.
- Public event page shows description, start/end in PKT, venue, society name, deadline, capacity, seats remaining (live) and the right button state: Register / Registered (Cancel registration) / Full / Registration closed / Event started.
- Logged-out Register click goes to /login?next=<this event path>; signup and verify pages keep ?next through the whole flow; after OTP the student lands on the event and can register. Validate next: must start with a single "/" and not "//" or a scheme.
- Notifications: president gets "new registration"; seats update live.
Write scripts/test-registration.ts (`npm run test:registration`): eligibility matrix (pending, rejected, draft, cancelled, past deadline, started, completed -> all blocked; approved before deadline -> allowed); duplicate registration blocked; cancel then re-register reuses the same row (assert row count == 1); cancel after start blocked; president/admin cannot register; the race test: capacity 5 with 20 students registering simultaneously => exactly 5 REGISTERED, 15 EVENT_FULL; cancel one then exactly one more succeeds; open-redirect attempts on next are ignored. Run and fix failures; print pass/fail.
```

---

## 5. VOLUNTEER AND TASK MANAGEMENT (12)

| Item | Marks |
|---|---|
| President invites registered students; response final; duplicates prevented | 3 |
| Tasks: required fields, optional assignee, only accepted volunteers can be assigned | 3 |
| Kanban: President can update ALL event tasks; volunteers only their own assigned tasks | 4 |
| Task deadlines, progress percentage, relevant notifications | 2 |

### Must implement
- Invite only when event APPROVED (not Pending, not Cancelled) and before start; invitee must be a STUDENT; one invitation per (event, student); declined cannot be re-invited; already invited -> 409. Suggest approved society members first in the search dropdown.
- Student accept/decline once; second response 409; only the invited student can respond.
- Task: title, description, priority (LOW/MEDIUM/HIGH), dueDate required; assignee optional; assignee must have ACCEPTED invitation for that same event; allowed for any non-cancelled event (Draft too); blocked on Cancelled.
- Status flow To Do / In Progress / Completed. President: any task of own events. Volunteer: only own assigned tasks, only the status field. Others 403.
- Progress % = completed / total, 0 if no tasks; shown per event; tasks show due date (overdue highlight) on student's "My tasks".
- Notifications: invitation sent, response, task assigned, task status updated (to the other party, not the actor).

### AGENT PROMPT 5
```
Audit and harden section 5 (Volunteers and tasks) against docs/07_JUDGING_RUBRIC_ENFORCEMENT.md.
- Invitations: create only if eventCaps.canInvite (Approved, not cancelled, before start, not Pending); invitee must be a STUDENT account; unique (eventId, studentId); a DECLINED or existing invitation returns 409; the search dropdown lists approved society members first, then other students. Student accept/decline only on own PENDING invitation; the response is final (second attempt 409; declined can never be accepted). Existing invitations stay visible when the event is Pending; new ones blocked.
- Tasks: required title, description, priority, dueDate; assignee optional; on create/update with an assignee, verify an ACCEPTED invitation exists for that event+student (else 400/403). Allowed on any non-cancelled event (including Draft and Pending); blocked on Cancelled (create, update, assign, delete). Assignee dropdown lists only ACCEPTED volunteers.
- Status updates: president (owner of the event's society) may update any task's status and fields; a volunteer may update ONLY the status of tasks assigned to them; any other user gets 403. Validate the status enum.
- Progress % = completed/total (0 when no tasks) on the president event page and the admin view; student "My tasks" shows due dates sorted by due date with overdue highlight.
- Notifications to the other party for invitation, response, assignment and status change; live updates for task status.
Write scripts/test-volunteers-tasks.ts (`npm run test:vt`): invite blocked on Draft/Pending/Cancelled/started events; duplicate invite 409; declined cannot be re-invited or accept later; accept is final; task creation on Draft ok, on Cancelled blocked; task with non-accepted assignee rejected; unassigned task ok; volunteer updates own task ok, another volunteer's task 403, president any task ok, other president 403; progress calculation with 0, 1/3, 3/3 tasks. Run, fix failures in the service layer, print pass/fail.
```

---

## 6. BUDGET AND EXPENSE TRACKING (9)

| Item | Marks |
|---|---|
| Administrator approves/rejects proposed budget together with event; cannot edit requested amount | 3 |
| Expenses allowed only under applicable event/budget conditions; hard approved-budget cap | 3 |
| Correct approved budget, total spent, remaining balance; President can edit/delete expenses | 3 |

### Must implement
- Combined decision (see section 3). Admin API ignores/rejects any amount field.
- Expenses allowed only if `eventCaps.canAddExpense` (Approved, not cancelled; includes Ongoing and Completed). Blocked on Draft, Pending (first and after-edit), Rejected, Cancelled.
- `spent + new <= approvedBudget` else 409 with message showing remaining; if `spent > approvedBudget` already, block all new. Edits: `spent - old + new <= approvedBudget`. Delete always allowed (for owner) unless event cancelled? (Keep delete allowed for owner on approved events; recalculates.)
- Amount positive integer; run in a transaction with the event row locked.
- UI: cards for approved budget / total spent / remaining (negative remaining shows "Over budget"). Rs formatting.

### AGENT PROMPT 6
```
Audit and harden section 6 (Budget and expenses) against docs/07_JUDGING_RUBRIC_ENFORCEMENT.md.
- Expense create/update/delete go through lib/services/expense.ts inside one transaction that locks/re-reads the event (Postgres: FOR UPDATE). Create requires eventCaps.canAddExpense (Approved, not cancelled, including Ongoing and Completed). Block on Draft, Pending (first and after-edit), Rejected, Cancelled with a clear 409 message. Validate amount as positive integer, title required, date valid.
- Cap: spent = SUM(expenses); if spent > approvedBudget -> block ALL new expenses ("Over budget"); else if spent + amount > approvedBudget -> 409 "Exceeds approved budget. Remaining: Rs X". On edit use spent - old + new. Only the owning president may create/edit/delete. Admin is read-only.
- Totals computed in the service (SUM queries), never stored: approvedBudget, totalSpent, remaining = approved - spent. Show negative remaining with an "Over budget" badge. Use the last approved budget while an edited event is Pending (shown read-only, no new expenses).
- Admin decision endpoint ignores any amount in the body and always sets approvedBudget = proposedBudget.
- UI: Expenses tab with summary cards, table (title, date, amount, note) with edit/delete, empty state, and server errors shown inline.
Write scripts/test-expenses.ts (`npm run test:expenses`): blocked in each disallowed state; allowed on Approved Upcoming, Ongoing and Completed; exact-cap expense ok; cap+1 rejected; edit that would exceed rejected; delete frees budget; 10 parallel expense requests that together exceed the cap never exceed it; spent already above approved blocks all; admin cannot change the amount; other president gets 403. Run, fix failures, print pass/fail.
```

---

## 7. ADMINISTRATOR DASHBOARD AND MONITORING (5)

| Item | Marks |
|---|---|
| Dashboard statistics and pending proposals with proposed budgets | 2 |
| Monitor societies, event states, registrations, task progress, budget summaries | 3 |

### Must implement
- Stats from DB: societies, events, registrations (REGISTERED count). Pending list: event, society, proposed budget, submitted time, Review button.
- Societies list (appears instantly after creation), events filterable: Approved / Upcoming / Ongoing / Completed (+ Pending/Rejected/Cancelled), each row with registrations count, task progress %, approved/spent/remaining.
- Admin read-only on everything except the approve/reject decision.

### AGENT PROMPT 7
```
Audit section 7 (Admin dashboard and monitoring) against docs/07_JUDGING_RUBRIC_ENFORCEMENT.md.
- /admin dashboard: counts of societies, events, registrations (status REGISTERED) via real DB aggregates (no hardcoded numbers), pending proposals table (event, society, proposed budget in Rs, submitted at PKT, Review button) with live update when a new proposal is submitted.
- /admin/societies: all societies, newest first, appears immediately after creation, with president name, member count, event count.
- /admin/events: filters All, Pending, Approved, Upcoming, Ongoing, Completed, Rejected, Cancelled (schedule filters computed from now); each row shows society, PKT dates, registrations/capacity, task progress %, approved budget, spent, remaining. Event detail view shows registrations list, tasks by status, expenses.
- Admin pages are read-only except the combined Approve/Reject decision with remarks.
Write scripts/test-admin.ts (`npm run test:admin`): stats equal direct DB counts after creating a society, submitting an event and registering a student; pending list shows the proposed budget; filters return the correct sets for each schedule state; non-admin gets 403. Run and fix failures.
```

---

## 8. NOTIFICATIONS AND REAL-TIME UPDATES (6)

| Item | Marks |
|---|---|
| Relevant in-app notifications: membership, event, registration, invitation, task events | 3 |
| At least one important activity updates without manual refresh | 3 |

### Notification matrix (recipient must be exact)
| Trigger | Recipient |
|---|---|
| Membership requested | President of that society |
| Membership approved/rejected/removed | The student |
| Event submitted (first or resubmitted) | All admins |
| Event approved/rejected (with remarks) | President |
| New registration (and cancel) | President |
| Invitation sent | Invited student |
| Invitation accepted/declined | President |
| Task assigned / status changed | Assignee and president (not the actor) |
| Event cancelled | Registered students + invited/accepted volunteers |

### Must implement
- Persisted in DB (`Notification`), bell with unread count, list, mark read, mark all read, link to the relevant page.
- Live: bell + toast, seats remaining on public page, registration count for president, Kanban status. Local/own server: SSE. On Vercel (serverless): polling every 3s via `useLive` hook (pause on hidden tab) is acceptable and must work.

### AGENT PROMPT 8
```
Audit section 8 (Notifications and real-time) against docs/07_JUDGING_RUBRIC_ENFORCEMENT.md.
- Implement/verify notify() calls in services for EVERY trigger in the notification matrix in docs/07 section 8, with exact recipients; never notify the actor; no duplicate notifications on retries.
- UI: bell with unread count, dropdown/list page, mark one/all read (persisted), each item links to the relevant page, toast on arrival.
- Real-time: at least these update WITHOUT manual refresh: (a) notification bell + toast, (b) seats remaining on /events/[id], (c) registration count on the president event page, (d) task status on Kanban for assignee and president, (e) pending proposals count for admin. Use SSE if running on a single server process; if the project is configured for Vercel/serverless use the polling hook useLive(url, 3000) that pauses when the tab is hidden and resumes with an immediate fetch. Add reconnect/error handling.
Write scripts/test-notifications.ts (`npm run test:notifications`): for each trigger assert recipients (and non-recipients) and unread counts; mark-read persists; then a live check: with two sessions, register a student and assert within 5s that the president's count/notification and the public seats value changed via the live endpoint. Fix failures and print pass/fail.
```

---

## 9. LANDING PAGE, USABILITY AND RESPONSIVENESS (5)

| Item | Marks |
|---|---|
| Clear landing page + automatic display of next 3–6 upcoming approved events | 2 |
| Usable, consistent navigation and responsive presentation across key screens | 3 |

### Must implement
- Landing explains purpose (students discover, organizers coordinate, admin oversees), clear Login/Signup CTA. Events come from DB: `APPROVED`, not cancelled, `startAt > now` (or ongoing per design doc), ordered by start, limit 6 (show min 3 when available). Empty state if fewer.
- Consistent nav per role, active state, breadcrumbs/back where deep. 375px mobile usable (sidebar -> drawer/bottom bar, tables -> stacked rows), no horizontal scroll, visible focus.
- Loading / empty / error states on all lists and forms.

### AGENT PROMPT 9
```
Audit section 9 (Landing and usability) against docs/07_JUDGING_RUBRIC_ENFORCEMENT.md and docs/04_DESIGN_SYSTEM.md (use the refined palette if the design refinement prompt was applied).
- Landing: purpose copy for students/organizers/admin, CTA to signup/login, "Coming up" section fed by a real query (Approved, not cancelled, not yet ended, ordered by start, limit 6; show at least 3 when available). Pending/Draft/Rejected/Cancelled/hidden events must never appear.
- Navigation: consistent app shell per role with clear active states, working links for every item, logout, notification bell; no dead links or placeholder pages.
- Responsive: test 375px, 768px, 1280px on landing, login/signup/verify, student, president, admin, public event, Kanban, expenses. No horizontal scroll, tap targets >= 44px, tables collapse to stacked rows, sidebar becomes drawer/bottom bar.
- Every list/form has loading skeleton, empty state with a next action, and error state. Visible focus ring; prefers-reduced-motion respected.
Run a crawl script (scripts/test-links.ts, `npm run test:links`) that logs in as each role and visits every sidebar link, asserting HTTP 200 and no console errors; also checks the landing events equal the DB query. Fix all failures.
```

---

## 10. TECHNICAL QUALITY, DATA INTEGRITY AND DELIVERY (7)

| Item | Marks |
|---|---|
| Real database persistence/retrieval; no hardcoded stats or simulated workflows | 3 |
| Sound data relationships, validation/error handling, reliable integration across roles | 2 |
| README, setup/test accounts, data model, accessible repository, required presentation | 2 |

### Must implement
- Prisma relations with FK, unique constraints: society.presidentId, (society, student) membership, (event, student) registration, (event, student) invitation, user.email. Indexes on common filters.
- Central error handler: `AppError(code, status, message)`; consistent JSON errors; no stack traces to client; zod validation everywhere.
- README with: overview, features, setup (`cp .env.example .env`, `npm run setup`, `npm run dev`), OTP procedure (console or SMTP), test accounts (admin + presidents + students), data model (ER summary), assumptions, limitations. `.env.example` present, no secrets committed, repo public/accessible.
- Seed has enough sample data (all event states, registrations, invitations, tasks, expenses).
- 3–4 slide presentation (`docs/SLIDES.md`) + demo script.

### AGENT PROMPT 10
```
Audit section 10 (Technical quality and delivery) against docs/07_JUDGING_RUBRIC_ENFORCEMENT.md.
1. Search the codebase for hardcoded stats, mock arrays, setTimeout-faked flows, buttons with no handlers, TODOs, and console.log of secrets; replace with real DB-backed behaviour or remove.
2. Review prisma/schema.prisma: all relations have foreign keys; unique constraints exist for user.email, society.presidentId, society.name, (societyId,studentId) membership, (eventId,studentId) registration, (eventId,studentId) invitation; add indexes for event(approvalStatus,startAt), notification(userId,readAt), task(eventId,assigneeId). Ensure money fields are integers.
3. Central error handling: AppError with status codes, zod validation on every route, consistent JSON {error:{code,message,fields?}}, no stack traces in responses, friendly UI messages.
4. Seed script creates: 1 admin, 2 presidents, 6 students, 2 societies, memberships in all states, events in every state (Draft, Pending, Pending-after-edit, Approved upcoming, Approved ongoing, Approved completed, Rejected, Cancelled), registrations (including Cancelled), invitations in all statuses, tasks in all columns, expenses (including one near the cap), notifications. Seed is idempotent.
5. Create README.md (overview, implemented features by role, tech stack, setup steps, OTP procedure for local + SMTP, test accounts table, data model summary with a mermaid ER diagram, business-rule notes, assumptions, limitations), .env.example, and make sure .env is gitignored and no secret exists in git history. Create docs/SLIDES.md (4 slides) and a 4-minute demo script.
6. Run `npm run build`, lint, and all test scripts; make sure a fresh clone works with `npm run setup && npm run dev`.
Report each item pass/fail.
```

---

## B. OPTIONAL BONUS (max +5) — sirf core pass hone ke baad
Cancellation notifications, Member/Core labels, PDF expense report, logo upload (<=2MB), volunteer withdrawal + task reset, over-budget reapproval warning, meetings. Kam az kam 2–3 poore aur bug-free karo (PDF report, labels, cancellation notifications sab se aasan).

### AGENT PROMPT BONUS
```
Core smoke test and all test:* scripts are passing. Now implement bonus features in this order, each fully working and tested, stopping if time runs out:
1) Cancellation notifications (registered students + invited/accepted volunteers).
2) Member / Core Member label on approved memberships (label only, no extra permissions; president can change it).
3) PDF expense report GET /api/events/[id]/report.pdf using pdfkit (runtime nodejs): event title, society, approved budget, expenses table, total spent, remaining (Over budget if negative). Owner president and admin only. "Download PDF" button on the expenses tab.
4) Society logo upload: POST /api/societies/[id]/logo, owner only, png/jpg/webp, <= 2MB validated server-side, stored in Vercel Blob when BLOB_READ_WRITE_TOKEN exists else /public/uploads; default avatar fallback.
5) Volunteer withdrawal: accepted volunteer can withdraw; their incomplete tasks become unassigned, In Progress -> To Do, Completed tasks keep the assignee; notify the president.
6) Reapproval warning: when admin reviews a resubmitted event whose proposed budget is lower than total spent, show a warning; if approved, remaining is negative with an "Over budget" label and new expenses are blocked.
7) Meetings: create/update/cancel by the president with title, PKT date/time, location, agenda, invitees chosen from APPROVED members; notify invitees on changes; students see "My meetings".
Add tests for each in scripts/test-bonus.ts and fix failures.
```

---

## MASTER AUDIT PROMPT (sab ek saath — final step)

```
Run a full rubric audit of UniSphere against docs/07_JUDGING_RUBRIC_ENFORCEMENT.md (all 10 sections). For each section: (1) re-read its "Must implement" list, (2) run its test script (create it if missing, using the prompt text in the doc), (3) fix every failure at the root cause in the service layer, (4) re-run until green. Then run the end-to-end smoke test in a real browser flow: OTP login -> society creation -> event creation -> submit -> admin approve -> logged-out public link -> register through login/OTP with next preserved -> seats update live in another tab. Finally run `npm run build`. Output a table: Section | Max marks | Items passed / total | Failures fixed | Remaining issues. Do not stop until every core item passes. Do not weaken tests to make them pass.
```

---

## PRE-DEMO FLIGHT CHECK (5 min)
1. `npm run db:seed` fresh data (ya naye real-email accounts bana lo).
2. Live par real email se OTP aa raha hai? (spam folder check)
3. 3 browser profiles ready: admin / president / student. Ek event with 1 seat left.
4. README ka test accounts table sahi hai, repo accessible hai, slides 3–4 hain.
5. `npm run build` green, console errors zero, 375px par landing + event page check.
