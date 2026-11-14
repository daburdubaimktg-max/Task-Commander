# Progress

## Shipped (14 Nov 2026)

- Vite + React home-screen web app, re-created from `reference/TaskManager.reference.jsx`.
- All of CLAUDE.md §5 (six tabs, frozen header and tab bar, colour worlds, matrices, edit / new task sheets, AI sub-tabs, white Super Matrix).
- All of CLAUDE.md §6: iPhone shell (safe areas, 44 pt targets, 16 px fields, offline service worker, icons),
  paste box in WIP, WIP → AI sub-tabs, suggested group, Backup sheet (export, copy, import with preview,
  replace / add, undo import, 7-day nudge, welcome card), data fixes (no seed merge, one WIP list, UUID ids, visible save failures).
- 43 unit tests (`npm test`), run by the deploy workflow before every deploy.
- Deploy workflow: `.github/workflows/deploy.yml` (push to `main` → test → build → GitHub Pages).

## Live URL

Not live yet. It will be `https://<github-user>.github.io/<repo-name>/` once the code is on `main`
and **Settings → Pages → Source** is set to **GitHub Actions**.

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

## Next step

Put the code on `main`, switch Pages to GitHub Actions, open the link on the iPhone and run the acceptance test.
