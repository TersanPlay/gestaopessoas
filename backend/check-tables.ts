import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function main() {
  try {
    console.log("Conectando ao banco de dados...")
    
    // Query para listar tabelas no schema public
    const tables: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `

    console.log("\n--- Tabelas Encontradas ---")
    if (tables.length > 0) {
      tables.forEach((t) => console.log(`- ${t.table_name}`))
    } else {
      console.log("Nenhuma tabela encontrada no schema 'public'.")
    }
    console.log("---------------------------")

    // Verificar contagem de registros para ter certeza que não estão vazias (opcional, mas bom para confirmar o seed)
    const usersCount = await prisma.user.count();
    console.log(`\nTotal de Usuários: ${usersCount}`);

  } catch (error) {
    console.error("Erro ao verificar tabelas:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
