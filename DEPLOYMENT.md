# Cloudflare Deployment Guide

## Prerequisites

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

## Setup D1 Database

1. Create a new D1 database (or use existing one):
   ```bash
   wrangler d1 create forum-db
   ```

2. Copy the `database_id` from the output

3. Update `artifacts/api-server/wrangler.json` with your actual `database_id`:
   ```json
   {
     "d1_databases": [
       {
         "binding": "DB",
         "database_name": "forum-db",
         "database_id": "YOUR_ACTUAL_DATABASE_ID_HERE",
         "migrations_dir": "migrations"
       }
     ]
   }
   ```

4. Apply migrations to your Cloudflare D1 database:
   ```bash
   cd artifacts/api-server
   wrangler d1 migrations apply forum-db --remote
   ```

## Deploy

1. Build the project (from root):
   ```bash
   pnpm run build
   ```

2. Deploy the API server (includes frontend assets):
   ```bash
   cd artifacts/api-server
   wrangler deploy
   ```

   Or using the package script:
   ```bash
   pnpm --filter @workspace/api-server run deploy
   ```

## Post-Deployment

- Your forum will be available at the URL shown in the Wrangler output
- Sessions use httpOnly cookies, so ensure your domain is configured properly
- The frontend assets are served via Cloudflare Assets binding

## Troubleshooting

### Common Issues

1. **"No such module" errors**: Ensure `compatibility_flags` includes `nodejs_compat` in `wrangler.json`

2. **D1 binding issues**: Verify `database_id` matches your actual D1 database ID

3. **Assets not found**: Run `pnpm run build` from the root before deploying

4. **Authentication not working**: Check that cookies are being set correctly for your domain

### Local Testing

Test locally before deploying:
```bash
cd artifacts/api-server
wrangler dev
```

This will start the dev server with local D1 emulation on port 8787.
