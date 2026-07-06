import { PrismaClient } from '@prisma/client';

import { seedUsers } from './seeds/users.seed';
import { seedRestaurants } from './seeds/restaurants.seed';
import { seedMenuItems } from './seeds/menu-items.seed';
import { seedCoupons } from './seeds/coupons.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding database...\n');

  console.log('👤 Seeding users...');
  await seedUsers(prisma);
  console.log('✅ Users seeded.\n');

  console.log('🏪 Seeding restaurants...');
  await seedRestaurants(prisma);
  console.log('✅ Restaurants seeded.\n');

  console.log('🍔 Seeding menu items...');
  await seedMenuItems(prisma);
  console.log('✅ Menu items seeded.\n');

  console.log('🎟️ Seeding coupons...');
  await seedCoupons(prisma);
  console.log('✅ Coupons seeded.\n');

  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed.');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
