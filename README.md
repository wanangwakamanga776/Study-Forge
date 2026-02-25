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
