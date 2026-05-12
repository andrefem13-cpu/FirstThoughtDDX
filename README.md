# First Thought DDx

A local demo of a low-information differential diagnosis whiteboard for clinical reasoning microskills.

Faculty start a session with a synthetic chief complaint. Students submit anonymous DDx responses. The app shows aggregate reasoning patterns: category breadth, can-miss coverage, important misses, and one teaching pearl.

The demo now scales the amount of case information by learner level:

- M1: chief complaint only
- M2: chief complaint plus basic patient demographics
- M3: demographics, symptom details, and medical history
- M4: fuller case frame with medications and risk factors

The intent is formative practice, not grading: repeated short reps that help learners reason early, tolerate uncertainty, and separate most likely from most dangerous.

The demo is intentionally browser-only:

- no PHI
- no student names
- no backend
- no external model calls
- formative use only

## Local Development

```bash
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://127.0.0.1:5173`.

## Build

```bash
npm run build
```

The production site is generated in `dist/`.

## Netlify Deploy

This repo includes `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

Deploy options:

1. Push this repo to GitHub and connect it in Netlify. Netlify will detect the build settings.
2. Or deploy directly with the Netlify CLI:

```bash
npx netlify deploy --prod --dir=dist
```

Run `npm run build` first if deploying with the CLI.
