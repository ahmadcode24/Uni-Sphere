# 02 — ARCHITECTURE

## Stack (fixed, chosen for speed + zero setup for judges)
- Next.js 14 (App Router, TS strict) — UI + API route handlers in one app
- Prisma + **SQLite** (`file:./dev.db`) — no DB server needed
- Tailwind CSS + framer-motion + lucide-react (icons)
- Auth: `bcryptjs`, `jose` (JWT in httpOnly cookies), `zod` validation
- Dates: `luxon` (zone `Asia/Karachi`)
- PDF (bonus): `pdfkit`
- Real-time: **Server-Sent Events** (in-memory pub/sub on `globalThis`)
- Email: `nodemailer` only if `SMTP_HOST` set; otherwise `console.log` the OTP

Install: `npm i @prisma/client bcryptjs jose zod luxon framer-motion lucide-react pdfkit nodemailer` and dev: `prisma tsx @types/bcryptjs @types/luxon @types/pdfkit @types/nodemailer`

## Folder structure
```
app/
  (public)/page.tsx                 landing
  (public)/events/[id]/page.tsx     public event page
  (auth)/login, signup, verify
  president/...  student/...  admin/...   (role route groups)
  api/                              route handlers (thin)
lib/
  db.ts  auth.ts  otp.ts  time.ts  realtime.ts  notify.ts  validators.ts
  services/ society.ts membership.ts event.ts registration.ts volunteer.ts task.ts expense.ts admin.ts
components/  ui/ + feature components
prisma/ schema.prisma  seed.ts
middleware.ts                        role + session guard for route groups
docs/
```
**Rule:** route handlers only parse input (zod) -> call a service -> return JSON. ALL business rules in `lib/services/*`.

## Prisma schema (use this, add indexes as needed)
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "sqlite"; url = "file:./dev.db" }

model User {
  id String @id @default(cuid())
  name String
  email String @unique
  passwordHash String
  role String            // STUDENT | PRESIDENT | ADMIN
  createdAt DateTime @default(now())
  society Society?       @relation("President")
  memberships Membership[]
  registrations Registration[]
  invitations Invitation[]
  tasks Task[]           @relation("Assignee")
  notifications Notification[]
  otps OtpCode[]
}

model OtpCode {
  id String @id @default(cuid())
  userId String
  codeHash String
  expiresAt DateTime
  attempts Int @default(0)
  usedAt DateTime?
  invalidatedAt DateTime?
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id])
  @@index([userId, createdAt])
}

model Society {
  id String @id @default(cuid())
  name String @unique
  description String
  category String
  contactEmail String
  contactPhone String?
  logoUrl String?
  presidentId String @unique
  createdAt DateTime @default(now())
  president User @relation("President", fields: [presidentId], references: [id])
  memberships Membership[]
  events Event[]
  meetings Meeting[]
}

model Membership {
  id String @id @default(cuid())
  societyId String
  studentId String
  status String @default("PENDING")   // PENDING | APPROVED | REJECTED | REMOVED
  label String @default("MEMBER")     // MEMBER | CORE (bonus)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  society Society @relation(fields: [societyId], references: [id])
  student User @relation(fields: [studentId], references: [id])
  @@unique([societyId, studentId])    // one row; re-request = set PENDING again
}

model Event {
  id String @id @default(cuid())
  societyId String
  title String
  description String
  venue String
  startAt DateTime
  endAt DateTime
  registrationDeadline DateTime
  capacity Int
  proposedBudget Int
  approvedBudget Int?
  approvalStatus String @default("DRAFT") // DRAFT|PENDING|APPROVED|REJECTED
  hasBeenApproved Boolean @default(false)
  isCancelled Boolean @default(false)
  adminRemarks String?
  decidedAt DateTime?
  submittedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  society Society @relation(fields: [societyId], references: [id])
  registrations Registration[]
  invitations Invitation[]
  tasks Task[]
  expenses Expense[]
  @@index([approvalStatus, startAt])
}

