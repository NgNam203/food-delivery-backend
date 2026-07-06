import { PrismaClient } from '@prisma/client';

export async function seedMenuItems(prisma: PrismaClient) {
  const burgerHouse = await prisma.restaurant.findFirst({
    where: {
      name: 'Burger House',
    },
  });

  const pizzaCorner = await prisma.restaurant.findFirst({
    where: {
      name: 'Pizza Corner',
    },
  });

  if (!burgerHouse || !pizzaCorner) {
    throw new Error('Restaurants not found');
  }

  const restaurantMenus = [
    {
      restaurant: burgerHouse,
      items: [
        {
          name: 'Classic Burger',
          description: 'Beef burger with lettuce and tomato',
          price: 8.99,
          stock: 100,
        },
        {
          name: 'Cheese Burger',
          description: 'Beef burger with cheddar cheese',
          price: 9.99,
          stock: 100,
        },
        {
          name: 'Chicken Burger',
          description: 'Grilled chicken burger',
          price: 8.49,
          stock: 100,
        },
        {
          name: 'French Fries',
          description: 'Crispy french fries',
          price: 3.99,
          stock: 200,
        },
        {
          name: 'Coca Cola',
          description: '330ml',
          price: 1.99,
          stock: 300,
        },
      ],
    },

    {
      restaurant: pizzaCorner,
      items: [
        {
          name: 'Margherita Pizza',
          description: 'Classic Italian pizza',
          price: 12.99,
          stock: 80,
        },
        {
          name: 'Pepperoni Pizza',
          description: 'Pepperoni and mozzarella',
          price: 14.99,
          stock: 80,
        },
        {
          name: 'Seafood Pizza',
          description: 'Shrimp and squid',
          price: 16.99,
          stock: 60,
        },
        {
          name: 'Garlic Bread',
          description: 'Fresh baked garlic bread',
          price: 4.99,
          stock: 120,
        },
        {
          name: 'Pepsi',
          description: '330ml',
          price: 1.99,
          stock: 300,
        },
      ],
    },
  ];

  for (const restaurantMenu of restaurantMenus) {
    for (const item of restaurantMenu.items) {
      const existingMenuItem = await prisma.menuItem.findFirst({
        where: {
          restaurantId: restaurantMenu.restaurant.id,
          name: item.name,
        },
      });
      if (existingMenuItem) {
        continue;
      }
      await prisma.menuItem.create({
        data: {
          restaurantId: restaurantMenu.restaurant.id,

          name: item.name,

          description: item.description,

          price: item.price,

          stock: item.stock,

          isAvailable: true,
        },
      });
    }
  }
}
