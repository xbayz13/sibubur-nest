# Troubleshooting Guide

## JWT Authentication Issues

### Issue: Getting 401 Unauthorized Error

If you're getting a 401 error even with valid credentials, check the following:

#### 1. Check Authorization Header Format

Make sure you're sending the Authorization header correctly:

```
Authorization: Bearer <your-jwt-token>
```

**Common mistakes:**
- Missing "Bearer " prefix
- Extra spaces
- Token not included
- Using "Token" instead of "Bearer"

#### 2. Verify Token is Valid

Test your token using the test script:

```bash
npm run test:jwt <your-token>
```

This will show:
- Token contents (decoded)
- Whether token is valid
- Whether roleName is included
- Token expiration status

#### 3. Check Token Has roleName

If you logged in **before** we added the SuperAdmin feature, your token won't have `roleName`. You need to:

1. **Login again** to get a fresh token:
   ```bash
   POST /auth/login
   {
     "username": "superadmin",
     "password": "superadmin123"
   }
   ```

2. **Copy the new token** from the response
3. **Use it in your requests**

#### 4. Verify JWT_SECRET Matches

Make sure the `JWT_SECRET` environment variable is the same:
- When you logged in (token was created)
- When you're making requests (token is verified)

#### 5. Check Token Expiration

Tokens expire after 1 hour by default. If your token is expired:
- You'll get: `Token has expired. Please login again.`
- Solution: Login again to get a new token

### Testing SuperAdmin Access

1. **Login as SuperAdmin:**
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "username": "superadmin",
       "password": "superadmin123"
     }'
   ```

2. **Copy the `access_token` from response**

3. **Test an endpoint:**
   ```bash
   curl -X GET http://localhost:3000/stores \
     -H "Authorization: Bearer <your-access-token>"
   ```

4. **Verify token contents:**
   ```bash
   npm run test:jwt <your-access-token>
   ```

   You should see:
   ```json
   {
     "username": "superadmin",
     "sub": 1,
     "roleId": 1,
     "roleName": "SuperAdmin"
   }
   ```

### Common Error Messages

#### "Authorization header is required"
- **Cause:** No Authorization header in request
- **Solution:** Add `Authorization: Bearer <token>` header

#### "Authorization header must start with 'Bearer '"
- **Cause:** Wrong format (missing "Bearer " prefix)
- **Solution:** Use format: `Authorization: Bearer <token>`

#### "Invalid token: ..."
- **Cause:** Token signature doesn't match JWT_SECRET
- **Solution:** 
  - Check JWT_SECRET is the same everywhere
  - Login again to get a new token

#### "Token has expired"
- **Cause:** Token expired (default: 1 hour)
- **Solution:** Login again to get a new token

#### "Authentication failed"
- **Cause:** General authentication error
- **Solution:**
  1. Verify token is correct
  2. Check token hasn't expired
  3. Verify JWT_SECRET matches
  4. Try logging in again

### Using Swagger UI

1. **Open Swagger:** http://localhost:3000/api
2. **Click "Authorize" button** (top right)
3. **Enter your token:** Just the token, **without** "Bearer " prefix
4. **Click "Authorize"**
5. **Click "Close"**
6. **Try any endpoint** - it should work now

### Using Postman/Insomnia

1. **Go to Authorization tab**
2. **Select Type:** Bearer Token
3. **Enter Token:** Your JWT token (without "Bearer " prefix)
4. **Make request**

### Using curl

```bash
curl -X GET http://localhost:3000/stores \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Debug Mode

To see detailed logs, set:
```bash
NODE_ENV=development
```

This will log:
- Authentication attempts
- User roles
- SuperAdmin bypass notifications

### Still Having Issues?

1. **Check server logs** for detailed error messages
2. **Verify database** has SuperAdmin user:
   ```bash
   npm run view-data
   ```
3. **Re-seed database** if needed:
   ```bash
   npm run seed
   ```
4. **Check environment variables:**
   ```bash
   echo $JWT_SECRET
   ```

