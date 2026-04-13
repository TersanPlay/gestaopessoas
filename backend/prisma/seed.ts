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
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Credenciais do seed não configuradas. Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no backend/.env antes de rodar o seed.'
    )
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10)

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

  console.log({ adminId: admin.id, adminEmail: admin.email })
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
