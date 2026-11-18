# 10 — TASK 2 QA CHECKLIST + DEMO SCRIPT

Test profiles: **Admin**, **President (NEXUS)**, **Student A (supervisor)**, **Student B (assignee)**, **Student C (outsider)**, plus fixtures: second admin, second president (another society).

## A. Setup / starter data
- [ ] NEXUS Society + its president + >= 3 students exist before any Task 2 action
- [ ] `npm run build` passes, no console errors
- [ ] Only the 3 existing roles exist (no Supervisor role anywhere in DB/UI)

## B. Mega Event (Admin)
- [ ] Admin sidebar/dashboard has a Mega Event section
- [ ] Create works with title, description, society, start date, end date, overall budget
- [ ] Selecting a society auto-shows/assigns its president; client-sent `presidentId` is ignored (test via curl)
- [ ] start > end rejected; start == end accepted; budget < 0 rejected; budget 0 accepted; non-integer rejected
- [ ] Same society can have multiple Mega Events
- [ ] Admin 1 cannot see/open Admin 2's Mega Event (404/403); president of another society cannot access it
- [ ] PATCH title/description works; PATCH with societyId / presidentId / startDate / endDate / overallBudget is rejected
- [ ] Admin has no controls/endpoints to create/edit sub-events, tasks, allocations, expenses (API returns 403 too)
- [ ] No approval step; Mega Event active immediately; president notified on creation

## C. Sub-events & supervisors (President)
- [ ] President sees only Mega Events assigned to them
- [ ] Create sub-event (title, description, date, start, end, venue, supervisor); at least two created
- [ ] Date before Mega start / after Mega end rejected; on start date and end date accepted (inclusive)
- [ ] startTime >= endTime rejected; times belong to selected date
- [ ] PKT round trip: 10:00 AM PKT stored as 05:00Z and displayed 10:00 AM PKT even if the browser timezone differs
- [ ] Supervisor must be a STUDENT (president/admin ids rejected); nonexistent id rejected
- [ ] One student can supervise multiple sub-events
- [ ] Edit sub-event details works and re-validates dates/times
- [ ] Change supervisor: old supervisor immediately 403 on that sub-event (UI + API), new supervisor immediately has access; both notified
- [ ] Another president (other society) cannot create/edit sub-events under this Mega Event (403/404)
- [ ] Sub-events do not appear in Task 1 public list, landing page, admin pending queue; no public registration/invitation UI for them

## D. Tasks / checklist / progress
- [ ] President creates tasks in each sub-event; tasks unassigned and assigned both work
- [ ] Assign to any registered student WITHOUT invitation or membership; non-student assignee rejected
- [ ] Checklist shows To Do / In Progress / Completed
- [ ] President can edit, reassign, change status, delete any sub-event task
- [ ] Supervisor: sees all tasks of own sub-event, can update status, cannot create/edit/assign/delete (API 403), cannot see tasks of a sub-event they don't supervise
- [ ] Supervisor cannot see budget/allocation/expense/overall budget anywhere (UI and JSON contain none of: allocatedBudget, spent, remaining, expenses, overallBudget); budget endpoints return 403
- [ ] Assignee (non-supervisor) updates only own tasks; updating someone else's task = 403
- [ ] Sub-event tasks appear in the assignee's existing "My Tasks" list with sub-event label; status update works there
- [ ] Outside supervised sub-events, student has only own-task privileges
- [ ] Student dashboard "My Supervised Sub-events": correct list, completion % (0 tasks = 0%, 1/3 = 33%, 3/3 = 100%)
- [ ] Mega Event overall progress = total completed / total tasks across sub-events
- [ ] Status changes notify president (not the actor); live update on other screen without refresh

