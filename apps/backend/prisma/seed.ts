import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('testpass', 10);
  await prisma.app.create({
    data: {
      id: 'app_123',
      name: 'ChatApp',
      appSecretHash: 'secret_hash',
      createdAt: new Date(),
    },
  });
  await prisma.user.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      appId: 'app_123',
      username: 'testuser',
      password: hashedPassword,
    },
  });
  console.log('Test app and user seeded');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());