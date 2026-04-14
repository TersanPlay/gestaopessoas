const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.count();
    console.log(`Connection successful. Number of users: ${users}`);
  } catch (error) {
    console.error('Error connecting to database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();