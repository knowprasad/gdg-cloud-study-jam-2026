# Deployment record

Selected direction: Guild Clubhouse. Public build contains fictional demonstration data only.

## Build and upload

```sh
npm ci
npm run build
npx wrangler@4.45.0 pages deploy dist --project-name=gdg-cloud-study-jam-2026 --branch=main
```

Cloudflare login is required for uploads.

## Published 28 October 2026

- Source: https://github.com/knowprasad/gdg-cloud-study-jam-2026 (private), application source commit `6eabf68`.
- Team preview: https://gdg-cloud-study-jam-2026.pages.dev/
- Immutable deployment: https://554b9291.gdg-cloud-study-jam-2026.pages.dev
- Production branch: main.
- Build: npm run build. 44 static files uploaded successfully.
- Verified the live leaderboard and personal progress in the browser; production locks Clubhouse and labels sample data.

Wrangler4.154 attempted automatic framework conversion during project creation. That process was stopped and its package changes reverted. The tested direct Pages upload uses4.45.0; no runtime framework/plugin dependency was added.

The Pages project uses direct uploads. Changes are published by rebuilding and rerunning the upload command; pushing to GitHub alone does not deploy.
