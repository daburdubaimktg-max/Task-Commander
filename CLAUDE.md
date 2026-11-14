# CLAUDE.md — Task Command Center (iPhone web app)

Read this whole file at the start of every session. It is the operating contract for this repo.

---

## 1. What we are building

A **personal, offline task manager** that runs as a **home-screen web app on iPhone**.

- Hosted on **GitHub Pages**. The owner opens the URL in Safari, taps **Share → Add to Home Screen**, and from then on it opens full screen like an app. No App Store, no Xcode, no Expo, no backend.
- It is a faithful re-creation of an existing React prototype that runs inside Claude today: `reference/TaskManager.reference.jsx`. That file is the **visual and behavioural spec**. Its personal data has been removed.
- One user, one phone. All data lives on the phone. Backup is a JSON file the user exports and keeps.

**Not in scope:** accounts, sync, a server, analytics, notifications, an App Store build. If an idea needs any of these, write it in `BACKLOG.md` and do not build it.

> There may be older files about an Expo / App Store version of this product (`TASK_COMMANDER_HANDOVER.md`). That is a different, later project. Ignore it here.

---

## 2. Stack

| Concern | Choice |
|---|---|
| Build | **Vite + React** (JavaScript is fine; TypeScript optional). Check current stable versions on the day — do not trust versions from memory. |
| Icons | `lucide-react` (same icons as the reference) |
| Offline + install | `vite-plugin-pwa` (generateSW, `registerType: "autoUpdate"`) |
| Tests | **Vitest** for pure logic |
| Hosting | **GitHub Pages**, deployed by a **GitHub Actions** workflow on every push to `main` |
| Storage | `localStorage` only |

No other runtime dependencies without a one-line reason in the PR.

---

## 3. Hard rules

1. **No personal data in the repo, ever.** No real tasks, no real names of people, banks, employers, family, amounts. The app ships **empty**. The owner loads their tasks on the phone from a private backup file that never touches GitHub. Test only with `fixtures/sample-backup.json`.
2. **The storage key is permanent:** `tcc_data_v1`. Never rename it to "migrate". Schema changes go inside the stored object (`schemaVersion`) with a tested upgrade function.
3. **Prefix every storage key with `tcc_`.** Other apps (for example an earlier app called EyesandEars) may live on the same `*.github.io` origin and share `localStorage`. Never read, write or clear keys you do not own. Never call `localStorage.clear()`.
4. **Service worker scope is this repo's path only** (e.g. `/task-command-center/`), never the domain root.
5. **No silent failures.** If a save throws, show a persistent red banner: "Not saved — export a backup now". The "✓ Saved" badge appears only after a confirmed write.
6. **Preserve the reference UX.** Do not redesign. Fix only what §6 lists. Propose anything else first.
7. **Plan before building.** For anything beyond a one-file change, show the plan and wait for approval.
8. **Prove it.** Paste real test output. Never say "done" from inference.

---

## 4. Data model

The stored value and the backup file use **the same shape**:

```json
{
  "format": "task-command-center/v1",
  "schemaVersion": 1,
  "exportedAt": "2026-11-13T10:00:00.000Z",
  "labels": {
    "work": "Work", "personal": "Personal", "seva": "Seva", "ai": "AI Learning",
    "ai1": "AI 1", "ai2": "AI 2", "ai3": "AI 3", "ai4": "AI 4"
  },
  "meta": { "lastBackupAt": null },
  "data": {
    "work":     [ { "id": "…", "group": "Finance", "task": "…", "completed": false, "urgent": true, "important": true } ],
    "personal": [ … same task shape … ],
    "seva":     [ … same task shape … ],
    "wip":      [ { "id": "…", "task": "…", "domain": null, "urgent": false, "important": false } ],
    "ai": {
      "ai1": [ { "id": "…", "task": "…", "completed": false, "urgent": false, "important": true } ],
      "ai2": [], "ai3": [], "ai4": []
    }
  }
}
```

- **AI sub-tabs use neutral keys `ai1`–`ai4`.** Their display names come from `labels` in the user's backup. The defaults in code stay neutral ("AI 1"…"AI 4"). Never hard-code a real sub-tab name in the code.
- Sub-tab colours are fixed by position: `ai1` pink `#f472b6`, `ai2` emerald `#34d399`, `ai3` violet `#a78bfa`, `ai4` orange `#fb923c`.
- **Ids:** `crypto.randomUUID()` for anything new. Keep imported ids as they are.
- **Quadrant is computed, never stored:** Do First = urgent + important · Schedule = important only · Delegate = urgent only · Eliminate = neither. Completed tasks never appear in any matrix.
- Default state (first launch) = all arrays empty, neutral labels, `lastBackupAt: null`.

---

## 5. Behaviour to preserve from the reference (do not change)

