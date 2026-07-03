import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';
import type { JwtPayload } from './types/jwt-payload.type';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({
    summary: 'Register a new customer account',
    description: 'Create a new customer account using email and password.',
  })
  @ApiCreatedResponse({
    description: 'User registered successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiConflictResponse({
    description: 'Email already exists.',
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Login',
    description: 'Authenticate user and return access token and refresh token.',
  })
  @ApiOkResponse({
    description: 'Login successful.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password.',
  })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
  })
  @ApiOkResponse({
    description: 'Current authenticated user.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired access token.',
  })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(
    @Req()
    req: Request & { user: JwtPayload },
  ): JwtPayload {
    return req.user;
  }

  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generate a new access token and refresh token.',
  })
  @ApiOkResponse({
    description: 'Tokens refreshed successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid or expired.',
  })
  @Post('refresh')
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout',
    description: 'Invalidate current refresh token.',
  })
  @ApiOkResponse({
    description: 'Logout successful.',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token is invalid.',
  })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.userId);
  }
}
