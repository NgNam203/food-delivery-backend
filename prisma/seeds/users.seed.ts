import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedUsers(prisma: PrismaClient) {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const users = [
    {
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    },
    {
      email: 'owner@example.com',
      role: UserRole.OWNER,
    },
    {
      email: 'customer@example.com',
      role: UserRole.CUSTOMER,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: {
        email: user.email,
      },

      update: {},

      create: {
        email: user.email,
        password: hashedPassword,
        role: user.role,
      },
    });
  }
}
