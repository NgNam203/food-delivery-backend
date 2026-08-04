import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
jest.mock('bcrypt');
describe('AuthService', () => {
  let service: AuthService;
  const userServiceMock = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
    clearRefreshToken: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: userServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw when email already exists', async () => {
    const dto = {
      email: 'test@example.com',
      password: '123456',
    };
    userServiceMock.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: dto.email,
    });
    await expect(service.register(dto)).rejects.toThrow('Email already exists');
    expect(userServiceMock.create).not.toHaveBeenCalled();
  });

  it('should register user successfully', async () => {
    const dto = {
      email: 'test@example.com',
      password: '123456',
    };

    userServiceMock.findByEmail.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    userServiceMock.create.mockResolvedValue({
      id: 'user-id',
      email: dto.email,
      role: 'CUSTOMER',
      createdAt: new Date(),
    });
    const result = await service.register(dto);
    expect(userServiceMock.create).toHaveBeenCalledWith(
      dto.email,
      expect.any(String),
    );

    const hashedPassword = userServiceMock.create.mock.calls[0][1];

    expect(hashedPassword).not.toBe(dto.password);

    expect(result).toEqual({
      id: 'user-id',
      email: dto.email,
      role: 'CUSTOMER',
      createdAt: expect.any(Date),
    });
  });

  it('should throw when user does not exist', async () => {
    const dto = {
      email: 'test@example.com',
      password: '123456',
    };

    userServiceMock.findByEmail.mockResolvedValue(null);

    await expect(service.login(dto)).rejects.toThrow('Invalid credentials');

    expect(userServiceMock.findByEmail).toHaveBeenCalledWith(dto.email);
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    expect(userServiceMock.updateRefreshTokenHash).not.toHaveBeenCalled();
  });

  it('should throw when password is incorrect', async () => {
    const dto = {
      email: 'test@example.com',
      password: '123456',
    };

    userServiceMock.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: dto.email,
      password: 'hashed-password',
      role: 'CUSTOMER',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login(dto)).rejects.toThrow('Invalid credentials');

    expect(userServiceMock.findByEmail).toHaveBeenCalledWith(dto.email);

    expect(bcrypt.compare).toHaveBeenCalledWith(
      dto.password,
      'hashed-password',
    );

    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();

    expect(userServiceMock.updateRefreshTokenHash).not.toHaveBeenCalled();
  });

  it('should login successfully', async () => {
    const dto = {
      email: 'test@example.com',
      password: '123456',
    };
    userServiceMock.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: dto.email,
      password: 'hashed-password',
      role: 'CUSTOMER',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    configServiceMock.getOrThrow
      .mockReturnValueOnce('7d')
      .mockReturnValueOnce('refresh-secret');

    jwtServiceMock.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

    userServiceMock.updateRefreshTokenHash.mockResolvedValue(undefined);

    const result = await service.login(dto);

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith(
      dto.password,
      'hashed-password',
    );

    expect(userServiceMock.updateRefreshTokenHash).toHaveBeenCalledTimes(1);
  });

  it('should throw when refresh token is invalid', async () => {
    const refreshToken = 'invalid-refresh-token';

    configServiceMock.getOrThrow.mockReturnValue('refresh-secret');

    jwtServiceMock.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    await expect(service.refresh(refreshToken)).rejects.toThrow(
      'Invalid refresh token',
    );

    expect(configServiceMock.getOrThrow).toHaveBeenCalledWith(
      'JWT_REFRESH_SECRET',
    );

    expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(refreshToken, {
      secret: 'refresh-secret',
    });

    expect(userServiceMock.findById).not.toHaveBeenCalled();

    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();

    expect(userServiceMock.updateRefreshTokenHash).not.toHaveBeenCalled();
  });

  it('should refresh token successfully', async () => {
    const refreshToken = 'old-refresh-token';

    const user = {
      id: 'user-id',
      email: 'test@example.com',
      role: 'CUSTOMER',
      refreshTokenHash: 'hashed-old-refresh-token',
    };

    configServiceMock.getOrThrow
      .mockReturnValueOnce('refresh-secret')
      .mockReturnValueOnce('7d')
      .mockReturnValueOnce('refresh-secret');

    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: user.id,
    });

    userServiceMock.findById.mockResolvedValue(user);

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    jwtServiceMock.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-refresh-token');

    userServiceMock.updateRefreshTokenHash.mockResolvedValue(undefined);

    const result = await service.refresh(refreshToken);

    expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(refreshToken, {
      secret: 'refresh-secret',
    });

    expect(userServiceMock.findById).toHaveBeenCalledWith(user.id);

    expect(bcrypt.compare).toHaveBeenCalledTimes(1);

    expect(jwtServiceMock.signAsync).toHaveBeenCalledTimes(2);

    expect(userServiceMock.updateRefreshTokenHash).toHaveBeenCalledWith(
      user.id,
      'hashed-new-refresh-token',
    );

    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
  });

  it('should logout successfully', async () => {
    const userId = 'user-id';

    userServiceMock.clearRefreshToken.mockResolvedValue(undefined);

    const result = await service.logout(userId);

    expect(userServiceMock.clearRefreshToken).toHaveBeenCalledTimes(1);

    expect(userServiceMock.clearRefreshToken).toHaveBeenCalledWith(userId);

    expect(result).toEqual({
      message: 'Logout successful',
    });
  });
});
