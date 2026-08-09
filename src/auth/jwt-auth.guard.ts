import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Skip authentication for public routes
    }

    // Check if Authorization header is present
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('No Authorization header found');
      throw new UnauthorizedException(
        'Authorization header is required. Format: Bearer <token>',
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn('Invalid Authorization header format');
      throw new UnauthorizedException(
        'Authorization header must start with "Bearer "',
      );
    }

    // Try to authenticate
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Check if there's an error or no user (token validation failed)
    if (err || !user) {
      // Check if token is missing or invalid
      if (info) {
        this.logger.error(
          `JWT validation failed: ${info.name} - ${info.message}`,
        );

        if (info.name === 'JsonWebTokenError') {
          throw new UnauthorizedException(`Invalid token: ${info.message}`);
        }
        if (info.name === 'TokenExpiredError') {
          throw new UnauthorizedException(
            'Token has expired. Please login again.',
          );
        }
        if (info.name === 'NotBeforeError') {
          throw new UnauthorizedException('Token not active yet.');
        }
      }

      throw (
        err ||
        new UnauthorizedException(
          'Authentication failed. Please check your token.',
        )
      );
    }

    // Log minimal user info for debugging (never log the full object)
    this.logger.log(
      `[JWT Guard] User received from strategy: id=${user.id} role=${user.roleName ?? '?'}`,
    );

    // Ensure user object has id property - try multiple sources
    if (!user.id) {
      if (user.sub) {
        this.logger.warn(
          `[JWT Guard] User object has 'sub' instead of 'id', converting...`,
        );
        user.id =
          typeof user.sub === 'string'
            ? parseInt(user.sub, 10)
            : Number(user.sub);
      } else if (user.userId) {
        this.logger.warn(
          `[JWT Guard] User object has 'userId' instead of 'id', converting...`,
        );
        user.id =
          typeof user.userId === 'string'
            ? parseInt(user.userId, 10)
            : Number(user.userId);
      }
    }

    // Validate that user.id is now set and is a valid number
    if (!user.id || isNaN(user.id) || user.id <= 0) {
      this.logger.error(
        `[JWT Guard] Invalid user ID after conversion. user id=${user.id}`,
      );
      throw new UnauthorizedException(
        'Invalid user authentication. Please login again.',
      );
    }

    // Ensure id is a number
    user.id = Number(user.id);

    // Log final user info (id/role only, never the full object)
    this.logger.log(
      `[JWT Guard] Final user: id=${user.id} (type: ${typeof user.id}), username=${user.username}, role=${user.roleName || 'N/A'}`,
    );

    // Get request object and explicitly set user
    const request = context.switchToHttp().getRequest();

    // Create a clean user object with guaranteed id property
    const cleanUser = {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.roleName,
    };

    // Set user on request - this is what controllers will access
    request.user = cleanUser;

    this.logger.log(`[JWT Guard] Set req.user: id=${request.user.id}`);

    // Return the clean user object - Passport will also set this on req.user
    // But we've already set it explicitly above to ensure it's there
    return cleanUser as any;
  }
}
