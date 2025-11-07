import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const user = this.userRepository.create({
        username: createUserDto.username,
        name: createUserDto.name,
        passwordHash: hashedPassword,
        roleId: createUserDto.roleId,
        storeId: createUserDto.storeId || null,
      });
      return await this.userRepository.save(user);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
        throw new ConflictException('Username already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    const updateData: any = { ...updateUserDto };
    
    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      delete updateData.password;
    }

    // Handle storeId update
    if (updateUserDto.storeId !== undefined) {
      updateData.storeId = updateUserDto.storeId || null;
    }

    Object.assign(user, updateData);
    
    return await this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.userRepository.softDelete(id);
  }
}

