import { UserRole } from '@prisma/client';

export type JwtPayload = {
  userId: string;
  email: string;
  role: UserRole;
};
