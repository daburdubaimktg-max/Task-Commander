# Task Command Center

A personal, offline task manager that runs as a home-screen web app on iPhone. It is hosted on GitHub Pages and
installed with Safari → Share → Add to Home Screen. All data stays on the phone; the app ships empty.

- `CLAUDE.md` — the spec and rules for this repo. Read it first.
- `PROGRESS.md` — what is shipped, what is verified, what is next.
- `reference/` — the original prototype (look and behaviour spec, no data).
- `fixtures/sample-backup.json` — dummy data for testing. Never commit real tasks.

```bash
npm install
npm test        # unit tests
npm run dev     # local development
npm run build   # production build in dist/
```
