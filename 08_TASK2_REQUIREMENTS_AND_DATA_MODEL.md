# 08 — TASK 2: MEGA EVENT MANAGEMENT (Requirements + Data Model)

Task 2 existing UniSphere project ko **extend** karta hai (same repo, same DB, same login). Task 1 ka koi workflow change nahi hona chahiye.

## 1. Kya banana hai (one-minute summary)
Example: **NEXUS Tech Fest** (Mega Event) = Gaming Competition + Web Dev Workshop + Quiz + Project Exhibition (Sub-events).

| Kaun | Kya karta hai |
|---|---|
| **Admin** | Mega Event banata hai (title, description, society, start date, end date, overall budget). Society ka president **automatically** assign hota hai. Baad mein sirf title + description edit kar sakta hai. Sub-events manage **nahi** karta. |
| **President** | Apne Mega Event ke andar sub-events banata hai, har sub-event ka supervisor (ek student) chunta hai, preparation tasks banata hai, budget allocate karta hai (ek baar), expenses record karta hai. |
| **Student** | Agar kisi sub-event ka supervisor hai: us sub-event ke saare tasks dekh/update kar sakta hai (budget nahi dekh sakta, task create nahi kar sakta). Warna sirf apne assigned tasks update kar sakta hai. |

Koi naya role nahi. "Supervisor" sirf ek student ki zimmedari hai (DB field), role nahi.

## 2. Isolation rules (Task 1 se alag)
- Mega Events/sub-events **kabhi** Task 1 public event list, landing page highlights, ya admin event approval queue mein nahi aane chahiye. Public registration, volunteer invitation, event approval workflow in par apply **nahi** hota.
- Task 1 ke event/task/expense summaries mein sub-event ke tasks/expenses count nahi hone chahiye. Task 2 ke apne summaries hon.
- Task 1 ke saare flows (tests `test:*`) abhi bhi pass hon.

## 3. Business rules (exact)

### 3.1 Mega Event (Admin)
- Fields: `title`, `description`, `societyId`, `startDate`, `endDate`, `overallBudget`.
- Validation: `startDate <= endDate` (equal allowed); `overallBudget` integer `>= 0`; title/description required; society exists.
- `presidentId` = `society.presidentId` **server-side automatically** (client se kabhi accept nahi). Ek society ke multiple Mega Events ho sakte hain.
- Create ke baad sirf `title` + `description` edit hon. `societyId`, `presidentId`, dates, budget fixed: PATCH mein ye fields aayein to 400 (ya ignore, but test mein reject better).
- Koi approval nahi: create hote hi active.
- Access: admin sirf `createdById === admin.id` wale Mega Events dekhe; president sirf `presidentId === president.id` wale; dusre ko 403/404.
- Admin read-only summary dekh sakta hai (sub-events list, progress %, budget summary) lekin sub-events create/edit/assign nahi kar sakta, tasks/expenses nahi chheDta.

### 3.2 Sub-event (President)
- Fields: `title`, `description`, `date`, `startTime`, `endTime`, `venue`, `supervisorId`.
- `date` Mega Event ki `startDate..endDate` ke andar (**inclusive**).
- `startTime < endTime`, dono usi selected date par (cross-midnight nahi).
- Timezone: input **Asia/Karachi (PKT)**, DB mein UTC `startAt/endAt`, display PKT (Luxon, `fromPKTInput` jaisa Task 1). Date-only fields (`date`, Mega `startDate/endDate`) `YYYY-MM-DD` string rakho (PKT calendar date) taake timezone shift na ho.
- Supervisor: ek existing **STUDENT** account (President/Admin nahi). Ek student multiple sub-events supervise kar sakta hai.
- President sub-event details edit kar sakta hai aur supervisor change kar sakta hai (edit pe dates dobara validate).
- **Supervisor reassign:** purana supervisor **foran** privileges kho de, naya foran mil jaye. Permission har request par DB se check ho (`subEvent.supervisorId === session.userId`), kisi cache/JWT claim/frontend state par nahi.
- Minimum demo: 2 sub-events.

### 3.3 Tasks (sub-event ke andar)
- Fields: `title`, `description`, `priority` (LOW/MEDIUM/HIGH), `dueDate` (form mein default = sub-event date), `status` (TODO/IN_PROGRESS/COMPLETED), `assigneeId` (nullable).
- Assignee: koi bhi registered **STUDENT** (invitation/society membership zaroori nahi). Unassigned allowed.
- President: create, edit, assign/unassign, status update, delete — sab tasks.
- Supervisor (apne sub-event mein): saare tasks **dekh** sakta hai aur **status update** kar sakta hai. Task create/edit/assign/delete nahi. Budget/expenses nahi dekh sakta (API response mein bhi nahi).
- Koi bhi student: apne assigned tasks ka status update kar sakta hai (kisi bhi sub-event mein). Ye tasks us ki existing "My Tasks" list mein bhi aayein (sub-event + mega event ka naam label ke saath).
- Baqi students: koi access nahi.

