# 📊 Plano de Desenvolvimento e Implantação: Módulo de Relatórios

Este documento descreve a estratégia para análise, desenvolvimento e implantação do novo módulo de **Relatórios** no sistema de Gestão de Visitas.

**Objetivo:** Permitir que administradores extraiam dados consolidados sobre o fluxo de visitas, com capacidade de filtragem avançada e exportação.

**Restrição de Acesso:** Exclusivo para perfil **ADMIN**.

---

## 1. Análise da Arquitetura Atual & Requisitos

Baseado nos módulos existentes (`/visits`, `/dashboard`), o módulo de relatórios seguirá a seguinte estrutura:

### Backend (Node.js + Express + Prisma)
*   **Novo Controller:** `reportController.ts` para processar agregações complexas que não cabem no CRUD padrão de visitas.
*   **Novas Rotas:** `/api/reports/*` protegidas por `authMiddleware` e verificação de role `ADMIN`.
*   **Queries:** Uso intenso de `prisma.visit.findMany` com filtros de `date` (range) e `prisma.visit.groupBy` para estatísticas.

### Frontend (React + Vite + ShadcnUI)
*   **Nova Página:** `src/pages/Reports.tsx`.
*   **Componentes Reutilizáveis:**
    *   `Table` (existente em `components/ui/table.tsx`) para listagem detalhada.
    *   `Calendar` (existente em `components/ui/calendar.tsx`) para seleção de período.
    *   `Select` (existente) para filtro de departamento e status.
*   **Exportação:** Implementação de função para gerar CSV/PDF (sugestão: `jspdf` e `jspdf-autotable` ou geração nativa de CSV).

---

## 2. Plano de Desenvolvimento (Passo a Passo)

### Fase 1: Backend (API de Relatórios)

1.  **Criar Controller (`backend/src/controllers/reportController.ts`)**
    *   `getVisitReport`: Endpoint principal. Recebe `startDate`, `endDate`, `departmentId`, `status`. Retorna lista de visitas com relacionamentos (Visitor, Host, Department).
    *   `getReportStats`: Endpoint de resumo. Retorna contagens (Total, Canceladas, Por Departamento) dentro do período selecionado.

2.  **Criar Rotas (`backend/src/routes/reportRoutes.ts`)**
    *   Definir rotas GET.
    *   Aplicar middleware: `router.use(authenticate, requireRole(['ADMIN']))`.

3.  **Registrar Rotas (`backend/src/app.ts`)**
    *   Adicionar `app.use('/api/reports', reportRoutes)`.

### Fase 2: Frontend (Interface)

4.  **Criar Serviço de API**
    *   Adicionar métodos em `frontend/src/services/api.ts` (ou arquivo dedicado `reportsService.ts`) para chamar os novos endpoints.

5.  **Criar Página de Relatórios (`frontend/src/pages/Reports.tsx`)**
    *   **Header:** Título e Breadcrumbs.
    *   **Barra de Filtros:**
        *   *Date Range Picker:* Componente para selecionar "De" e "Até".
        *   *Select Departamento:* Carregar departamentos via API.
        *   *Select Status:* (Pendente, Realizada, Cancelada).
        *   *Botão Filtrar:* Dispara a busca.
    *   **Área de Resumo (Cards):** Exibir "Total no Período", "Média Diária", etc.
    *   **Tabela de Dados:** Colunas: Data/Hora, Visitante, Documento, Empresa, Departamento, , Status.
    *   **Botão Exportar:** Ação para baixar os dados da tabela.

6.  **Configurar Roteamento e Menu (`frontend/src/App.tsx` & `app-sidebar.tsx`)**
    *   Adicionar rota `/reports` protegida por `RoleRoute` (apenas `ADMIN`).
    *   Adicionar item "Relatórios" no Sidebar (apenas se user for `ADMIN`).

### Fase 3: Funcionalidade de Exportação

7.  **Implementar Exportação CSV**
    *   Criar utilitário `frontend/src/utils/exportUtils.ts`.
    *   Converter o JSON dos relatórios para formato CSV e disparar download via Blob no navegador.
    *   (Opcional) Adicionar exportação PDF se necessário formatação visual.

---

## 3. Plano de Implantação

1.  **Backup:** Realizar backup do banco de dados antes de qualquer deploy (embora seja apenas leitura, é boa prática).
2.  **Backend Deploy:**
    *   Atualizar código no servidor.
    *   Reiniciar serviço backend (`pm2 restart` ou similar).
3.  **Frontend Deploy:**
    *   Build da aplicação (`npm run build`).
    *   Atualizar arquivos estáticos no servidor web.
4.  **Validação:**
    *   Logar como ADMIN: Verificar acesso e funcionamento.
    *   Logar como RECEPCIONISTA/COLABORADOR: Verificar que o menu **não** aparece e a rota `/reports` redireciona para dashboard.

---

## 4. Estimativa de Esforço

*   **Backend:** 2-3 horas (Queries e rotas).
*   **Frontend (UI):** 4-5 horas (Filtros complexos, tabela, integração).
*   **Exportação:** 1-2 horas.
*   **Testes e Ajustes:** 1-2 horas.

**Total Estimado:** ~8-12 horas de desenvolvimento.
