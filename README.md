# Gestão de Visitas

Aplicação web completa para gestão de visitantes, com portal administrativo e totem de autoatendimento.

## Visão Geral
- **Frontend**: React + Vite + Tailwind + Radix (workspace `frontend`).
- **Backend**: Node.js (Express) + Prisma + PostgreSQL (workspace `backend`).
- **Banco**: PostgreSQL (variáveis em `backend/.env`).
- **Autenticação**: JWT.
- **Reconhecimento facial**: face-api.js no totem com fallback para CPF.

## Funcionalidades
- Cadastro e gestão de visitantes, usuários e departamentos.
- Registro de visitas com check-in/check-out, código de acesso e PDF rápido.
- Totem de autoatendimento com reconhecimento facial.
- Relatórios e estatísticas.

## Pré-requisitos
- Node.js 22+
- npm 10+
- PostgreSQL em `localhost:5433` (ajuste em `backend/.env`).

## Execução rápida
```bash
# instalar dependências (workspaces)
npm install

# backend (porta 3000)
npm run dev:backend

# frontend (porta 5173/5174)
npm run dev:frontend
```
Credenciais seed: `admin@gestao.com` / `admin123`.

## Estrutura
- `backend/` – API, Prisma e migrações.
- `frontend/` – SPA (admin + totem).
- `docs/screenshots/` – capturas usadas abaixo.

## Módulos & Screenshots
- **Dashboard** – visão geral de visitas e indicadores.  
  ![Dashboard](docs/screenshots/Screenshot_Dashboard.png)
- **Gestão de Visitas** – listagem, filtros, check-in/out e PDF.  
  ![Gestão de Visitas](docs/screenshots/Screenshot_Gestão%20de%20Visitas.png)
- **Nova Visita** – criação rápida com seleção de visitante/host.  
  ![Nova Visita](docs/screenshots/Screenshot_NovaVisita.png)
- **Visitantes** – cards com foto, edição e embeddings faciais.  
  ![Visitantes](docs/screenshots/Screenshot_Visitantes.png)
- **Departamentos** – setores e responsáveis.  
  ![Departamentos](docs/screenshots/Screenshot_Departamentos.png)
- **Gestão de Usuários** – perfis e permissões.  
  ![Gestão de Usuários](docs/screenshots/Screenshot_Gestão%20de%20Usuarios.png)
- **Agenda (lista/calendário)** – visão temporal das visitas.  
  ![Agenda lista](docs/screenshots/Screenshot_Agenda%20de%20Visitas%20modo%20lista.png)  
  ![Agenda calendário](docs/screenshots/Screenshot_Agenda%20de%20Visitas_modo%20calendario.png)
- **Totem** – fluxo de reconhecimento facial + fallback CPF.  
  ![Totem](docs/screenshots/Screenshot_Totem.png)

## Reconhecimento Facial
- Embeddings salvos em `Visitor.faceEmbedding` (face-api.js).
- Visitantes antigos precisam gerar embedding (recarregar foto ou script).
- Fallback para CPF permanece disponível no totem.

## Scripts úteis
- `npm run dev:backend` – API com hot reload.
- `npm run dev:frontend` – SPA/totem com HMR.
- `npm run build` – build de ambos workspaces.
- `npx prisma studio --schema backend/prisma/schema.prisma` – UI do banco.

## Segurança e Privacidade
- Uso de dados biométricos requer consentimento (`consentGiven`).
- Atualize a política de privacidade conforme o uso de reconhecimento facial.

## Roadmap curto
- Relatórios PDF server-side.
- Threshold configurável e logs de confiança no matching facial.
- Armazenamento de fotos/embeddings em storage externo com CDN.