### 3.4 Progress
- Sub-event completion % = `completed / total tasks`; 0 tasks => 0%.
- Mega Event overall % = (total completed tasks across sub-events) / (total tasks across sub-events); 0 => 0%.
- Student dashboard: **My Supervised Sub-events** section, har ek ke saath completion %.

### 3.5 Budget & expenses
- President har sub-event ka `allocatedBudget` **sirf ek baar** set karta hai (integer >= 0). Dobara set => 409. Allocation edit/delete nahi.
- `SUM(allocations of all sub-events) <= megaEvent.overallBudget`; warna 409 "Exceeds overall budget. Unallocated: Rs X". Race-safe (transaction + row lock).
- Expense sirf allocation set hone ke baad. `spent + amount <= allocatedBudget` warna 409 (zero allocation => koi expense nahi). Amount positive integer. Expense edit/delete implement nahi karna.
- Sub-event ke liye dikhao: allocated, spent, remaining (calculated, stored nahi). Mega Event level: overall, total allocated, unallocated, total spent.
- Expenses ko admin approval nahi chahiye.
- **80% alert:** har expense ke baad (same transaction) check: `allocated > 0 && spent*100 >= allocated*80` (integer math: `spent*5 >= allocated*4`) **aur** `budgetAlertSent == false` => president ko in-app notification + `budgetAlertSent = true`. Har sub-event ke liye sirf **ek** baar. `allocated == 0` => kabhi nahi. Ek hi expense jo seedha 100% kar de to bhi sirf 1 notification.

### 3.6 Notifications (Task 2)
| Trigger | Recipient |
|---|---|
| Mega Event created | President (assigned) |
| Supervisor assigned / changed | New supervisor; old supervisor ("no longer supervisor") |
| Task assigned | Assignee |
| Task status updated | President (aur assignee, agar actor wo nahi) |
| 80% budget threshold | President (once per sub-event) |
Actor ko notify nahi karna. Existing bell/real-time mechanism reuse karo.

## 4. Data model changes (Prisma)
```prisma
model MegaEvent {
  id            String   @id @default(cuid())
  title         String
  description   String
  societyId     String
  presidentId   String            // = society.presidentId, set server-side
  createdById   String            // admin
  startDate     String            // "YYYY-MM-DD" (PKT calendar date)
  endDate       String
  overallBudget Int
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  society   Society  @relation(fields: [societyId], references: [id])
  president User     @relation("MegaPresident", fields: [presidentId], references: [id])
  createdBy User     @relation("MegaCreator", fields: [createdById], references: [id])
  subEvents SubEvent[]
  @@index([createdById])
  @@index([presidentId])
}

model SubEvent {
  id              String   @id @default(cuid())
  megaEventId     String
  title           String
  description     String
  date            String            // "YYYY-MM-DD"
  startAt         DateTime          // UTC
  endAt           DateTime          // UTC
  venue           String
  supervisorId    String
  allocatedBudget Int?              // null = not allocated yet; set once
  budgetAlertSent Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  megaEvent  MegaEvent @relation(fields: [megaEventId], references: [id])
  supervisor User      @relation("Supervisor", fields: [supervisorId], references: [id])
  tasks      Task[]
  expenses   Expense[]
  @@index([megaEventId])
  @@index([supervisorId])
}

// EXTEND existing models (Task 1 tables)
model Task {
  // eventId String   -> eventId String?     (nullable now)
  // add:
  subEventId String?
  subEvent   SubEvent? @relation(fields: [subEventId], references: [id])
  @@index([subEventId])
  @@index([assigneeId])
}
model Expense {
  // eventId String   -> eventId String?
  subEventId String?
  subEvent   SubEvent? @relation(fields: [subEventId], references: [id])
  @@index([subEventId])
}
// Add back-relations on User (MegaPresident, MegaCreator, Supervisor) and Society (megaEvents MegaEvent[]).
```
**Invariant (service + DB CHECK if possible):** har Task/Expense mein **exactly one** of `eventId` / `subEventId` set ho.

**Regression warning:** `Task.eventId` / `Expense.eventId` nullable karne se Task 1 queries/types toot sakte hain. Task 1 ki *har* query jo tasks/expenses ko event ke hisaab se count karti hai (`progress %`, `spent`, admin summaries, student My Tasks) ko explicitly `eventId != null` / `subEventId == null` se filter karo, aur Task 1 tests dobara chalao.

