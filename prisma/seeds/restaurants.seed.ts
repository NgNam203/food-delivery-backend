import { PrismaClient, RestaurantStatus } from '@prisma/client';

export async function seedRestaurants(prisma: PrismaClient) {
  const owner = await prisma.user.findUnique({
    where: {
      email: 'owner@example.com',
    },
  });
  if (!owner) {
    throw new Error('Owner not found');
  }

  const restaurants = [
    {
      name: 'Burger House',
      address: '123 Main Street',
      description: 'Premium burgers and fries',
    },
    {
      name: 'Pizza Corner',
      address: '456 Central Avenue',
      description: 'Fresh Italian pizza',
    },
  ];
  for (const restaurant of restaurants) {
    const existingRestaurant = await prisma.restaurant.findFirst({
      where: {
        ownerId: owner.id,
        name: restaurant.name,
      },
    });

    if (existingRestaurant) {
      continue;
    }

    await prisma.restaurant.create({
      data: {
        ownerId: owner.id,
        name: restaurant.name,
        address: restaurant.address,
        description: restaurant.description,
        status: RestaurantStatus.OPEN,
      },
    });
  }
}
