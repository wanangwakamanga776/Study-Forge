# Focus Forge Deployment Guide

This project is optimized for deployment on various static hosting platforms.

## Environment Variables

Regardless of the platform, you **must** set the following environment variable:

- `GEMINI_API_KEY`: Your Google Gemini API Key.

## Deployment Platforms

### 1. Netlify (Recommended)
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- The project includes `netlify.toml` and `_redirects` for automatic configuration.

### 2. Cloudflare Pages
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- The project includes `_redirects` in the `public` folder which Cloudflare will use for SPA routing.

### 3. Vercel
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- The project includes `vercel.json` for routing.

### 4. GitHub Pages
- If deploying to a sub-path (e.g., `username.github.io/repo-name/`), you must update the `base` property in `vite.config.ts`.
- For SPA routing on GitHub Pages, you may need to use a `404.html` fallback or switch to `HashRouter`.

## Local Development
1. Clone the repository.
2. Run `npm install`.
3. Create a `.env` file and add `GEMINI_API_KEY=your_key_here`.
4. Run `npm run dev`.

## Building your Android APK on GitHub (Zero local space needed!)

We have preconfigured a fully automated **GitHub Actions build workflow** in `.github/workflows/build-apk.yml`. Since you do not have enough disk space locally, you can use GitHub's cloud servers to compile your watermark-free and ad-free APK for free!

### Step 1: Export Project to GitHub
1. In the Google AI Studio top-right settings/export menu, choose **Export to GitHub** (or connect your GitHub account).
2. Create a new repository name (e.g., `study-forge-app`) and export the codebase.

### Step 2: Trigger the Build Workflow
Once exported, GitHub will automatically see the workflow and start compiling!
1. Go to your new repository page on GitHub.
2. Click on the **Actions** tab at the top.
3. If the run hasn't started automatically, select the **Build Android APK** workflow on the left and click **Run workflow**.

### Step 3: Download your APK
1. Wait about 3-5 minutes for the build to finish (all steps turn green).
2. Click on the completed workflow run.
3. Scroll down to the **Artifacts** section at the bottom.
4. Click on `study-forge-debug-apk` to download the zip file containing your direct installable, watermark-free **Android APK**!

