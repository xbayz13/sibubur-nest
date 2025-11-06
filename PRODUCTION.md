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

- [ ] Set `NODE_ENV=production`
- [ ] Disable `synchronize` in database config (already done)
- [ ] Set strong `JWT_SECRET` (minimum 32 characters)
- [ ] Configure proper `CORS_ORIGIN`
- [ ] Set up database migrations
- [ ] Configure rate limiting appropriately
- [ ] Set up proper logging (consider using a logging service)
- [ ] Configure environment variables
- [ ] Test all migrations on staging
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy for database
- [ ] Review and adjust rate limits
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx, etc.)
- [ ] Set up process manager (PM2, systemd, etc.)

## Security Best Practices

1. **Never commit `.env` files** - Use environment variables or secrets management
2. **Use strong JWT secrets** - Generate random strings, minimum 32 characters
3. **Enable HTTPS** - Always use SSL/TLS in production
4. **Configure CORS properly** - Don't use `*` in production
5. **Rate limit aggressively** - Especially on auth endpoints
6. **Monitor logs** - Set up log aggregation and monitoring
7. **Regular updates** - Keep dependencies updated
8. **Database backups** - Regular automated backups
9. **Error monitoring** - Use services like Sentry for error tracking

## Deployment Example

```bash
# 1. Set environment variables
export NODE_ENV=production
export DATABASE_URL=postgresql://...
export JWT_SECRET=your-secret-key

# 2. Install dependencies
npm ci --production

# 3. Build the application
npm run build

# 4. Run migrations
npm run migration:run

# 5. Start the application
npm run start:prod
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