## 5. Permission matrix (backend enforce)
| Action | Admin | President (owner) | Supervisor of that sub-event | Other student |
|---|---|---|---|---|
| Create Mega Event | yes | no | no | no |
| View Mega Event | only created by self (read-only) | only assigned | no | no |
| Edit Mega title/description | own created | no | no | no |
| Create/edit sub-event, change supervisor | no | yes | no | no |
| View sub-event details | read-only (own mega) | yes | yes (no budget fields) | no |
| Create/edit/assign/delete task | no | yes | no | no |
| View tasks of sub-event | read-only | all | all (that sub-event) | only own assigned |
| Update task status | no | all | all in that sub-event | only own assigned |
| View budget / allocations / expenses | summary only (own mega) | yes | **no** (field-stripped + 403) | no |
| Allocate budget / add expense | no | yes | no | no |
| AI report (bonus) | no | yes (own) | no | no |

## 6. API (suggested; separate from Task 1 routes)
```
POST   /api/admin/mega-events                     create (admin)
GET    /api/admin/mega-events                     own created list + summaries
GET    /api/admin/mega-events/[id]                read-only detail (own)
PATCH  /api/admin/mega-events/[id]                {title, description} ONLY

GET    /api/president/mega-events                 assigned list + summaries
GET    /api/president/mega-events/[id]            full detail (sub-events, budgets, progress)
POST   /api/president/mega-events/[id]/sub-events create (supervisorId required)
PATCH  /api/president/sub-events/[id]             edit details / supervisorId
POST   /api/president/sub-events/[id]/tasks       create task
PATCH  /api/president/sub-tasks/[id]              edit/assign/status (president)
DELETE /api/president/sub-tasks/[id]
POST   /api/president/sub-events/[id]/allocation  {amount} once
GET/POST /api/president/sub-events/[id]/expenses  list / add (no PATCH/DELETE)
POST   /api/president/mega-events/[id]/ai-report  (bonus)

GET    /api/student/supervised                    my supervised sub-events + completion %
GET    /api/student/sub-events/[id]               supervisor view (budget-stripped DTO)
PATCH  /api/student/sub-tasks/[id]/status         own task OR supervisor of its sub-event
GET    /api/student/tasks                         EXISTING list, now also includes sub-event tasks (labelled)
```
Service layer: `lib/services/mega.ts`, `subevent.ts`, `subtask.ts`, `submoney.ts`, `megaAi.ts`. Permission helpers: `assertAdminOwnsMega`, `assertPresidentOwnsMega`, `assertPresidentOwnsSubEvent`, `canUpdateSubTask(user, task)` (president owner | supervisor of task.subEvent | task.assigneeId===user.id).

## 7. UI map
- **Admin:** sidebar "Mega Events" -> list (cards/table: title, society, president, dates, budget, sub-events, progress, spent) + "Create Mega Event" modal (society dropdown shows president name preview) + detail (read-only summary) + edit title/description.
- **President:** sidebar "Mega Events" -> list; detail with tabs: **Overview** (overall/allocated/unallocated/spent, overall progress), **Sub-events** (create/edit, supervisor picker with student search, PKT times), **Checklist** (per sub-event task list grouped To Do / In Progress / Completed, create/assign/status), **Budget** (allocation once, expenses form, allocated/spent/remaining, 80% badge), **AI report** (bonus).
- **Student:** dashboard section **My Supervised Sub-events** (title, mega event, date/time PKT, venue, completion % bar) -> opens checklist (status updates only, no budget). Existing **My Tasks** shows sub-event tasks with a "Sub-event · Mega Event" label.
- Same design system as Task 1 (docs/04 + refinements). Empty states: "No sub-events yet. Create your first sub-event.", etc.

## 8. Starter data (must exist before Task 2)
- **NEXUS Society** + its president account + at least **3** Student accounts (seed idempotent, added to existing seed). Judges "NEXUS Society, its president and 3 students" use karenge.
- For live demo/OTP use **real emails** for these accounts (Gmail `+` trick) ya README mein documented OTP procedure.
- Optional demo seed (`npm run db:seed:task2`): "NEXUS Tech Fest 2026" Mega Event + 4 sub-events (Gaming Competition, Web Development Workshop, Quiz Competition, Project Exhibition), supervisors, tasks across statuses, allocations, expenses (ek sub-event 80% ke paas). Mega Event create wala step demo mein live karne ke liye is seed ko optional rakho ya ek aur empty society use karo.
