# JWT Secret Configuration Fix

## Problem
Tokens were showing "invalid signature" errors because the JWT_SECRET wasn't being loaded consistently.

## Solution
Updated the authentication code to use `ConfigService` instead of `process.env` directly, ensuring the JWT_SECRET is always loaded from the `.env` file correctly.

## Changes Made

### 1. Updated `AuthModule` (`src/auth/auth.module.ts`)
- Changed from `JwtModule.register()` to `JwtModule.registerAsync()`
- Now uses `ConfigService` to get `JWT_SECRET`
- Ensures environment variables are loaded before JWT module initialization

### 2. Updated `JwtStrategy` (`src/auth/jwt.strategy.ts`)
- Now uses `ConfigService` instead of `process.env`
- Ensures consistent JWT_SECRET usage for token verification

## Important: You Must Restart the Server!

**After these changes, you MUST restart your server:**

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run start:dev
```

## Next Steps

1. **Restart the server** (very important!)
2. **Login again** to get a new token:
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "username": "superadmin",
       "password": "superadmin123"
     }'
   ```
3. **Use the new token** - it will work correctly now!

## Verify It's Working

After restarting and logging in, test your token:

```bash
# Test the token
npm run test:jwt <your-new-token>

# Or run the full test
./src/scripts/test-login-flow.sh
```

You should see:
- ✅ Token signature is VALID!
- ✅ Role Name found in token: SuperAdmin
- ✅ SuperAdmin role detected

## Why This Happened

The old code used `process.env.JWT_SECRET` directly, which could load before the `.env` file was read, or use a cached value. Using `ConfigService` ensures:
- Environment variables are loaded first
- The same secret is used for signing and verifying
- Configuration is managed consistently across the app

## Current JWT_SECRET

Your current JWT_SECRET is: `asdasdas`

To change it, edit `.env`:
```env
JWT_SECRET=your-new-secret-here
```

**Remember:** After changing JWT_SECRET, all existing tokens become invalid. Users need to login again.

