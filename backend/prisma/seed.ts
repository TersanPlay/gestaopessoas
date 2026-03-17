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
  const adminEmail = 'admin@gestao.com'

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
      authProvider: 'LOCAL',
      matricula: null,
      cpf: null,
    },
    create: {
      email: adminEmail,
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
      authProvider: 'LOCAL',
      matricula: null,
      cpf: null,
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
