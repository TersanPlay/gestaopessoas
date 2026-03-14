# Modulo Guarita - Documentacao Completa

## 1. Visao geral

O Modulo Guarita e o subsistema de controle de acesso veicular do projeto.
Ele cobre:

- cadastro de veiculos;
- registro de entrada e saida;
- controle de vagas;
- historico operacional;
- auditoria basica (fotos, ocorrencias e bloqueios);
- painel analitico proprio da guarita.

Objetivo principal: garantir operacao rapida na portaria com rastreabilidade completa.

---

## 2. Escopo funcional atual

### 2.1 Telas do modulo (frontend)

- `/guardhouse/dashboard` - dashboard operacional da guarita.
- `/guardhouse/entry` - cadastro e entrada na mesma tela.
- `/guardhouse/exit` - saida de movimentacoes em aberto.
- `/guardhouse/movements` - historico consolidado.
- `/guardhouse/vehicles` - lista de veiculos.
- `/guardhouse/vehicles/:id` - detalhes do veiculo com edicao inline.
- `/guardhouse/reports` - dashboard analitico exclusivo da guarita.

### 2.2 Funcionalidades implementadas

- metrics operacionais em tempo real (dashboard);
- mapa de vagas para carro e moto;
- tabela de ultimas movimentacoes com paginacao;
- cadastro e entrada em fluxo unico;
- upload/captura de foto do veiculo (arquivo, webcam USB, camera em rede);
- sugestao de placas por prefixo e auto-preenchimento do formulario;
- validacao de placa Brasil (antigo + Mercosul) com normalizacao;
- edicao de cadastro na tela de detalhes (sem redirecionar para entry);
- controle de bloqueio e desbloqueio de veiculo;
- ocorrencias e fotos de movimentacao via API;
- relatorio analitico proprio da guarita (sem usar `/reports`).

---

## 3. Arquitetura tecnica

## 3.1 Backend

Stack:

- Node.js + Express
- Prisma ORM
- PostgreSQL
- Multer para upload

Ponto de entrada de rotas:

- `backend/src/app.ts`
- prefixo de API da guarita: `/api/guardhouse`

Arquivos principais:

- `backend/src/routes/guardhouseRoutes.ts`
- `backend/src/controllers/guardhouseController.ts`
- `backend/prisma/schema.prisma`

## 3.2 Frontend

Stack:

- React + Vite + TypeScript
- React Router
- shadcn/ui + Tailwind
- Recharts (analytics)

Arquivos principais:

- `frontend/src/services/guardhouseApi.ts`
- `frontend/src/pages/guardhouse/GuardhouseDashboard.tsx`
- `frontend/src/pages/guardhouse/GuardhouseEntry.tsx`
- `frontend/src/pages/guardhouse/GuardhouseExit.tsx`
- `frontend/src/pages/guardhouse/GuardhouseMovements.tsx`
- `frontend/src/pages/guardhouse/GuardhouseVehicles.tsx`
- `frontend/src/pages/guardhouse/GuardhouseVehicleDetails.tsx`
- `frontend/src/pages/guardhouse/GuardhouseReports.tsx`

## 3.3 Integracao e assets

- fotos de veiculo ficam em `uploads/guardhouse/vehicles`;
- servidas via backend em `/uploads/...`;
- upload de foto no endpoint de veiculo usa multipart (`file`).

---

## 4. Modelo de dados (Prisma)

## 4.1 Enums

- `VehicleCategory`: `OFFICIAL`, `EMPLOYEE`, `VISITOR`, `CONTRACTOR`
- `SpotType`: `CAR`, `MOTORCYCLE`
- `SpotStatus`: `FREE`, `OCCUPIED`, `RESERVED`, `BLOCKED`, `MAINTENANCE`
- `MovementStatus`: `PRESENT`, `FINISHED`, `CANCELLED`
- `PhotoType`: `ENTRY`, `EXIT`
- `OccurrenceType`: `IRREGULAR_PARKING`, `MISSING_DOCUMENT`, `ACCESS_ATTEMPT`, `DAMAGE`, `NOTE`

## 4.2 Entidades principais

### GuardhouseVehicle

- placa unica (`plate`, unique/index);
- categoria, tipo, marca, modelo, cor, orgao/origem, notas;
- flag `isActive`;
- relacoes com `movements` e `blocks`;
- campo `photo` (path publico da imagem).

### GuardhouseDriver

