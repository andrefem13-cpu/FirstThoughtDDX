# FirstThoughDDX
DDX learning tool
First Thought DDx
A local demo of a low-information differential diagnosis whiteboard for clinical reasoning microskills.

Faculty start a session with a synthetic chief complaint. Students submit anonymous DDx responses. The app shows aggregate reasoning patterns: category breadth, can-miss coverage, important misses, and one teaching pearl.

The demo is intentionally browser-only:

no PHI
no student names
no backend
no external model calls
formative use only
Local Development
npm install
npm run dev
Open the local URL Vite prints, usually http://127.0.0.1:5173.

Build
npm run build
The production site is generated in dist/.

Netlify Deploy
This repo includes netlify.toml:

[build]
  command = "npm run build"
  publish = "dist"
Deploy options:

Push this repo to GitHub and connect it in Netlify. Netlify will detect the build settings.
Or deploy directly with the Netlify CLI:
npx netlify deploy --prod --dir=dist
Run npm run build first if deploying with the CLI.
