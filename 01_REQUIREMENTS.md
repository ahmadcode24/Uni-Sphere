# 01 — REQUIREMENTS (Source of Truth)

## Roles
| Role | How created | Can do |
|---|---|---|
| PRESIDENT | Public signup | Owns exactly ONE society; manages its members, events, volunteers, tasks, expenses |
| STUDENT | Public signup | Browse societies/events, request membership, register for events, accept/decline volunteer invites, update own tasks |
| ADMIN | Seed script ONLY (never in signup UI or API) | Dashboard, approve/reject events+budget, monitor everything |

- One immutable role per account. Unique email. Password >= 8 chars (bcrypt).
- Signup API must reject `role=ADMIN` (server-side, not just hidden in UI).

## Authentication (all roles)
1. Email + password -> if valid, generate 6-digit OTP, send to console (nodemailer optional via env `SMTP_*`; if missing, `console.log`). Issue short-lived "pre-auth" httpOnly cookie. Redirect to `/verify`.
2. OTP rules:
   - Expires in **10 min**.
   - Max **5** wrong attempts; the 5th wrong attempt **invalidates** the code -> user must request new one.
   - **Resend cooldown 60 s** (show countdown in UI; enforce in server).
   - New code **invalidates** the previous one.
   - Store hashed code (sha256+salt/bcrypt), `expiresAt`, `attempts`, `usedAt`, `invalidatedAt`.
   - Generated on **every login attempt**. No universal code. Never returned to client.
3. After OTP success -> issue session JWT (httpOnly, sameSite=lax) and redirect by role (`/president`, `/student`, `/admin`) OR to preserved `next` URL.
4. **Redirect preservation:** logged-out user on `/events/[id]` clicks Register -> `/login?next=/events/[id]` (or `/signup?next=...`) -> `/verify?next=...` -> back to `/events/[id]` where registration completes (auto-focus the Register button; do not auto-register silently).
5. Role guards: middleware for route groups + server check inside every handler.

## Societies
- Fields: name (unique), description, category (fixed list: `Technology, Arts & Culture, Sports, Academic, Social Welfare, Business, Literary, Other`), contact email, contact phone/link.
- Active immediately on creation. President can create only ONE (enforce in service + unique `presidentId`).
- Create + update profile. President sees only own society.
- Students (login required) browse societies list + detail page.
- **Membership**: Student requests -> president approves/rejects; president can remove member. Only ONE pending request per student+society. After REJECTED or REMOVED the student may request again (reuse same row: set status back to PENDING). Statuses: `PENDING, APPROVED, REJECTED, REMOVED`.
- Student sees their request status on the society page.

## Events
Fields: title, description, venue, startAt, endAt, registrationDeadline, capacity, proposedBudget (PKR int), approvalStatus (`DRAFT|PENDING|APPROVED|REJECTED`), `isCancelled`, `hasBeenApproved`, `approvedBudget` (nullable int), `adminRemarks`, `decidedAt`.

Validation: `start < end`; `deadline <= start`; `capacity >= 1`; `proposedBudget >= 0`; capacity cannot go below active (Registered) count.
Timezone: input/ display = Asia/Karachi; storage = UTC.

**Schedule status** (computed, never stored): Upcoming (now < start), Ongoing (start <= now <= end), Completed (now > end).

### Event Status Table (single source of truth)
| State | Public list/link | Edit | New registrations | New invitations | New expenses | Cancel |
|---|---|---|---|---|---|---|
| Draft | Hidden, link 404 | Yes (before start) | No | No | No | Yes |
| Pending (first submit) | Hidden, link 404 | Locked | No | No | No | Yes |
| Pending (after editing an Approved event) | Hidden; link temporarily unavailable | Locked | No (existing kept) | No (existing kept) | No (last approved budget remains in force) | Yes |
| Approved + Upcoming | Listed + link | Yes (before start; **returns to Pending**) | Yes, until reg deadline | Yes, until event starts | Yes, within approved budget | Yes |
| Approved + Ongoing | Listed + link | No | No | No | Yes, within approved budget | Yes |
| Approved + Completed | Direct link only; registration closed | No | No | No | Yes (record remaining receipts) | No |
| Rejected | Hidden, link 404 | Yes (before start); explicit **Submit** required | No | No | No (last approved budget visible if previously approved) | Yes |
| Cancelled | Hidden, link 404 | Frozen | No; existing registrations -> `Cancelled` | No; invitations kept as records | No | Already cancelled |

