import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.count();
    console.log(`Connection successful. Number of users: ${users}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error connecting to database:', message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
