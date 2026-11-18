# UniSphere — University Society & Event Management Platform

> **Campus Noticeboard**: University societies historically run on fragmented WhatsApp groups and loose spreadsheets, leaving students uninformed and administrators blind to event budgets. UniSphere unifies societies, students, and administration onto a single, real-time operating platform with rigorous state-machine workflows, concurrency-safe ticketing, and hard budget cap enforcement.

---

## 1. Implemented Features

### 🎓 Student Role
- **Noticeboard & Discovery**: Browse approved campus societies and upcoming events with real-time seat availability and search/filter.
- **Membership Lifecycle**: Request society membership, view status (`Pending`, `Approved`, `Rejected`), and re-apply if rejected or removed.
- **Event Registration**: One-click attendee registration with concurrency protection, live seat countdown, and instant cancellation.
- **Volunteer Workflow**: Receive event volunteer invitations, accept or decline with permanent response recording, or withdraw if needed.
- **Task Management**: "My Tasks" board displaying deadlines and priorities; update progress status (`To Do`, `In Progress`, `Completed`) only on assigned tasks.
- **Real-Time Notification Bell**: Unread indicator, direct action links, mark-as-read, and live in-app notifications.

### 🏛️ President Role
- **Society Charter Management**: Maintain a single society charter (category, contact info, logo upload under 2MB).
- **Roster & Core Team**: Review student join requests; approve, reject, remove, or appoint members as "Core Member" with visual badges.
- **Event Lifecycle Orchestration**: Draft events, validate PKT dates, edit proposals, submit to university administration for approval, and cancel if needed.
- **Volunteer Coordination**: Invite students to approved events; view real-time acceptance status.
- **Kanban Task Board**: Create tasks with deadlines and priorities (`Low`, `Medium`, `High`); assign exclusively to accepted volunteers; track completion progress.
- **Financial Ledger & Hard Cap**: Itemized expenditure logging; real-time approved budget vs. spent tracking; server-enforced hard budget cap with over-budget lock; download branded official PDF expense report.

### 🛡️ Administration Role
- **Campus Analytics Dashboard**: Live metrics for total societies, sanctioned events, registered students, and pending proposals.
- **Proposal Review Workflow**: Review event proposals with proposed budgets; approve (locking sanctioned budget) or reject with mandatory explanatory remarks.
- **Campus Noticeboard Audit**: Monitor all registered societies, member counts, and events.
- **Financial Monitoring**: Track approved vs. actual expenditures campus-wide.

### ⚡ Real-Time Engine (SSE)
- **Live Seat Counts**: Public event pages and president event dashboards reflect capacity changes immediately without polling or page reload.
- **Real-Time Task Kanban**: Status transitions update live across president and volunteer views.
- **Instant Notification Delivery**: Server-Sent Events stream notifications directly into the UI header bell.

### 🎁 Completed Bonus Features
- **Cancellation Cascade**: Irreversible event cancellation notifies all registered attendees and invited volunteers.
- **Core Member Designation**: Presidents can promote approved members to "Core Member" with badge differentiation.
- **PDF Financial Report**: Generates downloadable PDF reports with society letterhead, financial summary, and itemized expenses using PDFKit.
- **Logo Upload**: Client-side validation for PNG/JPG/WEBP/SVG under 2MB with live image preview.
- **Volunteer Withdrawal Rule**: In-progress tasks reset to "To Do" and unassign; completed tasks preserve credit.
- **Defensive Over-Budget Lock**: Blocks new expenses with amber callout if budget is exceeded.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 App Router (TypeScript Strict Mode) |
| **Database & ORM** | Neon Postgres (Serverless PostgreSQL) with Prisma ORM 5.22 |
| **Styling & Design System** | Tailwind CSS — Custom "Campus Noticeboard" Palette (Paper, Ink, Surface, Emerald, Marigold, Rose, Sky) |
| **Typography** | Bricolage Grotesque (Headings) & Figtree (Body) |
| **Authentication** | Custom Two-Factor Auth (Bcrypt + 6-digit terminal OTP / SMTP) with Jose JWT HTTP-only cookies |
| **Real-time** | Live polling via `useLive` hook with visibility detection |
| **Storage** | Vercel Blob (with local `/public/uploads` fallback) |
| **PDF Generation** | PDFKit |
| **Date & Time** | Luxon (PKT `Asia/Karachi` time zone conversions) |

