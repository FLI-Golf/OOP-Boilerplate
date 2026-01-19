# Local Development Setup

## Prerequisites

- Node.js 18+ (recommend using nvm)
- A terminal (or two)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/FLI-Golf/OOP-Boilerplate.git
cd OOP-Boilerplate
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Configure PocketBase

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your superadmin credentials:

```
PB_ADMIN_EMAIL=your-email@example.com
PB_ADMIN_PASSWORD=your-secure-password
```

### 4. Start the Backend (Terminal 1)

```bash
cd backend
./start.sh
```

First run downloads PocketBase automatically. The admin dashboard will be at:
- **Admin UI:** http://localhost:8090/_/
- **API:** http://localhost:8090/api/

### 5. Start the Frontend (Terminal 2)

```bash
npm run dev
```

Frontend runs at http://localhost:5173

## Windows Users

If `./start.sh` doesn't work, run these commands manually:

```powershell
cd backend

# Download PocketBase (one time)
# Go to https://github.com/pocketbase/pocketbase/releases
# Download pocketbase_X.X.X_windows_amd64.zip
# Extract pocketbase.exe to the backend folder

# Run PocketBase
.\pocketbase.exe serve --http=0.0.0.0:8090
```

## Verify Everything Works

1. Open http://localhost:8090/_/ - you should see the PocketBase admin login
2. Open http://localhost:5173 - you should see the demo form
3. Log into PocketBase with your `.env` credentials

## Stopping the Servers

- Press `Ctrl+C` in each terminal

## Troubleshooting

**Port already in use:**
```bash
# Find what's using the port
lsof -i :5173  # or :8090
# Kill it
kill -9 <PID>
```

**PocketBase won't start:**
- Check if another instance is running
- Delete `backend/pb_data` to reset (loses all data)

**Node modules issues:**
```bash
rm -rf node_modules package-lock.json
npm install
```