- **Six tabs, in this order:** WIP · Work · Personal · Seva · AI Learning · Super Matrix. App opens on **Work**. WIP shows a badge with its count.
- **The header and tab bar stay frozen at the top while content scrolls.** The owner asked for this specifically. Do not move tabs to the bottom.
- Each tab keeps its own background world: Work dark blue `#060e1f`, Personal dark green `#050f08`, Seva dark orange `#150800`, WIP dark violet `#0d0b18`, AI Learning near-black with per-sub-tab colours, **Super Matrix white**.
- Header: title, global progress (done / total across Work + Personal + Seva), "✓ Saved" badge.
- **Domain tabs (Work / Personal / Seva):** title, "x of y done", progress bar, **+ New Task** button → Eisenhower 2×2 of incomplete tasks (collapsible cells with counts) → "All Tasks" grouped by `group`, each group showing done/total.
- **Task row:** complete checkbox (done = strike-through, dimmed, removed from matrices but kept in the list), Urgent toggle (red), Important toggle (amber), Edit.
- **Edit sheet:** rewrite text, move between Work / Personal / Seva, toggle Urgent / Important, Save, Cancel, Delete with a confirm step.
- **New Task sheet:** text, group, Urgent, Important → appears immediately in the list, the tab's matrix and the Super Matrix.
- **WIP:** each item card → Step 1 domain, Step 2 priority, then "Send to …" (item leaves WIP instantly and lands in the list and matrices) or Discard.
- **AI Learning:** four sub-tabs, each with its own colour, its own matrix, an inline "Add new task" form, and a task list with complete / urgent / important / edit (text, priority, delete).
- **Super Matrix:** white background, every incomplete task from all tabs and all AI sub-tabs in one 2×2. Text colour = the colour of the task's source tab. AI tasks are prefixed `AI-<SUB-TAB LABEL> · `. Colour legend at the top.

---

## 6. What changes for iPhone (the actual work)

### 6.1 Installable, offline, iPhone-native feel
- `index.html`: `viewport` with `width=device-width, initial-scale=1, viewport-fit=cover`; `apple-mobile-web-app-capable` and `mobile-web-app-capable` = yes; `apple-mobile-web-app-status-bar-style` = `black-translucent`; `apple-mobile-web-app-title` = "Tasks"; `theme-color`.
- `apple-touch-icon` 180×180 PNG with **no transparency**; manifest icons 192 and 512 (plus a maskable). Simple mark: a 2×2 grid of four coloured squares on near-black. Generate the PNGs in the repo.
- Manifest: `display: standalone`, `start_url: "./"`, `scope: "./"`, short name "Tasks".
- Vite `base` set correctly for a GitHub Pages **project** site (relative `./` or `/<repo-name>/`). Test the built site under that sub-path, not only at `localhost:5173/`.
- Service worker precaches the app shell, so it opens with no signal. A new deploy takes effect on the next launch.
- Layout: `height: 100dvh` (not `100vh`); pad the header with `env(safe-area-inset-top)` and the bottom of scroll areas with `env(safe-area-inset-bottom)`.
- **Touch targets ≥ 44×44 pt** for every checkbox, toggle, edit button, tab and chip. The reference uses 17–24 px; that is too small for a thumb. Keep the look, enlarge the hit area.
- **Text inputs and textareas at 16 px or more.** Below 16 px, iOS zooms the page when you tap into a field.
- Readable text: body ≥ 14 px, nothing below 12 px. Lift the reference's darkest greys (`#333`–`#555` on near-black) to clearly readable values.
- `touch-action: manipulation` on buttons (no double-tap zoom). No hover-only affordances.
- Sheets/modals: scroll when the keyboard is up, close on backdrop tap, never trap the user.
- Six tabs will not fit across a 390 pt screen: keep the bar horizontally scrollable and make sure the active tab scrolls into view.

### 6.2 Paste box replaces the UPDATE command
The reference polled `window.__taskUpdate` every 500 ms so Claude could inject tasks from chat. That cannot work on a phone. **Remove the polling entirely.**

Add at the top of WIP: a textarea "Paste or type tasks — one per line, or a numbered list" and an **Add to WIP** button. A pure function `splitTasks(text)`:
- strips a leading `UPDATE`, `UPDATE:` or `UPDATE :` (any case);
- splits on new lines, on `;`, and on inline numbering like `1. … 2. …` or `1) … , 2) …` (a 1–2 digit number followed by `.` or `)` and a space, at the start or after a space or comma);
- strips bullets (`-`, `•`, `*`) and numbering, trims, removes trailing commas, drops empty items;
- does **not** split on commas inside a task, and does not break times or codes such as `2:30 PM`, `V2.5`, `Q1 4mn`, `Canto 3 Book 1`, `Top 5`.

