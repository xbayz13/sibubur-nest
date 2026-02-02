import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * Registers a user and returns access token.
   */
  async signup(
    username: string,
    password: string,
    name: string,
    roleId: number,
  ): Promise<{ access_token: string }> {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = this.userRepository.create({
        username,
        passwordHash: hashedPassword,
        name,
        roleId,
      });
      const savedUser = await this.userRepository.save(user);
      return await this.login(savedUser);
    } catch (error: unknown) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : undefined;
      if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === '23505') {
        throw new ConflictException('Username already exists');
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  /**
   * Returns JWT access token for the given user (with role and store in payload).
   */
  async login(user: User): Promise<{ access_token: string }> {
    const userWithRelations = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['role', 'store'],
    });

    const payload = {
      username: user.username,
      sub: user.id,
      roleId: user.roleId,
      roleName: userWithRelations?.role?.name || null,
      storeId: userWithRelations?.storeId || null,
    };
    return { access_token: this.jwtService.sign(payload) };
  }

  /**
   * Validates username and password; returns user or null.
   */
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['role', 'store'],
    });
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }
    return null;
  }
}
