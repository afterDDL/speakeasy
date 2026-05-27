# Deployment Checklist

This checklist deploys SpeakEasy as a portfolio-ready app using GitHub and Cloudflare Pages.

## 1. Before Uploading To GitHub

Check that these files and folders are included:

- `src/`
- `public/`
- `functions/`
- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `.env.example`
- `.gitignore`
- `README.md`
- `DEPLOYMENT.md`

Do not upload these folders or files:

- `node_modules/`
- `dist/`
- `.tools/`
- `.env.local`
- `*.log`

They are already listed in `.gitignore`.

## 2. Create A GitHub Repository

1. Go to GitHub.
2. Create a new repository, for example:

```text
speakeasy-ielts-coach
```

3. Keep it public if you want it visible in your portfolio.
4. Do not add a README from GitHub, because this project already has one.

## 3. Push The Project

From the project directory:

```bash
git add .
git commit -m "Initial SpeakEasy MVP"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/speakeasy-ielts-coach.git
git push -u origin main
```

Replace `YOUR_NAME` with your GitHub username.

## 4. Create A Cloudflare Pages Project

1. Open Cloudflare Dashboard.
2. Go to Workers & Pages.
3. Create application.
4. Choose Pages.
5. Connect to Git.
6. Select the GitHub repository.

Use these build settings:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

## 5. Configure Environment Variables

In Cloudflare Pages project settings, add:

```text
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
```

`DEEPSEEK_MODEL` is optional. If omitted, the backend uses `deepseek-chat`.

Important: keep `DEEPSEEK_API_KEY` only in Cloudflare environment variables. Do not put it in GitHub.

## 6. Deploy

Trigger a deployment from Cloudflare Pages.

After deployment, Cloudflare gives you a URL like:

```text
https://speakeasy-ielts-coach.pages.dev
```

Open that URL and test:

1. Start a practice session.
2. Finish at least one question.
3. Open the report page.
4. Click the DeepSeek feedback button.
5. Confirm that structured AI feedback appears.

If scoring fails, check:

- Cloudflare environment variable name is exactly `DEEPSEEK_API_KEY`
- The key is valid
- Redeploy after adding environment variables
- Open Cloudflare deployment logs for `/api/score`

## 7. Portfolio Presentation

For a portfolio page or resume, use this short description:

```text
SpeakEasy is an IELTS speaking practice app with realistic mock-test flow, browser speech transcription, editable question bank management, local practice history, downloadable reports, and DeepSeek-powered AI feedback through a Cloudflare serverless proxy.
```

Suggested screenshots:

- Home page with examiner selection
- Full mock test page
- Question bank management page
- Practice report page
- Share image download preview

## 8. Future Upgrade Path

Good next steps after deployment:

- Add `/api/transcribe` for commercial ASR
- Add account login and cloud history sync
- Add analytics for practice frequency and weak areas
- Add a portfolio landing page with product screenshots and architecture diagram

