import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from '../users/users.service';
import { PermissionsService } from '../permissions/permissions.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private permissionsService: PermissionsService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: SignupDto })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(
      signupDto.username,
      signupDto.password,
      signupDto.name,
      signupDto.roleId,
    );
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return await this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile (protected)' })
  async getProfile(
    @Request() req: { user: { id: number; username: string; roleId: number; roleName?: string; [key: string]: any } },
  ) {
    const userId = req.user.id;
    
    try {
      const user = await this.usersService.findOne(userId);
      
      // Extract permissions from role
      const permissions: string[] = [];
      
      // Owner and SuperAdmin have all permissions
      if (user.role?.name === 'SuperAdmin') {
        permissions.push('superadmin:*');
      } else if (user.role?.name === 'Owner') {
        // Owner has all permissions: use rolePermissions if present, else fetch all permissions
        const rolePerms = user.role?.rolePermissions ?? [];
        if (rolePerms.length > 0) {
          rolePerms.forEach((rp: { permission?: { slug?: string } }) => {
            if (rp.permission?.slug) {
              permissions.push(rp.permission.slug);
            }
          });
        } else {
          const allPermissions = await this.permissionsService.findAllUnpaginated();
          permissions.push(...allPermissions.map((p) => p.slug));
        }
      } else {
        // Regular users get permissions from their role
        if (user.role?.rolePermissions) {
          user.role.rolePermissions.forEach((rp: any) => {
            if (rp.permission?.slug) {
              permissions.push(rp.permission.slug);
            }
          });
        }
      }

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        roleId: user.roleId,
        roleName: user.role?.name || req.user.roleName,
        storeId: user.storeId,
        permissions,
      };
    } catch (error) {
      // If user not found, the token is invalid (user was deleted)
      // Return 401 Unauthorized instead of 404
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('User account no longer exists. Please log in again.');
      }
      throw error;
    }
  }
}
