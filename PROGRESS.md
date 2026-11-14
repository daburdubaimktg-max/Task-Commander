# Progress

## Shipped (14 Nov 2026)

- Vite + React home-screen web app, re-created from `reference/TaskManager.reference.jsx`.
- All of CLAUDE.md §5 (six tabs, frozen header and tab bar, colour worlds, matrices, edit / new task sheets, AI sub-tabs, white Super Matrix).
- All of CLAUDE.md §6: iPhone shell (safe areas, 44 pt targets, 16 px fields, offline service worker, icons),
  paste box in WIP, WIP → AI sub-tabs, suggested group, Backup sheet (export, copy, import with preview,
  replace / add, undo import, 7-day nudge, welcome card), data fixes (no seed merge, one WIP list, UUID ids, visible save failures).
- 78 unit tests (`npm test`), run by the deploy workflow before every deploy.
- Deploy workflow: `.github/workflows/deploy.yml` (push to `main` → test → build → GitHub Pages).

## Live URL

`https://<github-user>.github.io/<repo-name>/` — deployed from `main` by `.github/workflows/deploy.yml`.

Setup that was needed once: **Settings → Pages → Source: GitHub Actions**, and `main` allowed under
**Settings → Environments → github-pages → Deployment branches**.

## Verified

- Built site served under a `/<repo-name>/` sub-path and walked in an iPhone 14-sized Chromium window:
  import of `fixtures/sample-backup.json`, every §5 behaviour, paste box, WIP routing, backup round trip,
  offline reload, service-worker scope, storage keys, tap-target / font-size / horizontal-scroll audit on every screen.

## Not verified yet (needs the real iPhone)

- Add to Home Screen, the icon, the notch / Dynamic Island clearance.
- The iOS share sheet for **Export backup** (falls back to download, then to **Copy backup text**).
- Keyboard behaviour inside sheets in the installed app.

## Decisions that differ slightly from CLAUDE.md

- A bare `update …` without a colon is only treated as the command when written in capitals or followed by a
  list, so a task such as "Update the deck" keeps its first word. `UPDATE:` works in any case.
- Inline numbering splits only when the numbers run in sequence (1, 2, 3…), which is what protects
  "Top 5", "V2.5" and "Canto 3 Book 1".
- Super Matrix text uses darker shades of each tab's colour, because the original light shades are hard to read on white.
- **Copy backup text** also counts as a backup for the 7-day nudge.
- Vite `base` is `./`, so the app works under any repo name without a config change.

## Audit (14 Nov 2026) and what it changed

Twenty independent test passes covered: messy pasted lists, the splitter and group suggester, a 101-task
dataset, hostile backup files, unicode round trips, storage failures, a second app on the same origin,
offline and updates, five screen sizes, contrast, edit / WIP / AI flows, matrix correctness, import and undo,
the backup nudge, iOS specifics, two code reviews, privacy and deploy.

Fixed as a result:

- **Unreadable saved data is never overwritten.** The app shows a recovery screen (keep a copy, import a
  backup, or start empty with a confirm) and saves nothing until the user chooses. One damaged task is
  skipped on load instead of hiding the whole list.
- **Undo import** is withdrawn as soon as anything is edited after the import.
- **Add to existing** keeps your tab names when the file has none, never duplicates on a repeat, adds
  (rather than drops) a different task that reuses an id, and reports "N added, M skipped".
- **Paste box:** ordinary sentences with "1. … 2. …" are no longer split; numbers inside a numbered item,
  semicolons, empty items and dash bullets are handled; `UPDATE THE REPORT` keeps its first word.
- **Group suggestion** matches whole words only. A group typed in other capitals joins the existing group.
  A group typed on a WIP card is kept across tab switches and reloads.
- **Double taps** can no longer confirm a delete, send the next WIP card, or close a sheet just opened.
- **Readability:** dark text on the bright buttons (the white text measured under 3:1), stronger badge and
  Super Matrix colours, long unbroken group and tab names wrap.
- **Older iPhones (iOS 16.0–16.1):** the visual polish is applied only where the browser supports it.
- The backup nudge refreshes when the app returns to the front; a failed save is retried then too.

Left as is, on purpose: a half-typed AI task follows you between sub-tabs (same as the reference, and the
button names the destination); the "groups" figure in the import preview counts groups per tab.

## Quick add (14 Nov 2026)

A "+" button in the header opens a capture sheet from any tab with the text box already focused, so the
keyboard — typing or a dictation keyboard such as Wispr Flow — comes up in one tap. Items go to WIP. The
draft is shared with the WIP paste box, so closing the sheet never loses dictated text.

## Colour scheme and Claude buttons (14 Nov 2026)

- The owner found the per-tab dark colour worlds hard to work in. Replaced by one neutral scheme, light or
  dark, following the phone (Auto / Light / Dark under the gear). Tab colours remain as accents only. All
  visible text measured at 4.5:1 or better in both modes on six screens.
- Gear sheet: "Copy tasks for Claude" and "Copy instructions for the Claude project". Copy-and-paste only;
  the app still sends nothing anywhere.

## Voice section (14 Nov 2026)

The header "+" became a mic button. It opens a Voice sheet from any tab: dictate or type, see a preview of
what the app understood, tick or untick rows, then Apply. It can add tasks (to WIP, or straight to a tab
with priority), mark done, set or clear urgent / important, move between tabs, and delete (needs a tick to
confirm). 11 unit tests cover the interpreter; the sheet was driven end to end in light and dark.
Not verified on a real iPhone: the built-in mic button, and Wispr Flow inside the installed app.

## Next step

Put the code on `main`, switch Pages to GitHub Actions, open the link on the iPhone and run the acceptance test.
