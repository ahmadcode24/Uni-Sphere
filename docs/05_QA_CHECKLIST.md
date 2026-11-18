# 05 — QA CHECKLIST (must pass before finishing)

Test with 3 browser profiles (admin / president / student). OTP codes appear in the **server terminal**.

## A. CORE SMOKE TEST (judges will do this first)
- [ ] Student signup -> login -> OTP from console -> lands on student dashboard
- [ ] President signup -> login -> OTP -> creates society
- [ ] President creates event (valid dates, PKT) -> Submit for approval
- [ ] Admin login -> OTP -> sees pending event + budget -> Approve
- [ ] President sees "Approved" + admin remarks
- [ ] Logged-out user opens public event link -> clicks Register -> login (next preserved) -> OTP -> returns to event -> registers
- [ ] Seats remaining drops by 1 live on the president's screen and on the public page in another tab without refresh
- [ ] Landing page lists this event (real DB data)

## B. Auth & OTP
- [ ] Signup rejects: weak password (<8), duplicate email, role=ADMIN (also via curl)
- [ ] Wrong password -> generic error, no OTP sent
- [ ] OTP generated on EVERY login attempt; each printed only in terminal
- [ ] Code expires after 10 min (test by setting env override or editing DB `expiresAt`)
- [ ] 5th wrong attempt invalidates code; correct code afterwards also fails; new code works
- [ ] Resend inside 60s rejected with countdown; after 60s works; old code stops working
- [ ] Role guards: student cannot open `/president/*` or `/admin/*` (UI + direct API call -> 403)
- [ ] President A cannot read/edit President B's society/events (API check by ID)
- [ ] `next` redirect survives signup + login + verify; external `next` (e.g. `https://evil.com`) is ignored
- [ ] Logout clears session; back button doesn't reveal protected data

## C. Societies & membership
- [ ] President can create only ONE society (second attempt fails)
- [ ] Category limited to fixed list; update profile works
- [ ] Society browsing/details need login (logged-out -> login)
- [ ] Student request -> president approve / reject; duplicate pending blocked
- [ ] Reject -> student can request again; remove -> student can request again
- [ ] Admin sees new society immediately

## D. Events
- [ ] Validations: start<end, deadline<=start, capacity>=1, budget>=0 (server-side messages shown inline)
- [ ] Enter 10:00 PM while browser is in a different timezone -> stored UTC correct, displayed 10:00 PM PKT
- [ ] Draft editable; Pending locked; Rejected editable + needs explicit Submit
- [ ] Editing Approved+Upcoming -> returns to Pending, public link/list hidden, existing registrations kept, last approved budget still in force
- [ ] Capacity cannot be set below active registrations
- [ ] Past-start Pending -> admin can only Reject (Approve hidden + API blocks)
- [ ] Past-start Draft/Rejected -> cannot submit, can cancel
- [ ] Cancel is irreversible; registrations become CANCELLED; public link 404
- [ ] Completed Approved event: direct link works, not in listing, registration closed
- [ ] Walk every row of the Event Status Table against UI buttons AND direct API calls

## E. Registration
- [ ] Register, cancel, re-register (same row flips)
- [ ] Duplicate active registration blocked
- [ ] Blocked after deadline, after start, for Pending/Rejected/Cancelled event
- [ ] Capacity race test: 20 parallel requests on capacity 5 -> exactly 5 REGISTERED
- [ ] Seats remaining correct after cancel (live)

## F. Volunteers & tasks
- [ ] Invite only on Approved + before start; not on Pending/Cancelled
- [ ] One invitation per student+event; declined cannot be re-invited; response final
- [ ] Existing invitations survive event -> Pending; new ones blocked
- [ ] Task creatable on Draft/Pending/Approved, NOT on Cancelled; creatable unassigned
- [ ] Assignee dropdown shows only ACCEPTED volunteers; API rejects others
- [ ] President changes any task status; volunteer changes only own; other student 403
- [ ] Progress % correct (0% with no tasks)
- [ ] Live task status update on other user's screen

## G. Expenses
- [ ] Blocked on Draft/Pending/Rejected/Cancelled; allowed on Approved (Upcoming, Ongoing, Completed)
- [ ] Cannot exceed approved budget (add + edit); if spent already > approved -> all new blocked
- [ ] Edit/delete expense recalculates approved / spent / remaining
- [ ] Remaining shows negative + "Over budget" when applicable

## H. Admin
- [ ] Stats are real counts; pending list shows proposed budget
- [ ] Approve sets approvedBudget = proposedBudget; Reject requires remarks
- [ ] Filters: approved / upcoming / ongoing / completed
- [ ] Registrations, task progress, budget summary visible per event

## I. Notifications & real-time
- [ ] Each trigger in 01_REQUIREMENTS.md creates a row for the right recipients only
- [ ] Bell count + toast update live; mark read / mark all read persist
- [ ] SSE reconnects after server restart / tab sleep

## J. UI / quality
- [ ] No gradients/glass/purple; palette + fonts as per design doc
- [ ] Anti-pattern audit list in 04 is all unchecked (none present)
- [ ] Every page has loading + empty + error states
- [ ] 375px mobile layout usable; keyboard focus visible; reduced-motion respected
- [ ] No console errors; `npm run build` passes; fresh clone -> `npm run setup` -> `npm run dev` works
- [ ] No secrets committed; `.env.example` present

## K. Bonus (only if A passes)
- [ ] Cancellation notifications to registered + invited/accepted
- [ ] Member / Core label (no extra permissions)
- [ ] PDF report downloads (approved budget, expenses table, remaining)
- [ ] Logo upload <=2MB, type-checked
- [ ] Withdrawal: incomplete tasks unassigned, In Progress -> To Do, Completed keep assignee
- [ ] Reapproval below spent: admin warning; if approved -> negative balance + Over budget + blocked
- [ ] Meetings: create/update/cancel + notify invited members
