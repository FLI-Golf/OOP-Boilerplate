# Backend - PocketBase

## Local Development

Run the setup script to download and start PocketBase:

```bash
./start.sh
```

This will:
1. Download PocketBase (if not present)
2. Start the server on http://localhost:8090
3. Admin UI available at http://localhost:8090/_/

## Directory Structure

```
backend/
├── pb_data/          # PocketBase data (gitignored)
├── pb_migrations/    # Schema migrations (committed)
├── pb_hooks/         # Custom hooks (optional)
├── start.sh          # Local dev script
├── Dockerfile        # Railway deployment
└── railway.toml      # Railway config
```

## Railway Deployment

1. Connect your repo to Railway
2. Set the root directory to `backend`
3. Railway will use the Dockerfile automatically

Environment variables (set in Railway):
- `PB_ENCRYPTION_KEY` - Optional encryption key for settings
