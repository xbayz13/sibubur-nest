import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity'; // Or fetch from DB if needed

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.getOrThrow<string>('JWT_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: {
    sub: string | number;
    username: string;
    roleId: number;
    roleName?: string;
    storeId?: number | null;
  }): Promise<User & { roleName?: string; storeId?: number | null }> {
    // Ensure id is always a number
    const userId =
      typeof payload.sub === 'string'
        ? parseInt(payload.sub, 10)
        : Number(payload.sub);

    if (isNaN(userId) || userId <= 0) {
      throw new Error(`Invalid user ID in JWT payload: ${payload.sub}`);
    }

    const user: User & { roleName?: string; storeId?: number | null } = {
      id: userId,
      username: payload.username,
      roleId: payload.roleId,
      roleName: payload.roleName,
      storeId: payload.storeId || null,
    } as User & { roleName?: string; storeId?: number | null };

    // Ensure id property exists and is valid
    if (!user.id || user.id <= 0) {
      throw new Error(
        `Failed to set user ID from payload. sub: ${payload.sub}, userId: ${userId}`,
      );
    }

    return Promise.resolve(user);
  }
}
