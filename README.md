# SpinShot (Standalone)

This project is a standard **Vite + React** app and can be fully self-hosted.

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Open the URL shown in terminal (typically `http://localhost:5173`).

## Build for production

```bash
npm run build
```

This outputs static files to `dist/`.

## Self-host deployment options

You can deploy `dist/` to any static host:
- Nginx / Apache
- Cloudflare Pages
- Netlify
- Vercel
- S3 + CloudFront

## SPA routing note

Configure your host to rewrite unknown routes to `index.html`.
