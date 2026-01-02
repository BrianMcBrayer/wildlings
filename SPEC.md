App name: **Wildlings**

This file records clarified product decisions and UX intent based on stakeholder answers. It complements `AGENTS.md` and should be kept in sync when behavior changes.

---

## 1. Product scope

- Single profile only (one global log stream per device).
- Yearly goal is configurable per year; user sets it at the start of the year.
- No categories/tags in MVP.
- No minimum duration threshold.
- No import tooling in MVP.

---

## 2. Timer and logs

- Timer is start/stop only (no pause).
- Stop auto-fills `end_at` as "now"; user can edit later.
- While active, the timer log cannot be edited until stopped.
- Manual log entry requires both start and end times.
- If the user forgot to start a timer, they can create a running timer by entering a manual start time (sets `end_at = null`).

---

## 3. Stats

- Timestamps are stored as UTC instants and projected into the user's local timezone for display.
- Calendar-year totals use the user's local timezone boundaries (Jan 1 to Dec 31).
- Deleted logs are excluded from stats; no trash view.
- Future-friendly: keep raw log data for later daily calendar projections.

---

## 4. Sync behavior

- Conflict resolution is server-authoritative LWW; apply silently (no conflict UI in MVP).
- No specific batch size or page size requirements (choose safe defaults).
- Sync cursor is client-managed; server remains stateless with respect to cursors.

---

## 5. Data retention

- Tombstones may be garbage-collected after a retention period (default: 90 days) once server deletion is confirmed.

---

## 6. UX and navigation

- Visual tone: delightful and calm; avoid whimsical/silly or brutalist aesthetics.
- Recommended MVP routes:
  - Home: timer + today summary + yearly progress
  - Logs: list and edit
  - Settings: yearly goal, device info

---

## 7. Deployment clarifications

- Single-user deployment.
- Device ID is stable per browser install; no reset UI in MVP.
