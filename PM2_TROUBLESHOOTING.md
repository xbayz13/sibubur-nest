# PM2 Troubleshooting Guide

## Problem: Process `sibubur-api` not found

If you see the error:
```
[PM2][ERROR] Process or Namespace sibubur-api not found
```

This means the PM2 process is not running or doesn't exist.

## Quick Fix

### Step 1: Check what processes are running

```bash
pm2 list
```

This will show all PM2 processes. Look for:
- The process name (should be `sibubur-api`)
- The status (online, stopped, errored, etc.)
- The process ID

### Step 2: Check if the process exists with a different name

```bash
pm2 list
pm2 status
```

### Step 3: Start the process if it doesn't exist

**Option A: Using ecosystem.config.js (Recommended)**

```bash
cd /root/sibubur-nest/backend  # or wherever your backend is located
pm2 start ecosystem.config.js
pm2 save
```

**Option B: Using direct command**

```bash
cd /root/sibubur-nest/backend
pm2 start dist/main.js --name sibubur-api
pm2 save
```

### Step 4: Verify it's running

```bash
pm2 status
pm2 logs sibubur-api --lines 50
```

## Complete Setup from Scratch

If the process doesn't exist, follow these steps:

### 1. Navigate to backend directory

```bash
cd /root/sibubur-nest/backend
# or wherever your backend code is located
```

### 2. Ensure the application is built

```bash
npm run build
```

This should create the `dist/` directory with `dist/main.js`.

### 3. Check if dist/main.js exists

```bash
ls -la dist/main.js
```

If it doesn't exist, run `npm run build` first.

### 4. Start with PM2 using ecosystem config

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to set up auto-start
```

### 5. Verify

```bash
pm2 list
pm2 logs sibubur-api
```

## Common Commands

### Check Process Status

```bash
pm2 list              # List all processes
pm2 status            # Same as list
pm2 show sibubur-api  # Detailed info about the process
```

### Start/Stop/Restart

```bash
pm2 start sibubur-api      # Start if stopped
pm2 stop sibubur-api       # Stop the process
pm2 restart sibubur-api    # Restart the process
pm2 reload sibubur-api     # Zero-downtime reload
pm2 delete sibubur-api     # Delete from PM2 (stops it)
```

### View Logs

```bash
pm2 logs sibubur-api              # Follow logs
pm2 logs sibubur-api --lines 100  # Last 100 lines
pm2 logs sibubur-api --err        # Only errors
```

### Update Environment Variables

```bash
# Method 1: Edit ecosystem.config.js, then:
pm2 restart ecosystem.config.js --update-env

# Method 2: Restart with new env
pm2 restart sibubur-api --update-env
```

## Troubleshooting Specific Issues

### Issue: Process keeps restarting

Check logs for errors:
```bash
pm2 logs sibubur-api --err
```

Common causes:
- Application crashes on startup
- Database connection issues
- Missing environment variables
- Port already in use

### Issue: Port already in use

Check if port 3000 is in use:
```bash
lsof -i :3000
# or
netstat -tulpn | grep 3000
```

Kill the process or change PORT in environment variables.

### Issue: Environment variables not loaded

Ensure `.env` file exists or environment variables are set:
```bash
# Check environment
echo $NODE_ENV
echo $DATABASE_URL
echo $JWT_SECRET
```

Set them before starting PM2:
```bash
export NODE_ENV=production
export DATABASE_URL=...
pm2 restart ecosystem.config.js --update-env
```

Or edit `ecosystem.config.js` to include env variables.

### Issue: Cannot find dist/main.js

Build the application first:
```bash
npm run build
```

Check if dist directory exists:
```bash
ls -la dist/
```

### Issue: Process shows as "errored"

```bash
pm2 logs sibubur-api --err --lines 100
```

Check for:
- Database connection errors
- Missing environment variables
- Port conflicts
- Missing dependencies

## Deployment Workflow

### Initial Deployment

```bash
cd /root/sibubur-nest/backend

# 1. Pull latest code
git pull

# 2. Install dependencies
npm ci --production

# 3. Build
npm run build

# 4. Run migrations (if any)
npm run migration:run

# 5. Start with PM2
pm2 start ecosystem.config.js

# 6. Save PM2 configuration
pm2 save

# 7. Setup auto-start (first time only)
pm2 startup
# Follow the displayed instructions
```

### Update Deployment

```bash
cd /root/sibubur-nest/backend

# 1. Pull latest code
git pull

# 2. Install dependencies (if package.json changed)
npm ci --production

# 3. Build
npm run build

# 4. Run migrations (if any)
npm run migration:run

# 5. Restart PM2
pm2 restart sibubur-api

# Or reload for zero-downtime
pm2 reload sibubur-api
```

## Verify Backend is Running

### Check if API is responding

```bash
curl http://localhost:3000/health
# or
curl http://72.61.208.109:3000/health
```

### Check Swagger documentation

Open in browser:
```
http://72.61.208.109:3000/api
```

## Need More Help?

1. Check PM2 logs: `pm2 logs sibubur-api`
2. Check application logs in `backend/logs/`
3. Check system logs: `journalctl -u pm2-root` (if using systemd)
4. Verify environment variables are set correctly
5. Verify database connection is working

