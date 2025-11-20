# Production Readiness Guide

This document outlines the production-ready features implemented in the SiBubur POS Backend API.

## 1. Database Migrations

Instead of using `synchronize: true` (which is dangerous in production), we use TypeORM migrations.

### Migration Commands

```bash
# Generate a new migration from entity changes
npm run migration:generate -- -n MigrationName

# Create an empty migration file
npm run migration:create -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Migration Workflow

1. **Development**: Make changes to entities
2. **Generate Migration**: Run `npm run migration:generate -- -n DescriptiveName`
3. **Review**: Check the generated migration file in `src/migrations/`
4. **Test**: Run migrations locally to test
5. **Commit**: Commit migration files to version control
6. **Production**: Run `npm run migration:run` on deployment

### Important Notes

- **Never** use `synchronize: true` in production
- Always review generated migrations before committing
- Test migrations on a staging environment first
- Keep migration files in version control
- Run migrations as part of your deployment process

## 2. Environment Variable Validation

All environment variables are validated on application startup using Joi schema validation.

### Environment Variables Example

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=production
PORT=3000

# Database (choose one)
# Option 1: PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:port/database

# Option 2: Individual PostgreSQL variables
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=sibubur

# Option 3: SQLite (development only)
DB_TYPE=sqlite
DB_PATH=sibubur.db

# JWT
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=24h

# Rate Limiting (optional)
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# CORS (optional)
CORS_ORIGIN=https://your-frontend-domain.com
```

### Validation Schema

The validation schema is defined in `src/config/env.validation.ts`. The application will fail to start if:
- Required variables are missing
- Variables have invalid values
- Variables don't match expected types

### Error Messages

If validation fails, you'll see clear error messages indicating:
- Which variables are missing
- Which variables have invalid values
- What the expected format is

## 3. Error Handling Improvements

### Global Exception Filter

A global exception filter (`HttpExceptionFilter`) has been implemented to:
- Catch all exceptions (HTTP and non-HTTP)
- Format consistent error responses
- Log errors appropriately
- Hide sensitive information in production
- Include request context (method, URL, timestamp)

### Error Response Format

All errors follow this consistent format:

```json
{
  "statusCode": 400,
  "timestamp": "2025-11-06T10:30:00.000Z",
  "path": "/api/products",
  "method": "POST",
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Logging

- **4xx errors**: Logged at info level (not errors)
- **5xx errors**: Logged at error level with stack traces
- **Development**: Full stack traces included in responses
- **Production**: Stack traces hidden from responses but logged

### Logging Interceptor

All HTTP requests are logged with:
- Request method and URL
- Response status code
- Response time
- Client IP address

## 4. API Rate Limiting

Rate limiting is implemented using `@nestjs/throttler` to protect against:
- DDoS attacks
- Brute force attacks
- API abuse
- Resource exhaustion

### Default Limits

- **TTL**: 60 seconds
- **Limit**: 100 requests per TTL

### Configuration

Configure via environment variables:

```env
THROTTLE_TTL=60      # Time window in seconds
THROTTLE_LIMIT=100   # Max requests per time window
```

### Rate Limit Headers

Responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1636200000
```

### Rate Limit Exceeded Response

When rate limit is exceeded:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

### Customizing Rate Limits

You can customize rate limits per route using the `@Throttle()` decorator:

```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  // More restrictive limits for auth endpoints
}
```

## Production Checklist

Before deploying to production:

### Environment & Configuration
- [ ] Set `NODE_ENV=production`
- [ ] Disable `synchronize` in database config (already done)
- [ ] Set strong `JWT_SECRET` (minimum 32 characters)
- [ ] Configure proper `CORS_ORIGIN` (not `*`)
- [ ] Configure all required environment variables
- [ ] Test all migrations on staging environment

### Database
- [ ] Set up PostgreSQL database (not SQLite)
- [ ] Run database migrations: `npm run migration:run`
- [ ] Seed master data: `npm run seed:production`
- [ ] Create admin user: `npm run create-admin`
- [ ] Configure backup strategy for database
- [ ] Test database connection