model Registration {
  id String @id @default(cuid())
  eventId String
  studentId String
  status String @default("REGISTERED") // REGISTERED | CANCELLED
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  event Event @relation(fields: [eventId], references: [id])
  student User @relation(fields: [studentId], references: [id])
  @@unique([eventId, studentId])
}

model Invitation {
  id String @id @default(cuid())
  eventId String
  studentId String
  status String @default("PENDING")   // PENDING | ACCEPTED | DECLINED | WITHDRAWN(bonus)
  createdAt DateTime @default(now())
  respondedAt DateTime?
  event Event @relation(fields: [eventId], references: [id])
  student User @relation(fields: [studentId], references: [id])
  @@unique([eventId, studentId])
}

model Task {
  id String @id @default(cuid())
  eventId String
  title String
  description String
  priority String @default("MEDIUM")  // LOW|MEDIUM|HIGH
  dueDate DateTime
  status String @default("TODO")      // TODO|IN_PROGRESS|COMPLETED
  assigneeId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  event Event @relation(fields: [eventId], references: [id])
  assignee User? @relation("Assignee", fields: [assigneeId], references: [id])
}

model Expense {
  id String @id @default(cuid())
  eventId String
  title String
  amount Int
  note String?
  spentOn DateTime
  createdAt DateTime @default(now())
  event Event @relation(fields: [eventId], references: [id])
}

model Notification {
  id String @id @default(cuid())
  userId String
  type String
  message String
  link String?
  readAt DateTime?
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id])
  @@index([userId, readAt])
}

model Meeting {            // bonus G
  id String @id @default(cuid())
  societyId String
  title String
  startAt DateTime
  location String
  agenda String
  isCancelled Boolean @default(false)
  society Society @relation(fields: [societyId], references: [id])
  invites MeetingInvite[]
}
model MeetingInvite {
  id String @id @default(cuid())
  meetingId String
  studentId String
  meeting Meeting @relation(fields: [meetingId], references: [id])
  @@unique([meetingId, studentId])
}
```

## Key service logic (implement exactly)

### time.ts
```ts
import { DateTime } from "luxon";
export const ZONE = "Asia/Karachi";
export const fromPKTInput = (s: string) => DateTime.fromISO(s, { zone: ZONE }).toUTC().toJSDate(); // datetime-local string
export const toPKTInput = (d: Date) => DateTime.fromJSDate(d).setZone(ZONE).toFormat("yyyy-LL-dd'T'HH:mm");
export const fmtPKT = (d: Date) => DateTime.fromJSDate(d).setZone(ZONE).toFormat("ccc, dd LLL yyyy, h:mm a") + " PKT";
export const schedule = (e:{startAt:Date;endAt:Date}, now=new Date()) => now < e.startAt ? "UPCOMING" : now <= e.endAt ? "ONGOING" : "COMPLETED";
```
Never use `new Date(string)` on form input; always `fromPKTInput`.

### Capacity-safe registration (registration.ts)
```ts
await prisma.$transaction(async (tx) => {
  const ev = await tx.event.findUnique({ where: { id } });
  // checks: APPROVED, !cancelled, now<=deadline, now<start
  const count = await tx.registration.count({ where: { eventId: id, status: "REGISTERED" } });
  if (count >= ev.capacity) throw new AppError("EVENT_FULL");
  await tx.registration.upsert({
    where: { eventId_studentId: { eventId: id, studentId } },
    create: { eventId: id, studentId, status: "REGISTERED" },
    update: { status: "REGISTERED" }, // only reached if existing is CANCELLED; if REGISTERED -> throw ALREADY_REGISTERED before
  });
});
```
SQLite serializes writers, so the transaction + count check is race-safe. Add a test script that fires 20 parallel register calls at an event with capacity 5 and asserts exactly 5 succeed.

### Event guards
Write one pure function `eventCaps(event, now)` returning `{ publicVisible, canEdit, canSubmit, canRegister, canInvite, canAddExpense, canCancel, canAdminApprove, canAdminReject }` derived from the Event Status Table. UI and services BOTH use it. This is the main bug-killer.

### Edit behaviour
- Draft/Rejected: update fields (stay in status; Rejected needs explicit Submit).
- Approved+Upcoming: update fields -> `approvalStatus=PENDING`, keep `approvedBudget`, `hasBeenApproved=true`, clear remarks, notify admins.
- Capacity edit rule: `newCapacity >= activeRegisteredCount`.

### Expense guard
```
if (!(ev.approvalStatus==="APPROVED" && !ev.isCancelled)) throw
spent = sum(expenses)
if (spent > ev.approvedBudget) throw "OVER_BUDGET_LOCKED"
if (spent + amount > ev.approvedBudget) throw "EXCEEDS_BUDGET"
```
For edit: compare `spent - old + new`. Run in a transaction.

## API surface (REST, JSON)
```
POST /api/auth/signup        {name,email,password,role: STUDENT|PRESIDENT}  (reject ADMIN)
POST /api/auth/login         -> sends OTP, sets preauth cookie
POST /api/auth/verify        {code}
POST /api/auth/resend
POST /api/auth/logout    GET /api/auth/me