- nome obrigatorio;
- documento unico opcional;
- telefone, categoria, departamento opcional, notas;
- flag `isActive`.

### GuardhouseParkingSpot

- codigo unico (ex.: `A1`, `M1`);
- tipo da vaga (`CAR`/`MOTORCYCLE`);
- status da vaga;
- setor, notas, ativo/inativo.

### GuardhouseVehicleMovement

- vincula veiculo, condutor e vaga;
- registra departamento destino e categoria de acesso;
- tempos de entrada e saida;
- duracao em minutos;
- status (`PRESENT`/`FINISHED`/`CANCELLED`);
- notas de entrada/saida;
- usuario que registrou entrada/saida.

### Auditoria

- `GuardhouseMovementPhoto`: foto associada a movimentacao.
- `GuardhouseVehicleOccurrence`: ocorrencia operacional.
- `GuardhouseVehicleBlock`: bloqueio de acesso por veiculo.

---

## 5. Rotas frontend e permissao (RoleRoute)

## 5.1 Matriz de acesso

| Rota | ADMIN | RECEPCIONISTA | COLABORADOR |
|---|---:|---:|---:|
| `/guardhouse/dashboard` | Sim | Sim | Sim |
| `/guardhouse/entry` | Sim | Sim | Nao |
| `/guardhouse/exit` | Sim | Sim | Sim |
| `/guardhouse/movements` | Sim | Sim | Sim |
| `/guardhouse/vehicles` | Sim | Sim | Sim |
| `/guardhouse/vehicles/:id` | Sim | Sim | Sim |
| `/guardhouse/reports` | Sim | Sim | Sim |

Observacao:

- item "Guarita" existe no menu lateral;
- link para relatorio da guarita fica no dashboard da guarita como card dedicado;
- `/reports` geral permanece separado (admin only) e nao representa o modulo guarita.

---

## 6. API da guarita (backend)

Todos os endpoints exigem autenticacao (`router.use(authenticate)`).

## 6.1 Dashboard

- `GET /api/guardhouse/dashboard/stats`
  - retorno: veiculos no patio, entradas/saidas do dia, media de permanencia, status de vagas e ultimas movimentacoes (ate 30).

- `GET /api/guardhouse/dashboard/live-feed?limit=15`
  - limite maximo: 80;
  - retorna feed operacional recente.

## 6.2 Veiculos

- `GET /api/guardhouse/vehicles?search=&activeOnly=`
  - `activeOnly` padrao: `true`.

- `POST /api/guardhouse/vehicles` (ADMIN, RECEPCIONISTA)

- `GET /api/guardhouse/vehicles/:id`

- `PATCH /api/guardhouse/vehicles/:id` (ADMIN, RECEPCIONISTA)
  - aceita update de cadastro;
  - suporta `driverName` para atualizar/criar condutor na ultima movimentacao.

- `POST /api/guardhouse/vehicles/:id/photo` (ADMIN, RECEPCIONISTA)
  - multipart `file`;
  - limite de upload: 10 MB;
  - exige MIME de imagem.

- `POST /api/guardhouse/vehicles/:id/block` (ADMIN, RECEPCIONISTA)

- `PATCH /api/guardhouse/vehicles/:id/unblock` (ADMIN, RECEPCIONISTA)

## 6.3 Condutores

- `GET /api/guardhouse/drivers?search=&limit=&activeOnly=`
  - limite padrao 30, maximo 100.

- `POST /api/guardhouse/drivers` (ADMIN, RECEPCIONISTA)

## 6.4 Vagas

- `GET /api/guardhouse/spots?type=&status=&activeOnly=`

- `PATCH /api/guardhouse/spots/:id/status` (ADMIN, RECEPCIONISTA)

## 6.5 Movimentacoes

- `GET /api/guardhouse/movements?status=&plate=&dateFrom=&dateTo=&limit=`
  - limite padrao 50, maximo 200.

- `GET /api/guardhouse/movements/:id`

- `POST /api/guardhouse/movements/entry` (ADMIN, RECEPCIONISTA, COLABORADOR)

- `PATCH /api/guardhouse/movements/:id/exit` (ADMIN, RECEPCIONISTA, COLABORADOR)

- `POST /api/guardhouse/movements/:id/photos` (ADMIN, RECEPCIONISTA, COLABORADOR)

- `POST /api/guardhouse/movements/:id/occurrences` (ADMIN, RECEPCIONISTA, COLABORADOR)

---

## 7. Regras de negocio e validacoes