### Security
- [ ] Review and adjust rate limits
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Review and test authentication/authorization
- [ ] Ensure all passwords are strong (min 12 characters)

### Infrastructure
- [ ] Set up reverse proxy (nginx, etc.)
- [ ] Set up process manager (PM2, systemd, etc.)
- [ ] Configure log rotation
- [ ] Set up monitoring and alerting
- [ ] Set up error tracking (Sentry, etc.)

### Testing
- [ ] Test all API endpoints
- [ ] Test authentication flow
- [ ] Test authorization (permissions)
- [ ] Test database operations
- [ ] Load testing (if applicable)

### Documentation
- [ ] Document deployment process
- [ ] Document environment variables
- [ ] Document backup/restore procedures
- [ ] Document troubleshooting steps

## Security Best Practices

1. **Never commit `.env` files** - Use environment variables or secrets management
2. **Use strong JWT secrets** - Generate random strings, minimum 32 characters
3. **Use strong passwords** - Minimum 12 characters for all user accounts
4. **Never run development seeder in production** - Use `npm run seed:production` instead
5. **Enable HTTPS** - Always use SSL/TLS in production
6. **Configure CORS properly** - Don't use `*` in production
7. **Rate limit aggressively** - Especially on auth endpoints
8. **Monitor logs** - Set up log aggregation and monitoring
9. **Regular updates** - Keep dependencies updated
10. **Database backups** - Regular automated backups
11. **Error monitoring** - Use services like Sentry for error tracking
12. **Limit SuperAdmin accounts** - Only create when absolutely necessary
13. **Change default passwords** - Never use default passwords in production

## 5. Database Seeding for Production

### ⚠️ IMPORTANT: Seeder Safety

The development seeder (`npm run seed`) is **BLOCKED** in production to prevent accidental data loss. It will exit with an error if run in production environment.

### Production Seeder

Use the production seeder to create essential master data only:

```bash
# This creates roles, permissions, payment methods, and expense categories
# It does NOT delete existing data
# It does NOT create users
npm run seed:production
```

**What it creates:**
- ✅ Roles (SuperAdmin, Owner, Manager, Cashier, Kitchen Staff)
- ✅ Permissions (all 67 permissions)
- ✅ Role-Permission assignments
- ✅ Payment Methods (Cash, QRIS)
- ✅ Expense Categories (Bahan Baku, Operasional, Transportasi, Lain-lain)

**What it does NOT create:**
- ❌ Users (use `npm run create-admin` instead)
- ❌ Stores (create via API/admin panel)
- ❌ Products (create via API/admin panel)
- ❌ Employees (create via API/admin panel)
- ❌ Any dummy/test data

### Creating Admin User

After seeding master data, create the first admin user:

```bash
# Option 1: With environment variable (recommended)
ADMIN_PASSWORD=your-strong-password-here npm run create-admin

# Option 2: Interactive prompt
npm run create-admin
# Will prompt for password (hidden input)
```

**Requirements:**
- Password must be at least 12 characters
- Only one SuperAdmin user can exist
- If SuperAdmin already exists, script will exit with error

**Environment Variables:**
- `ADMIN_PASSWORD` - Password for admin user (required, min 12 chars)
- `ADMIN_USERNAME` - Username (default: 'admin')
- `ADMIN_NAME` - Display name (default: 'Administrator')

### ⚠️ NEVER Run Development Seeder in Production

```bash
# ❌ DO NOT RUN THIS IN PRODUCTION!
npm run seed  # This will DELETE all data and create dummy data!

# ✅ Use this instead for production
npm run seed:production  # Safe for production
```

## 6. Production Deployment Workflow

### Initial Setup (First Time Deployment)

