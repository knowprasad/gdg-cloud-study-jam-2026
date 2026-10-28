# Deployment record

Selected direction: Guild Clubhouse. Public build contains fictional demonstration data only.

## Build and upload

```sh
npm ci
npm run build
npx wrangler@4 pages deploy dist --project-name=gdg-cloud-study-jam-2026 --branch=main
```

Cloudflare login is required for uploads. Source repository and deployed URL will be recorded after verification.

The Pages project uses direct uploads. Changes are published by rebuilding and rerunning the upload command; pushing to GitHub alone does not deploy.