## 7.1 Placa (Brasil)

Padrao aceito:

- antigo: `AAA0000`
- Mercosul: `AAA0A00`

Validacao aplicada:

- regex backend/frontend: `^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$`
- normalizacao antes de salvar/buscar:
  - remove espacos e simbolos;
  - remove hifen;
  - converte para maiusculo.

## 7.2 Entrada

Ao registrar entrada:

- cria veiculo automaticamente se placa nao existir;
- se existir, atualiza dados faltantes (sem sobrescrever indiscriminadamente);
- bloqueio ativo impede entrada para perfil nao-admin;
- nao permite duas movimentacoes abertas para mesmo veiculo;
- seleciona vaga solicitada ou primeira vaga livre compativel;
- valida vaga ativa, livre e com tipo correto;
- muda status da vaga para `OCCUPIED`;
- cria movimentacao com `status=PRESENT`.

## 7.3 Saida

Ao registrar saida:

- somente para movimentacao `PRESENT`;
- calcula duracao minima de 1 minuto;
- grava `exitAt`, `durationMinutes`, `exitNotes`, `registeredByExitId`;
- muda vaga para `FREE`;
- define status da movimentacao como `FINISHED`.

## 7.4 Bloqueio de veiculo

- novo bloqueio encerra bloqueios ativos anteriores;
- desbloqueio marca bloqueios ativos como inativos e define `endAt`.

## 7.5 Tratamento de erros comuns

- placa invalida: `400`
- placa duplicada: `409`
- veiculo bloqueado para entrada: `403`
- movimentacao aberta ja existente: `409`
- vaga indisponivel/invalida: `409`/`404`
- recurso nao encontrado: `404`

---

## 8. Fluxos operacionais do frontend

## 8.1 Dashboard Guarita (`/guardhouse/dashboard`)

- KPIs: veiculos no patio, entradas hoje, saidas hoje, tempo medio;
- cards de acao rapida:
  - Cadastrar Veiculo
  - Registrar Saida
  - Historico
  - Veiculos
  - Dashboard Analitico
- mapa de vagas de carros e motos;
- tabela de ultimas movimentacoes:
  - 10 linhas fixas por pagina;
  - paginacao;
  - status visual por cor.

## 8.2 Cadastro e Entrada (`/guardhouse/entry`)

Tela unica para:

- cadastro simples de veiculo;
- cadastro + entrada no patio.

Campos:

- Placa (com sugestao por prefixo);
- Tipo de veiculo (`CAR`, `MOTORCYCLE`, `PICKUP`, `VAN`);
- Tipo de acesso (Oficial, Servidor, Contratado, Visitante, Prestador de Servico, Terceirizado);
- Tipo departamento de destino (select de departamentos);
- Marca, Modelo, Cor (incluindo cor Fantasia em gradiente);
- Condutor;
- Observacoes do motivo da entrada.

Recursos de placa:

- sugestao de placas ja cadastradas ao digitar prefixo;
- auto-preenchimento ao identificar placa existente.

Midia do veiculo:

- upload por arquivo;
- captura via webcam USB;
- captura via URL de camera em rede;
- placeholder dinamico por tipo de veiculo quando sem foto.

## 8.3 Registro de Saida (`/guardhouse/exit`)

- busca movimentacoes abertas por placa;
- mostra tempo parcial;
- permite observacao de saida;
- finaliza saida direto da lista.

## 8.4 Historico (`/guardhouse/movements`)

- filtros por placa e status;
- tabela consolidada com vaga, entrada, saida, status e permanencia.

## 8.5 Veiculos (`/guardhouse/vehicles`)

- busca por placa/marca/modelo;
- lista com categoria, tipo, status e acao para detalhes.

## 8.6 Detalhes do Veiculo (`/guardhouse/vehicles/:id`)

- card de Midia do Veiculo com opcoes de captura/upload;
- card Resumo Operacional com edicao inline;
- botao "Editar Cadastro" na propria tela;
- edicao de condutor, placa, tipo, acesso, departamento, marca/modelo/cor e observacoes;
- historico em tabela e linha do tempo.

## 8.7 Dashboard Analitico Guarita (`/guardhouse/reports`)

Painel analitico proprio do modulo:

- filtros por data inicial/final e status;
- KPIs: total de movimentacoes, veiculos unicos, no patio agora, tempo medio;
- grafico fluxo diario (entradas x saidas);
- distribuicao por tipo de acesso;
- resumo por tipo de veiculo;
- tabela de ultimas movimentacoes do filtro;
- exportacao CSV.