```bash
# 1. Set environment variables
export NODE_ENV=production
export DATABASE_URL=postgresql://user:password@host:port/database
export JWT_SECRET=your-strong-secret-key-min-32-characters
export CORS_ORIGIN=https://your-frontend-domain.com

# 2. Install dependencies
npm ci --production

# 3. Build the application
npm run build

# 4. Run database migrations
npm run migration:run

# 5. Seed master data (roles, permissions, payment methods, expense categories)
npm run seed:production

# 6. Create admin user
ADMIN_PASSWORD=your-strong-password-here npm run create-admin

# 7. Start the application
npm run start:prod
```

### Subsequent Deployments (Updates)

```bash
# 1. Set environment variables (if changed)
export NODE_ENV=production
export DATABASE_URL=postgresql://...
export JWT_SECRET=...

# 2. Pull latest code
git pull origin main

# 3. Install dependencies (if package.json changed)
npm ci --production

# 4. Build the application
npm run build

# 5. Run new migrations (if any)
npm run migration:run

# 6. Restart the application
pm2 restart sibubur-api
# or
systemctl restart sibubur-api
```

### Post-Deployment Setup

After initial deployment, you need to create business data via API or admin panel:

1. **Create Stores** - POST `/stores`
2. **Create Product Categories** - POST `/product-categories`
3. **Create Products** - POST `/products`
4. **Create Product Addons** - POST `/product-addons`
5. **Create Employees** - POST `/employees`
6. **Create Supplies** - POST `/supplies`
7. **Create Additional Users** - POST `/users` (with appropriate roles)

### Deployment Example (Complete)

```bash
# 1. Set environment variables
export NODE_ENV=production
export DATABASE_URL=postgresql://user:password@host:port/database
export JWT_SECRET=your-secret-key-min-32-characters
export JWT_EXPIRES_IN=24h
export CORS_ORIGIN=https://your-frontend-domain.com
export THROTTLE_TTL=60
export THROTTLE_LIMIT=100

# 2. Install dependencies
npm ci --production

# 3. Build the application
npm run build

# 4. Run migrations
npm run migration:run

# 5. Seed master data (first time only)
npm run seed:production

# 6. Create admin user (first time only)
ADMIN_PASSWORD=your-strong-password-here npm run create-admin

# 7. Start the application with PM2
pm2 start dist/main.js --name sibubur-api
pm2 save
pm2 startup

# Or with systemd
# (configure systemd service file first)
systemctl start sibubur-api
systemctl enable sibubur-api
```

## Monitoring

Consider setting up:
- **Application monitoring**: New Relic, Datadog, etc.
- **Error tracking**: Sentry, Rollbar, etc.
- **Log aggregation**: ELK Stack, CloudWatch, etc.
- **Uptime monitoring**: Pingdom, UptimeRobot, etc.
- **Database monitoring**: pgAdmin, DataGrip, etc.

## Troubleshooting

### Migration Issues

If migrations fail:
1. Check database connection
2. Verify migration files are present
3. Check migration status: `npm run migration:show`
4. Review error logs

### Environment Validation Errors

If validation fails:
1. Check `.env` file or environment variables
2. Review error message for missing/invalid variables
3. Refer to `src/config/env.validation.ts` for schema

### Rate Limiting Issues

If legitimate requests are being blocked:
1. Increase `THROTTLE_LIMIT`
2. Increase `THROTTLE_TTL`
3. Use `@Throttle()` decorator for specific routes
4. Consider implementing IP whitelisting

### Seeder Issues

**Error: "Seeder cannot be run in production environment!"**
- This is expected behavior. Development seeder is blocked in production.
- Use `npm run seed:production` instead for production seeding.

**Error: "SuperAdmin user already exists!"**
- Admin user already exists. If you need to reset password, use API or update directly in database.
- To create additional users, use the API endpoint: POST `/users`

**Error: "SuperAdmin role does not exist!"**
- Run `npm run seed:production` first to create roles and permissions.

**Seeder creates duplicate data:**
- Production seeder is idempotent - it only creates data if it doesn't exist.
- If you see duplicates, check database constraints or run seeder again (it will skip existing data).

