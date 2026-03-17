UPDATE "users"
SET
  "matricula" = NULL,
  "cpf" = NULL
WHERE "role" = 'ADMIN'
  AND "authProvider" = 'LOCAL';