---

## 3. Setup (For Judges)

```bash
# 1. Clone repository
git clone https://github.com/ahmadcode24/Uni-Sphere.git
cd Uni-Sphere

# 2. Configure environment
cp .env.example .env

# 3. Install dependencies, apply database schema, and seed test data
npm.cmd run setup

# 4. Start development server
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Vercel Deployment Guide

Deploying UniSphere to Vercel requires zero code changes:

1. **Push Changes to GitHub**:
   ```bash
   git push origin main
   ```

2. **Import Project into Vercel**:
   - Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
   - Select the `Uni-Sphere` repository.
   - Framework preset: **Next.js** (auto-detected).
   - Build Command: `prisma generate && next build` (defined in `package.json`).

3. **Configure Environment Variables in Vercel**:
   Under **Project Settings -> Environment Variables**, add:
   - `DATABASE_URL`: `postgresql://neondb_owner:npg_JXUlzqP1by7W@ep-quiet-dream-a191fqx2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&connection_limit=25`
   - `DIRECT_URL`: `postgresql://neondb_owner:npg_JXUlzqP1by7W@ep-quiet-dream-a191fqx2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - `AUTH_SECRET`: A secure random 32+ character JWT secret string.
   - *(Optional)* `BLOB_READ_WRITE_TOKEN`: Create a Vercel Blob store under **Storage -> Blob** and connect it to your project.
   - *(Optional)* `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`: For automated email OTP verification codes.

4. **Deploy**:
   - Click **Deploy**. Vercel will install dependencies, generate the Prisma client (`postinstall`), and build the optimized production output.
   - The remote Neon Postgres database is already initialized and seeded with test accounts.

---

## 5. Login & Two-Factor OTP

All roles authenticate via email and password, followed by a **6-digit verification code**.
- In local development mode, OTP codes are logged directly to the server terminal:
  ```text
  ========================================
  [OTP] president1@unisphere.test -> 482910
  ========================================
  ```
- **Security Protections**:
  - OTP expires strictly after **10 minutes**.
  - **60-second cooldown** between resend requests.
  - **5-attempt limit**: The 5th incorrect attempt invalidates the code permanently.
  - Codes are stored as SHA-256 hashes in the database.

---

## 5. Seeded Demo Accounts

| Role | Email | Password | Pre-seeded Context |
|---|---|---|---|
| **Admin** | `admin@unisphere.test` | `Admin@12345` | Campus-wide overview, review pending proposals |
| **President 1** | `president1@unisphere.test` | `Pass@12345` | ACM Student Chapter (HackNova 2026, workshops) |
| **President 2** | `president2@unisphere.test` | `Pass@12345` | Dramatic & Arts Guild (Theatre Fest, Open Mic) |
| **Students** | `student1@unisphere.test` … `student6@unisphere.test` | `Pass@12345` | Varying memberships, registrations, tasks |

---

## 6. Suggested Demo Path (Smoke Test)

1. **Student Journey**:
   - Log in as `student3@unisphere.test` (grab OTP from terminal).
   - Browse **Societies** -> Open ACM Chapter -> Submit Join Request.
2. **President Approval & Event Creation**:
   - In a second incognito window, log in as `president1@unisphere.test`.
   - Go to **Members** -> Approve the student request -> Assign "Core Member" label.
   - Go to **Events** -> Create a new event with PKT dates and proposed budget -> Click **Submit for Approval**.
3. **Admin Review**:
   - In a third window, log in as `admin@unisphere.test`.
   - Open **Event Proposals** -> Review details and proposed budget -> Click **Approve**.
4. **Public Discovery & Live Concurrency**:
   - Open `/events/[id]` as an unauthenticated user -> Click **Register to Attend** -> Log in with preserved `next` parameter -> Register.
   - Watch the seats count decrement **in real time** on the President screen without a page refresh!
5. **Volunteer & Kanban Workflow**:
   - President invites `student1` as a volunteer.
   - Student accepts invite under `/student/invitations`.
   - President creates a task assigned to `student1`.
   - Student moves task from `To Do` to `In Progress` under `/student/tasks`; President's Kanban board updates live.
6. **Hard Budget Cap & PDF Report**:
   - President logs expenses; attempts an expense exceeding the approved cap -> Server blocks with descriptive error.
   - Click **Download PDF Report** to view the official financial summary.

---

## 7. Data Model & Architecture

```mermaid
erDiagram
    USER ||--o{ OTP_CODE : receives
    USER ||--o{ NOTIFICATION : has
    USER ||--o| SOCIETY : presides
    USER ||--o{ MEMBERSHIP : joins
    USER ||--o{ REGISTRATION : attends
    USER ||--o{ INVITATION : invited
    USER ||--o{ TASK : assigned

    SOCIETY ||--o{ MEMBERSHIP : has
    SOCIETY ||--o{ EVENT : organizes
    SOCIETY ||--o{ MEETING : schedules

    EVENT ||--o{ REGISTRATION : books
    EVENT ||--o{ INVITATION : coordinates
    EVENT ||--o{ TASK : tracks
    EVENT ||--o{ EXPENSE : logs
```

### Core Entities:
- **User**: Authentication, role (`STUDENT`, `PRESIDENT`, `ADMIN`), active status.
- **OtpCode**: SHA-256 hashed code, 10m expiry, attempt counter, invalidation timestamp.
- **Society**: Unique name, charter, category, contact information, logo URL, 1-to-1 with President.
- **Membership**: Student to Society link, status (`PENDING`, `APPROVED`, `REJECTED`, `REMOVED`), label (`MEMBER`, `CORE`).
- **Event**: 7-state lifecycle machine, venue, capacity, PKT start/end times, proposed & approved budget, remarks.
- **Registration**: Concurrency-safe attendee slot reservation (`REGISTERED`, `CANCELLED`).
- **Invitation**: Volunteer recruitment link (`PENDING`, `ACCEPTED`, `DECLINED`).
- **Task**: Kanban workflow card (`TODO`, `IN_PROGRESS`, `COMPLETED`), priority, due date, assignee guard.
- **Expense**: Financial item (`spentOn`, `title`, `amount`, `receiptUrl`), server-checked against approved budget cap.
- **Notification**: In-app alert log delivered live over SSE.

---

## 8. Critical Business Rules

1. **State Machine (`eventCaps`)**:
   - Status rules are evaluated through a pure capability matrix (`lib/services/event.ts`).
   - Editing an approved upcoming event resets status to `PENDING` and removes it from public listings until re-approved, preserving active registrations.
   - Events that pass their scheduled start time while in `PENDING` status can only be rejected by Admin.
2. **Concurrency-Safe Registration**:
   - SQLite serializes write mutations using WAL mode, busy timeout, and an in-process async lock queue (`regLock`).
   - Verified via a 20-parallel race test with capacity 5 resulting in exactly 5 successes and 15 rejections.
3. **Time Zone Integrity**:
   - All timestamps stored in UTC.
   - Input and display strictly anchored in **Asia/Karachi (PKT, UTC+5)**.
4. **Hard Budget Cap**:
   - Expenses can only be recorded for approved, non-cancelled events.
   - `sum(expenses) + newExpense` must not exceed `approvedBudget`.

---

## 9. Known Considerations

- **Single-Node In-Memory SSE**: Real-time event pub/sub is managed via Node.js process memory. For multi-instance horizontal scaling, replace the memory bus with Redis Pub/Sub.
- **Terminal OTP in Development**: By design for the hackathon showcase, OTP codes print to standard output for instant testing. Production can activate SMTP via `.env`.

---

*UniSphere — Engineered for the University Noticeboard.*