## E. Budget & expenses
- [ ] Allocation set once per sub-event; second attempt 409; no edit/delete UI or API
- [ ] Sum of allocations == overall budget accepted; +1 rejected with unallocated amount shown
- [ ] Concurrent allocations (parallel requests) never exceed overall budget
- [ ] Expense blocked before allocation exists
- [ ] Expense == remaining accepted; +1 rejected; zero allocation blocks any expense
- [ ] Allocated / spent / remaining displayed and correct; Mega level overall/allocated/unallocated/spent correct
- [ ] 80% alert: at 79% none; at exactly 80% one notification to president; later expenses no second alert (flag persisted); one expense jumping 0 -> 100% gives exactly one alert; allocation 0 never alerts
- [ ] 10 parallel expenses: total never exceeds allocation and exactly one alert
- [ ] Only president can allocate/add expenses; supervisor/other student/admin 403
- [ ] No expense edit/delete exists (not required)
- [ ] No admin approval anywhere for sub-event expenses

## F. Task 1 isolation & regression
- [ ] Task 1 public event list and landing "Coming up" unchanged with Mega Events present
- [ ] Task 1 event progress %, task counts, expense totals/remaining identical before/after creating sub-event tasks/expenses
- [ ] Task 1 admin stats/pending proposals unaffected; admin Mega section has its own summaries
- [ ] All Task 1 test scripts still pass (`npm run test:*`) and the smoke test passes
- [ ] Student "My Tasks": Task 1 tasks follow Task 1 rules (invited volunteer), sub-event tasks follow Task 2 rules

## G. Security (backend enforcement)
- [ ] Every Task 2 route checks session role + ownership from DB (no trust in client ids)
- [ ] Direct API calls with another user's IDs return 403/404 (try each matrix row in 08 section 5)
- [ ] Supervisor privilege revoked immediately after reassignment (no stale token/cache)

## H. Bonus: AI report (only if done)
- [ ] "Analyse with AI" on each Mega Event dashboard (president only, own events)
- [ ] Report contains overall progress summary, observations, potential issues, recommendations
- [ ] All numbers come from `metrics` computed in code; AI text does not introduce numbers absent from metrics
- [ ] Analyses only the selected Mega Event
- [ ] API key only in server env; not in client bundle, responses, logs, or git (`.env` ignored, `.env.example` blank)
- [ ] AI unavailable -> clear error + metrics, no fake report; rate limit works; non-owner 403

## I. Delivery
- [ ] README updated: Task 2 features, DB changes, permission matrix, accounts, setup, AI env (if done)
- [ ] ER diagram updated; slides have one Task 2 slide
- [ ] Repo accessible; no secrets committed

---

## Task 2 demo (inside the existing 4-minute demo; Task 2 gets ~1m45s)
| Time | Action |
|---|---|
| 0:00–0:25 | Admin: Mega Events section -> create "NEXUS Tech Fest" (society NEXUS, dates, budget Rs 100,000) -> president auto-assigned shown |
| 0:25–1:00 | President: open Mega Event -> create 2 sub-events (Gaming Competition, Web Dev Workshop) with PKT times, pick supervisors -> add 2-3 tasks, assign one without invitation |
| 1:00–1:20 | Student (supervisor): dashboard "My Supervised Sub-events" shows % -> mark task In Progress/Completed (president sees update live); show no budget visible |
| 1:20–1:40 | President: allocate budgets (show overall cap rejection) -> add expense crossing 80% -> notification bell fires once |
| 1:40–1:45 | (Bonus) Analyse with AI -> report |
Closing line: "Task 1 public events/landing unchanged; Mega Events are internal only."

## Pre-flight (3 min)
1. Naye real-email accounts for NEXUS president + 3 students (OTP inbox mein aaye).
2. Optional: `npm run db:seed:task2` agar demo seed chahiye, warna live create karo.
3. 3 browser profiles ready, terminal visible agar console OTP ho.
4. `npm run test:task2` + Task 1 tests green, `npm run build` green.
5. README test accounts table updated, repo push ho chuka.