GET/POST /api/societies      GET/PATCH /api/societies/[id]
POST /api/societies/[id]/join
GET  /api/societies/[id]/members   PATCH /api/memberships/[id] {action: approve|reject|remove|label}

GET/POST /api/events         (president: own)    GET /api/events/public (landing + list)
GET/PATCH /api/events/[id]   POST /api/events/[id]/submit | /cancel
POST /api/events/[id]/register   POST /api/events/[id]/unregister
GET  /api/events/[id]/registrations

POST /api/events/[id]/invitations   PATCH /api/invitations/[id] {action: accept|decline|withdraw}
GET/POST /api/events/[id]/tasks     PATCH /api/tasks/[id]   DELETE /api/tasks/[id]
GET/POST /api/events/[id]/expenses  PATCH/DELETE /api/expenses/[id]
GET  /api/events/[id]/report.pdf    (bonus)

GET  /api/admin/stats  /api/admin/events?filter=  /api/admin/societies
POST /api/admin/events/[id]/decision {decision: APPROVE|REJECT, remarks}

GET  /api/notifications     POST /api/notifications/read {id|all}
GET  /api/stream            (SSE)
```
Every handler: `requireRole()` -> ownership check (`event.society.presidentId === user.id`) -> service.

## Real-time (SSE)
`lib/realtime.ts`:
```ts
const g = globalThis as any;
g.__bus ??= new Map<string, Set<(d:any)=>void>>();
export const subscribe = (ch:string, fn:(d:any)=>void) => { (g.__bus.get(ch) ?? g.__bus.set(ch,new Set()).get(ch)).add(fn); return () => g.__bus.get(ch)?.delete(fn); };
export const publish = (ch:string, data:any) => g.__bus.get(ch)?.forEach(fn => fn(data));
```
`/api/stream?event=<id>`: authenticated or public (for event seats only), `runtime = "nodejs"`, `dynamic = "force-dynamic"`, headers `text/event-stream`, heartbeat every 25s, cleanup on `req.signal.abort`.
Channels: `user:<id>` (notifications), `event:<id>` (`seats`, `task`), `admin` (new submission).
Client hook `useStream(channels, handler)` with auto-reconnect. After every relevant mutation call `publish()`.
Dev server must run with `next dev` (single process) so the in-memory bus works; document `npm run build && npm start` also single process.

## Notifications helper
`notify(userIds[], {type,message,link})` -> insert rows + `publish("user:"+id, {kind:"notification", ...})`. Called from services only.

## Security musts
- httpOnly + sameSite cookies, JWT secret from `.env` (`AUTH_SECRET`), `.env.example` committed, `.env` gitignored.
- Never trust client role/ids; derive from session.
- Rate-limit OTP via DB attempts + cooldown (no extra lib).
- Output generic error on bad login ("Email or password is incorrect").

## Env
```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="change-me-long-random"
# optional
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS= MAIL_FROM=
```
Scripts: `dev`, `build`, `start`, `db:push` (`prisma db push`), `db:seed`, `setup` (`npm i && prisma db push && prisma db seed`).