---

## 9. Mapeamentos de negocio da UI para API

## 9.1 Tipo de acesso (UI -> API VehicleCategory)

- `OFFICIAL` -> `OFFICIAL`
- `EMPLOYEE` -> `EMPLOYEE`
- `CONTRACTED` -> `CONTRACTOR`
- `VISITOR` -> `VISITOR`
- `SERVICE_PROVIDER` -> `CONTRACTOR`
- `OUTSOURCED` -> `CONTRACTOR`

## 9.2 Tipo de veiculo (UI -> API SpotType)

- `CAR` -> `CAR`
- `MOTORCYCLE` -> `MOTORCYCLE`
- `PICKUP` -> `CAR`
- `VAN` -> `CAR`

---

## 10. Permissoes no backend (authorize)

| Acao | ADMIN | RECEPCIONISTA | COLABORADOR |
|---|---:|---:|---:|
| Ler dashboard, veiculos, condutores, vagas, movimentacoes | Sim | Sim | Sim |
| Criar/editar veiculo | Sim | Sim | Nao |
| Upload foto de veiculo | Sim | Sim | Nao |
| Bloquear/desbloquear veiculo | Sim | Sim | Nao |
| Criar condutor | Sim | Sim | Nao |
| Alterar status de vaga | Sim | Sim | Nao |
| Registrar entrada | Sim | Sim | Sim |
| Registrar saida | Sim | Sim | Sim |
| Adicionar foto/ocorrencia em movimentacao | Sim | Sim | Sim |

---

## 11. Seed e dados iniciais

Arquivo:

- `backend/prisma/seed.ts`

Dados criados:

- usuario admin padrao: `admin@gestao.com` / `admin123`;
- 30 vagas de carro (`A1`..`A30`);
- 30 vagas de moto (`M1`..`M30`);
- total inicial: 60 vagas.

---

## 12. Execucao e operacao

## 12.1 Pre-requisitos

- Node.js >= 22
- npm >= 10
- PostgreSQL configurado no `backend/.env`

## 12.2 Comandos recomendados

Instalacao:

```bash
npm install
```

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

Build geral:

```bash
npm run build
```

## 12.3 Prisma

Aplicar migracoes:

```bash
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

Rodar seed:

```bash
npx prisma db seed --schema backend/prisma/schema.prisma
```

---

## 13. Checklist de homologacao (QA)

## 13.1 Fluxo de entrada

- cadastrar/entrar com placa nova;
- cadastrar/entrar com placa ja existente;
- validar sugestao e auto-preenchimento de placa;
- validar bloqueio de veiculo (admin x nao-admin);
- validar selecao automatica e manual de vaga.

## 13.2 Fluxo de saida

- finalizar movimentacao em aberto;
- confirmar liberacao da vaga;
- validar erro ao tentar sair movimentacao ja finalizada.

## 13.3 Veiculo e detalhes

- editar cadastro sem sair da tela de detalhes;
- editar condutor;
- validar upload de foto por arquivo/webcam/rede;
- validar placeholder quando sem foto.

## 13.4 Dashboard e relatorios

- conferir KPIs e mapas de vagas;
- conferir tabela de ultimas movimentacoes (10 linhas fixas + paginacao);
- validar filtros e exportacao CSV no `/guardhouse/reports`.

---

## 14. Limitacoes atuais e melhorias sugeridas

## 14.1 Limitacoes atuais

- `GET /movements` retorna no maximo 200 registros por chamada;
- analytics da guarita usa os dados retornados por esse limite;
- sem testes automatizados especificos do modulo no repositorio.

## 14.2 Melhorias sugeridas

- endpoint paginado de movimentacoes para analytics de longo periodo;
- endpoint agregado server-side para KPIs historicos;
- alertas de permanencia excessiva em tempo real;
- OCR/LPR de placa;
- testes E2E dos fluxos principais de entrada/saida.

---

## 15. Historico resumido de evolucao do modulo

Entregas relevantes ja implementadas:

- base completa de dados e API da guarita;
- dashboard operacional com mapa de vagas;
- fluxo unificado de cadastro + entrada;
- tela de detalhes com edicao inline e midia;
- autocomplete de placa + auto-preenchimento;
- pagina analitica exclusiva da guarita;
- separacao do relatorio da guarita em relacao ao `/reports` geral.

