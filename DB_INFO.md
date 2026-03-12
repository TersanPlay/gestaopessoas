# Banco de Dados

Informações de conexão do PostgreSQL utilizadas pelo projeto.

- **Host**: localhost
- **Porta**: 5433
- **Banco**: gestao_db
- **Usuário**: postgres
- **Senha**: PostgreSQL
- **URL completa**: `postgresql://postgres:PostgreSQL@localhost:5433/gestao_db?schema=public`

## Acesso via psql
```bash
psql -h localhost -p 5433 -U postgres -d gestao_db
```

## Restore do backup
Backup mais recente: `db/backups/gestao_db_2026-03-11.dump`
```bash
pg_restore -h localhost -p 5433 -U postgres -d gestao_db db/backups/gestao_db_2026-03-11.dump
```

## Observações
- As credenciais acima são as configuradas no ambiente atual (backend/.env).
- Altere a senha ou host conforme o ambiente (dev/produção) e atualize o `.env` do backend.
