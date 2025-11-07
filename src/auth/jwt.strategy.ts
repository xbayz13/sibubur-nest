import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity'; // Or fetch from DB if needed

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production';
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
  }): Promise<User & { roleName?: string }> {
    // Ensure id is always a number
    const userId = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : Number(payload.sub);
    
    if (isNaN(userId) || userId <= 0) {
      throw new Error(`Invalid user ID in JWT payload: ${payload.sub}`);
    }

    const user: User & { roleName?: string } = {
      id: userId,
      username: payload.username,
      roleId: payload.roleId,
      roleName: payload.roleName,
    } as User & { roleName?: string };

    // Ensure id property exists and is valid
    if (!user.id || user.id <= 0) {
      throw new Error(`Failed to set user ID from payload. sub: ${payload.sub}, userId: ${userId}`);
    }

    return Promise.resolve(user);
  }
}