Required test cases (add more):
```
"UPDATE: 1. Call the bank 2. Book physio 3. Send the deck"           → 3 items
"UPDATE : 1. Replace the card , 2. Check the phone bill"            → 2 items, no trailing commas
"- Pay fees\n• Renew licence\n\n  \n* Buy milk"                     → 3 items
"Pay fees; Renew licence"                                             → 2 items
"Physio at 2:30 PM"                                                   → 1 item, unchanged
"Culture session V2.5 plan remaining section"                         → 1 item, unchanged
"Review agency plan, budget and timeline"                             → 1 item (commas kept)
```

### 6.3 WIP routing gaps (two small additions)
1. **WIP can send to AI sub-tabs.** Step 1 shows Work / Personal / Seva, then a second row with the four AI sub-tab labels. Today the owner has to retype AI tasks by hand.
2. **Suggested group.** After a domain is picked, show a group picker pre-filled with a suggestion: an existing group of that domain whose name appears in the task text, else a small keyword map (bank, transfer, pay, invoice → Finance; buy, shop → Shopping; doctor, physio, claim → Health; call, meet, review → leave as Inbox), else "Inbox". The user can change it or type a new group. Also add the group picker to the Edit sheet. Unit-test the suggester.

### 6.4 Backup and restore (essential — this is the only safety net)
Data lives only on the phone. Deleting the home-screen icon or clearing Safari website data erases it. Note too that **Safari and the home-screen app keep separate storage**: tasks added in a Safari tab do not appear in the installed app.

Add a gear icon in the header, top right, opening a **Backup** sheet:
- **Export backup**: builds the §4 JSON and names it `task-command-center-YYYY-MM-DD.json`. Use `navigator.share({ files })` when `navigator.canShare` allows files (best on iPhone: Save to Files, AirDrop, mail), else fall back to a download link. Sets `meta.lastBackupAt`.
- **Copy backup text**: the same JSON to the clipboard (the most reliable fallback inside a home-screen app).
- **Import backup**: a file picker (`accept=".json,application/json"`) **and** a "Paste backup text" box. Validate `format === "task-command-center/v1"` and the array shapes. Show a preview ("Work 23 · Personal 20 · Seva 10 · AI 39 · WIP 9 — groups 28"), then **Replace everything** (default) or **Add to existing** (skip tasks whose id already exists). Apply `labels` from the file. Reject anything else with a plain message.
- Before Replace, save the current state to `tcc_data_v1_prev` and offer **Undo import** until the app is closed.
- Call `navigator.storage?.persist?.()` once after the first successful import (harmless where unsupported).
- **Backup nudge:** if there are tasks and `lastBackupAt` is empty or older than 7 days, show a thin amber bar under the header: "Last backup 9 days ago · Back up now". Dismissable for 24 hours.
- **First launch** (no stored data): a welcome card on Work: "Import your backup" (opens the sheet) or "Start empty".

### 6.5 Data correctness fixes the reference needs
- Load = read `tcc_data_v1`, validate, fill missing arrays with empties. **No merging with a seed** (the reference's seed-merge made deleted tasks come back).
- One source of truth for WIP (the reference kept two copies).
- New ids via `crypto.randomUUID()` (the reference used `Date.now()`, which collides).
- Save failures are visible (§3 rule 5). The "✓ Saved" flash appears only after a real write.

---

## 7. Tests (Vitest, must pass in CI)
- `splitTasks` — every case in §6.2 plus your own.
- Group suggester.
- Quadrant bucketing, including "completed tasks never appear".
- Export → import round trip reproduces the same counts, groups and labels, using `fixtures/sample-backup.json`.
- Import rejects a wrong `format` and malformed arrays with a readable error.
- **Privacy guard:** the default state has zero tasks and only neutral labels; no file under `src/` contains a non-empty seed array.

---

## 8. Deploy
- `.github/workflows/deploy.yml`: on push to `main` → install → **test** → build → upload the `dist` folder → deploy to GitHub Pages (official Pages actions; check their current major versions).
- Repo **Settings → Pages → Source: GitHub Actions**.
- A failing test blocks the deploy.
- URL: `https://<github-user>.github.io/<repo-name>/`.

---

## 9. Definition of done
- [ ] Every item in §5 works on an iPhone, launched from the home-screen icon.
- [ ] Every item in §6 implemented, and the §7 tests pass in CI.
- [ ] Opens with Wi-Fi and mobile data both off.
- [ ] Import of `fixtures/sample-backup.json` shows the right counts; export, delete app, re-add, import restores everything.
- [ ] No horizontal page scroll, no zoom when typing, no tap target under 44 pt, the header clears the notch / Dynamic Island.
- [ ] Repo contains no personal data (§3 rule 1). The private backup file was never in the repo.
- [ ] `PROGRESS.md` updated: what shipped, the live URL, known issues.

---

## 10. Working style
- Small commits, plain messages. One concern per commit.
- After each milestone, give a 5-line summary the owner can read on a phone.
- If something conflicts with this file, stop and ask.
- If the owner corrects you on something this file should have said, add it here.
