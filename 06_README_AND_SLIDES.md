# 06 — README + SLIDES + DEMO SCRIPT

## README.md (Antigravity must generate this at the end)
Sections, in order:
1. **UniSphere** — 2-line overview (problem + solution)
2. **Implemented features** — grouped by role (President / Student / Admin) + real-time + landing; list bonus items actually completed
3. **Tech stack**
4. **Setup (judges)**
   ```bash
   git clone <repo> && cd unisphere
   cp .env.example .env
   npm run setup      # npm i + prisma db push + seed
   npm run dev        # http://localhost:3000
   ```
5. **Login & OTP**: all roles use email+password then a 6-digit code. For local demo the code is printed in the terminal running `npm run dev` (look for `[OTP] email -> 123456`). Optional SMTP via `.env`.
6. **Test accounts** (seeded; passwords are demo-only)
   | Role | Email | Password |
   |---|---|---|
   | Admin | admin@unisphere.test | Admin@12345 |
   | President | president1@unisphere.test | Pass@12345 |
   | President | president2@unisphere.test | Pass@12345 |
   | Student | student1@unisphere.test … student6@ | Pass@12345 |
7. **Suggested demo path** (the smoke test steps)
8. **Data model** — table list with key fields/relations (+ simple ER diagram in mermaid)
9. **Business-rule notes** — timezone handling, capacity transaction, eventCaps table, OTP rules
10. **Assumptions** — any ambiguous rule and the chosen interpretation
11. **Known limitations** — honest, short (e.g. SSE is single-process in-memory)

No real secrets in repo.

---

## SLIDES (3–4 slides — save as docs/SLIDES.md, then build in Slides/Canva/PPT)

**Slide 1 — The problem**
- Societies run on spreadsheets + WhatsApp; students miss events; admin approves budgets manually with no visibility.
- One line: "Three groups, zero shared system."

**Slide 2 — UniSphere: one platform, three roles**
- Diagram: President <-> Admin <-> Student around a central "UniSphere" box.
- Flow strip: Society -> Event -> Admin approval (event + budget) -> Public link -> Registration -> Volunteers/Tasks -> Expenses.

**Slide 3 — Key functionality & engineering**
- Email OTP 2FA (10 min, 5 tries, 60s cooldown)
- Event state machine (single `eventCaps` source for UI + API)
- Capacity-safe registration (transaction, tested 20 parallel)
- Hard budget cap + live SSE updates
- PKT timezone handling (stored UTC)

**Slide 4 — Live demo + what's next**
- Demo path (4 min script below) + bonus delivered + next steps (email provider, meetings reminders, analytics).

## 4-minute demo script
| Time | Action |
|---|---|
| 0:00–0:20 | Landing page (real upcoming events), one sentence pitch |
| 0:20–0:50 | Student login -> show OTP in terminal -> society browse -> join request |
| 0:50–1:30 | President (2nd window): approve member, create event, submit |
| 1:30–2:00 | Admin: dashboard -> review -> approve event + budget |
| 2:00–2:40 | Logged-out public link -> Register -> login (redirect kept) -> registered; show seats + president count update **live** |
| 2:40–3:20 | President: invite volunteer -> student accepts -> assign task -> Kanban moves live |
| 3:20–3:50 | Expenses: add one; show cap blocking an over-budget one; PDF report (if done) |
| 3:50–4:00 | Close: admin monitoring view |

Prep before demo: reseed DB, open 3 profiles already positioned, terminal visible for OTP, event with 1 seat left ready to show "full".
