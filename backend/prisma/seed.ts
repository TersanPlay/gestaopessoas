import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gestao.com' },
    update: {},
    create: {
      email: 'admin@gestao.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  const carSpots = Array.from({ length: 30 }, (_, index) => ({
    code: `A${index + 1}`,
    spotType: 'CAR' as const,
    status: 'FREE' as const,
    sector: 'Principal',
  }))

  const motorcycleSpots = Array.from({ length: 30 }, (_, index) => ({
    code: `M${index + 1}`,
    spotType: 'MOTORCYCLE' as const,
    status: 'FREE' as const,
    sector: 'Principal',
  }))

  await prisma.guardhouseParkingSpot.createMany({
    data: [...carSpots, ...motorcycleSpots],
    skipDuplicates: true,
  })

  console.log({ admin })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
