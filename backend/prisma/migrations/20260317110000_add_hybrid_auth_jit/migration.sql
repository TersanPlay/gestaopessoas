CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'EXTERNAL');

ALTER TABLE "users"
ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN     "matricula" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "lotacao" TEXT,
ADD COLUMN     "funcao" TEXT,
ADD COLUMN     "vinculo" TEXT,
ADD COLUMN     "dataAdmissao" DATE,
ADD COLUMN     "dataDemissao" DATE,
ADD COLUMN     "cargaHorariaSemanal" INTEGER;

ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

UPDATE "users"
SET
  "matricula" = COALESCE("matricula", 'ADM0001'),
  "cpf" = COALESCE("cpf", '00000000000'),
  "authProvider" = 'LOCAL'
WHERE "email" = 'admin@gestao.com';

CREATE UNIQUE INDEX "users_matricula_key" ON "users"("matricula");
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");
