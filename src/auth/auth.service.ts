import { ConflictException, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.userService.create(dto.email, hashedPassword);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.userService.updateRefreshTokenHash(user.id, refreshTokenHash);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async signAccessToken(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private async signRefreshToken(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
      },
    );
  }
}
