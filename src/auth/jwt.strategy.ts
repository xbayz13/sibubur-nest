import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../users/user.entity'; // Or fetch from DB if needed

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
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
  }): Promise<User> {
    const user = {
      id: typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub,
      username: payload.username,
      roleId: payload.roleId,
    } as unknown as User;
    return Promise.resolve(user);
  }
}
