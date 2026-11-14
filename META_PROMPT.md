# META PROMPT — Task Command Center (iPhone web app)

Paste these into Claude Code **in order**. Prompt 0 carries the context; the others are short because the agent already has it.

**Before you start:** copy the whole `task-commander-iphone` folder to your computer, open a terminal **inside that folder**, run `claude`. Check that the start-up screen shows that folder as the working directory.

---

## PROMPT 0 — Kickoff (paste verbatim)

```
You are the engineer for a small personal app: Task Command Center, an offline task
manager that runs as a home-screen web app on an iPhone, hosted on GitHub Pages.
I am building it for the owner. Explain decisions in plain language.

READ FIRST, IN THIS ORDER, BEFORE WRITING ANY CODE:
1. ./CLAUDE.md — the operating contract and the full spec. It wins over anything else.
2. ./reference/TaskManager.reference.jsx — the existing app as it runs inside Claude today.
   It is the visual and behavioural spec. Its personal data has been removed.
3. ./fixtures/sample-backup.json — dummy data in the backup format. Use only this for testing.

THE GOAL
Re-create the reference app faithfully as a Vite + React PWA, fix only what CLAUDE.md §6
lists, and deploy it to GitHub Pages so the owner can open it in Safari and tap
Share → Add to Home Screen. No App Store, no Expo, no backend, no accounts.

NON-NEGOTIABLES
- No personal data in the repo. The app ships empty; the owner imports a private backup
  on the phone. Never ask for that file.
- Storage key tcc_data_v1, every key prefixed tcc_, never localStorage.clear() — another
  app may share the github.io origin.
- Keep the six tabs, the frozen header and tab bar at the top, the per-tab colour worlds,
  and every behaviour in CLAUDE.md §5. Do not redesign.
- Check current stable versions of Vite, React, vite-plugin-pwa, Vitest and the GitHub
  Pages actions online. Do not trust versions from memory.

START WITH A PLAN ONLY:
1. In 8 lines, tell me the app back in your own words so I know the brief landed.
2. List anything in CLAUDE.md you think is wrong or risky, with a reason.
3. Propose the repo structure, the dependency list (version + one-line reason each),
   the component breakdown (which reference components become which files), and the
   order you will build in.
4. STOP and wait for my approval before creating any files.
```

---

## PROMPT 1 — Build the app locally

```
Approved. Build it in this order and check in with me after each step:

1. Scaffold Vite + React, the data layer (load / save / validate for tcc_data_v1), the
   backup format, splitTasks, the group suggester and quadrant bucketing — as pure
   functions with Vitest tests from CLAUDE.md §7. Show me the test output before any UI.
2. Port the UI from the reference: header + frozen tab bar, Work / Personal / Seva tabs,
   Edit and New Task sheets, WIP with the paste box and AI routing, AI Learning sub-tabs,
   Super Matrix. Keep the reference look; apply the iPhone sizing rules in §6.1.
3. Backup sheet (export, copy, import with preview, replace / add, undo import, nudge,
   welcome card).
4. PWA: manifest, icons, service worker, iOS meta tags, safe areas.

Then run the production build, serve it under the GitHub Pages sub-path, import
fixtures/sample-backup.json and walk every item in CLAUDE.md §5 and §9. Tell me what you
actually verified versus what you assumed.
```

---

## PROMPT 2 — Deploy to GitHub Pages

```
Create the GitHub Actions workflow from CLAUDE.md §8 (test, then build, then deploy to Pages).
Then give me, as a numbered list, exactly what I must click on github.com: create the
repo, push, Settings → Pages → Source: GitHub Actions, and where to find the live URL.

Before the first push, show me `git ls-files` and confirm in writing that no file
contains real tasks, real people's names, banks or amounts.
```

---

## PROMPT 3 — Fix what the owner found on the iPhone

```
The owner tested on the iPhone. Here is the feedback, numbered:
[paste the feedback, plus screenshots if any]

For each item: reproduce it (a mobile Safari viewport is fine), name the root cause in
one line, make the smallest fix, add a test if it is logic, then redeploy. Give me back
a numbered list with the fix for each and the new live URL.
```

---

## RECURRING PROMPTS

**Session start**
```
Read CLAUDE.md and PROGRESS.md, then tell me where we are in 5 lines.
```

**Something is broken**
```
Do not guess. Reproduce it first, explain the root cause in plain language, make the
smallest fix, then add the test that would have caught it. If you cannot reproduce it,
say what you need from me.
```

**A new feature request**
```
The owner wants: [describe]. Check it against CLAUDE.md §1 scope. If it fits, show a
plan and wait. If it needs a server, accounts or sync, put it in BACKLOG.md and tell me why.
```

**Privacy check before any push**
```
List every file that will be pushed. Confirm none contains real task text, people's
names, banks, employers or amounts, and that the default state is empty.
```

**Session close**
```
Update PROGRESS.md (shipped, live URL, open issues, next step) and give me a 5-line
summary I can forward on WhatsApp.
```
