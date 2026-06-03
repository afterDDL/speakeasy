# SpeakEasy IELTS Speaking Coach

SpeakEasy is an IELTS speaking practice app built for realistic self-practice: students can run Part 1, Part 2, Part 3, or a full speaking mock test, record answers with browser speech recognition, save practice history, and generate structured AI feedback.

This project started as a prototype and has been migrated into a maintainable Vite + React application with a lightweight Cloudflare Pages Function backend for AI scoring.

Live demo: https://speakeasy-evd.pages.dev

Recommended browsers: Chrome or Edge. Speech recognition depends on browser support and network availability; if transcription is unavailable, answers can still be typed manually.

## Highlights

- IELTS Speaking practice modes: Part 1, Part 2, Part 3, and full mock test
- Full mock flow with examiner intro, part transitions, Part 2 prep timer, strict timing, and follow-up questions
- Real question bank imported from user-provided IELTS materials
- Editable question bank UI with search, category filtering, add/edit/delete, JSON import/export, and import template download
- Browser `SpeechRecognition` for real-time transcription, with manual text editing fallback
- Examiner avatar selection with lightweight speaking animation
- Practice history saved locally
- Favorites page for collecting questions, cue cards, AI feedback templates, and retry targets
- Structured report with IELTS-style dimensions: fluency, lexical resource, grammar, and pronunciation
- Canvas-based report image download
- DeepSeek scoring through a backend proxy so the API key is not exposed in the browser

## Tech Stack

- Frontend: Vite, React, CSS
- Icons: lucide-react
- Local storage: browser `localStorage`
- Speech: browser `SpeechRecognition` and `speechSynthesis`
- Backend proxy: Cloudflare Pages Functions
- AI scoring: DeepSeek API

## Architecture

```text
Browser
  |
  | React app
  | - practice flow
  | - speech recognition
  | - local history
  | - question bank editor
  |
  | POST /api/score
  v
Cloudflare Pages Function
  |
  | server-side DEEPSEEK_API_KEY
  v
DeepSeek API
```

The app uses browser speech recognition for immediate transcription. AI scoring is handled through `/api/score`, which is implemented in `functions/api/score.js`.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

Build for production:

```bash
npm run build
```

## AI Scoring Configuration

For production, configure DeepSeek on Cloudflare Pages:

- `DEEPSEEK_API_KEY`: required
- `DEEPSEEK_MODEL`: optional, defaults to `deepseek-chat`

The frontend calls the same-origin endpoint:

```text
/api/score
```

For local testing against a deployed backend, create `.env.local`:

```bash
VITE_API_BASE_URL=https://your-project.pages.dev
```

The settings page also has a "Backend proxy URL" field for temporary testing. The DeepSeek API key field in the app is only a local development fallback and should not be used for public deployment.

## Question Bank

The built-in question bank lives in:

```text
src/data/questionBank.js
```

The in-app question bank manager can:

- search and filter questions
- edit Part 1 questions
- edit Part 2 topic cards
- edit linked Part 3 follow-up questions
- import/export JSON
- download an import template
- restore the built-in question bank

User edits are saved in browser `localStorage`, so the built-in source file remains unchanged.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for a step-by-step GitHub and Cloudflare Pages checklist.

## Current Limitations

- Browser speech recognition can still fail with `network` or `aborted` errors depending on browser and network conditions.
- Pronunciation scoring is currently approximate because browser transcription does not expose phoneme-level pronunciation data.
- Practice history is local to the browser. A multi-device account system is not included in this MVP.
- Commercial ASR can be added later through a `/api/transcribe` backend endpoint.

## Portfolio Notes

This project demonstrates:

- prototype-to-MVP migration
- React stateful application design
- real IELTS speaking flow modeling
- browser speech APIs
- editable structured content management
- serverless backend proxy design
- secure AI API integration
- local-first persistence and exportable user reports

