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
    } catch (error) {
      // Handle duplicate username error
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
        throw new ConflictException('Username already exists');
      }
      // Handle other database errors
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async login(user: User): Promise<{ access_token: string }> {
    // Load role to include roleName in JWT payload
    const userWithRole = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['role'],
    });

    const payload = {
      username: user.username,
      sub: user.id,
      roleId: user.roleId,
      roleName: userWithRole?.role?.name || null,
    };
    return { access_token: this.jwtService.sign(payload) };
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['role'],
    });
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }
    return null;
  }
}