Extra rules:
- Editing an Approved+Upcoming event -> status becomes PENDING, `hasBeenApproved` stays true, `approvedBudget` stays (last approved budget remains in force).
- If start time passed while Pending: admin can ONLY reject (hide Approve button + block in API).
- Draft/Rejected with start in the past: cannot submit; only cancel.
- Cancellation is irreversible; closes registration; registrations kept with status `Cancelled`.
- President sees admin decision + remarks on event page.
- A completed event link works only if `approvalStatus=APPROVED && !isCancelled` and it was Approved (not pending-after-edit).

### Admin decision (combined event + budget)
- ONE decision: Approve or Reject, with remarks (remarks required on reject).
- Approve -> `approvalStatus=APPROVED`, `approvedBudget = proposedBudget`, `hasBeenApproved = true`. Admin cannot edit amount.
- Reject -> `approvalStatus=REJECTED`, remarks saved, budget rejected with it. Budget outcome shown as part of the event decision.

## Registrations
- One record per (student, event), unique constraint. Status: `REGISTERED | CANCELLED`.
- Allowed only if: event `APPROVED`, not cancelled, `now <= registrationDeadline`, `now < startAt`, student not already REGISTERED, registered count < capacity.
- Re-register after cancel: flip same row CANCELLED -> REGISTERED after capacity check.
- Student can cancel any time before start (event not cancelled). Row stays, status CANCELLED, seat freed.
- **Concurrency-safe**: capacity check + write inside one DB transaction (see architecture doc).
- Public page: description, start/end (PKT), venue, organizer (society name), deadline, capacity, **seats remaining (live)**.

## Volunteers
- Invite any registered student (suggest society members first) to an **Approved** event (not Pending, not Cancelled, before start). One invitation per (event, student). Statuses: `PENDING, ACCEPTED, DECLINED`.
- Student accepts/declines; response is **final**. Declined cannot be re-invited.
- Existing invitations stay when event returns to Pending; new ones blocked.

## Tasks
- Fields: title, description, priority (`LOW|MEDIUM|HIGH`), dueDate, status (`TODO|IN_PROGRESS|COMPLETED`), assigneeId (nullable).
- Create for any non-cancelled event (even Draft). Assignee must have an ACCEPTED invitation for that event.
- President can update status of any task on own events; volunteer only on tasks assigned to them.
- Progress % = completed / total (0 if no tasks). Kanban board with 3 columns.
- Volunteers see deadlines + their tasks.

## Budget & Expenses
- Fields: title, amount (>0 int), note, date.
- Allowed only when event `APPROVED && !cancelled` (see table; includes Completed). Total spent must not exceed `approvedBudget`. If already spent > approved (after reapproval lower budget) -> block ALL new expenses.
- President can edit/delete expenses (edit must still respect cap).
- Show approvedBudget, totalSpent, remaining (auto-calculated; negative remaining shown with **Over budget** label).

## Admin
- Dashboard: counts (societies, events, registrations) from DB + list of pending proposals with proposed budget.
- Review page: approve/reject with remarks.
- Monitoring: all societies (instantly visible), events filterable by approved/upcoming/ongoing/completed, registrations per event, task progress, budget summary (approved/spent/remaining) across societies.

## Notifications (in-app, persisted in DB)
Triggers -> recipients:
- Membership request -> president; decision/removal -> student
- Event submitted -> all admins; decision -> president
- New registration -> president
- Invitation sent -> student; response -> president
- Task assigned/updated -> assignee + president (don't notify the actor)
- Event cancelled -> registered students + invited/accepted volunteers (bonus F but cheap — do it)
UI: bell with unread count, dropdown list, mark read / mark all read, toast on new arrival.

## Real-time (must have)
SSE stream (see architecture). Live: notifications (bell + toast), seats remaining on public event page, registration count on president dashboard, Kanban task status.

## Landing page
Introduces UniSphere (students discover societies/events, organizers coordinate, admin oversees). Auto-shows next **3–6** upcoming APPROVED events from DB (not cancelled, not hidden). Clear CTA to signup/login. Public.

## Bonus (ONLY after core smoke test passes) — priority order
1. Cancellation notifications (F)
2. Member / Core Member labels (C)
3. PDF expense report (A) — pdfkit
4. Society logo upload <= 2 MB (B) — png/jpg/webp, saved to `/public/uploads`
5. Volunteer withdrawal + task reset (D)
6. Reapproval warning + Over budget (E)
7. Meetings (G)
