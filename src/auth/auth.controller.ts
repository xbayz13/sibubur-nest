import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
  @Post('profile')
  @ApiOperation({ summary: 'Get user profile (protected)' })
  getProfile(
    @Request() req: { user: { username: string; [key: string]: any } },
  ): { username: string; [key: string]: any } {
    const user = req.user;
    return user; // User from JWT
  }
}
