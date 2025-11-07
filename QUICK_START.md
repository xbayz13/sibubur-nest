# Quick Start Guide - SuperAdmin Access

## Problem: Invalid Token Signature

If you're getting "invalid signature" error, it means your token was created with a different `JWT_SECRET`. This is **normal** and easy to fix!

## Solution: Get a New Token

### Option 1: Using curl

```bash
# 1. Login and get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "superadmin123"
  }'

# 2. Copy the access_token from the response

# 3. Test the token
npm run test:jwt <your-new-token>

# 4. Use it in requests
curl -X GET http://localhost:3000/stores \
  -H "Authorization: Bearer <your-new-token>"
```

### Option 2: Using Swagger UI

1. **Start the server:**
   ```bash
   npm run start:dev
   ```

2. **Open Swagger:** http://localhost:3000/api

3. **Login:**
   - Find `POST /auth/login`
   - Click "Try it out"
   - Enter:
     ```json
     {
       "username": "superadmin",
       "password": "superadmin123"
     }
     ```
   - Click "Execute"
   - Copy the `access_token` from response

4. **Authorize:**
   - Click "Authorize" button (top right)
   - Paste your token (without "Bearer " prefix)
   - Click "Authorize"
   - Click "Close"

5. **Test any endpoint** - SuperAdmin bypasses all authorization!

### Option 3: Using the Login Script

```bash
# Make sure server is running first
npm run start:dev

# In another terminal, run:
./src/scripts/login-test.sh
```

## Verify Your Token

After getting a new token, verify it:

```bash
npm run test:jwt <your-token>
```

You should see:
- ✅ Token signature is VALID!
- ✅ Role Name found in token: SuperAdmin
- ✅ SuperAdmin role detected - should bypass all authorization!

## Important Notes

1. **Token Expiration:** Tokens expire after 1 hour. If you get "Token expired", just login again.

2. **JWT_SECRET:** Make sure your `.env` file has the same `JWT_SECRET` when:
   - Creating tokens (login)
   - Verifying tokens (making requests)

3. **Authorization Header:** Always use this format:
   ```
   Authorization: Bearer <your-token>
   ```
   Note the space after "Bearer"!

## Testing SuperAdmin Access

Once you have a valid token:

```bash
# Test any endpoint - SuperAdmin has full access!
curl -X GET http://localhost:3000/stores \
  -H "Authorization: Bearer <your-token>"

curl -X GET http://localhost:3000/products \
  -H "Authorization: Bearer <your-token>"

curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer <your-token>"
```

All requests should work without permission errors! 🎉

## Troubleshooting

### "Invalid signature" error
- **Cause:** Token was created with different JWT_SECRET
- **Solution:** Login again to get a new token

### "Token expired" error
- **Cause:** Token expired (default: 1 hour)
- **Solution:** Login again to get a new token

### "Authorization header is required" error
- **Cause:** Missing Authorization header
- **Solution:** Add `Authorization: Bearer <token>` header

### Still having issues?
See `TROUBLESHOOTING.md` for more help!

