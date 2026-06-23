import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async create(email: string, password: string) {
    return this.prisma.user.create({
      data: {
        email,
        password,
      },
    });
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshTokenHash,
      },
    });
  }
}
