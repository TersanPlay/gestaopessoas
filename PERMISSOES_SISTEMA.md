# 🔐 MAPA DE PERMISSÕES E ACESSOS DO SISTEMA

Este documento detalha a matriz de controle de acesso (RBAC) implementada no sistema, definindo a visibilidade de menus, acesso a rotas e permissões de ação para cada perfil.

---

## 🏗️ ESTRUTURA DE PERFIS

| Perfil | Código | Descrição Resumida |
| :--- | :--- | :--- |
| **Administrador** | `ADMIN` | Acesso irrestrito a todas as funcionalidades e configurações do sistema. |
| **Recepcionista** | `RECEPCIONISTA` | Foco operacional: gestão de fluxo de visitas e cadastro de visitantes. |
| **Colaborador** | `COLABORADOR` | Foco departamental: agenda pessoal e gestão de visitas do seu próprio setor. |

---

## 🖥️ VISIBILIDADE DE MENU E ROTAS

Representação visual do acesso ao menu lateral e proteção de rotas diretas.

### 1. Administrador (`ADMIN`)
```text
+---------------------------------------+
|  [ MENU LATERAL ]                     |
|                                       |
|  [🏠] Dashboard       --> (Acesso OK) |
|  [📋] Visitas         --> (Acesso OK) |
|  [👤] Visitantes      --> (Acesso OK) |
|  [👥] Usuários        --> (Acesso OK) |
|  [📥] Departamentos   --> (Acesso OK) |
|  [📅] Agenda          --> (Acesso OK) |
|  [🖥️] Totem           --> (Acesso OK) |
|  [📊] Relatórios      --> (Acesso OK) |
|  [⚙️] Configurações   --> (Acesso OK) |
+---------------------------------------+
```

### 2. Recepcionista (`RECEPCIONISTA`)
```text
+---------------------------------------+
|  [ MENU LATERAL ]                     |
|                                       |
|  [🏠] Dashboard       --> (Acesso OK) |
|  [📋] Visitas         --> (Acesso OK) |
|  [👤] Visitantes      --> (Acesso OK) |
|  [  ] (Oculto)        --> (Bloqueado) |  <-- Sem acesso a Usuários
|  [📥] Departamentos   --> (Acesso OK) |
|  [📅] Agenda          --> (Acesso OK) |
|  [🖥️] Totem           --> (Acesso OK) |
|  [  ] (Oculto)        --> (Bloqueado) |  <-- Sem acesso a Relatórios
|  [⚙️] Configurações   --> (Acesso OK) |
+---------------------------------------+
```

### 3. Colaborador (`COLABORADOR`)
```text
+---------------------------------------+
|  [ MENU LATERAL ]                     |
|                                       |
|  [🏠] Dashboard       --> (Acesso OK) |
|  [📋] Visitas         --> (Acesso OK) |  <-- Filtro: Apenas visitas do Depto.
|  [  ] (Oculto)        --> (Bloqueado) |  <-- Sem acesso a Visitantes
|  [  ] (Oculto)        --> (Bloqueado) |  <-- Sem acesso a Usuários
|  [📥] Departamentos   --> (Acesso OK) |
|  [📅] Agenda          --> (Acesso OK) |  <-- Filtro: Apenas visitas do Depto.
|  [  ] (Oculto)        --> (Bloqueado) |  <-- Sem acesso a Totem
|  [  ] (Oculto)        --> (Bloqueado) |  <-- Sem acesso a Relatórios
|  [  ] (Oculto)        --> (Bloqueado) |  <-- Sem acesso a Configurações
+---------------------------------------+
```

---

## ⚡ MATRIZ DE AÇÕES E FUNCIONALIDADES

Detalhamento do que cada perfil pode *fazer* dentro das páginas permitidas.

### 📋 Módulo de Visitas (`/visits`)

| Ação | Administrador | Recepcionista | Colaborador |
| :--- | :---: | :---: | :---: |
| **Visualizar Lista** | ✅ Todas | ✅ Todas | ⚠️ Apenas do seu Depto. |
| **Filtros e Busca** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Nova Visita** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Check-in** | ✅ Sim | ✅ Sim | ⚠️ Apenas do seu Depto. |
| **Check-out** | ✅ Sim | ✅ Sim | ⚠️ Apenas do seu Depto. |
| **Cancelar** | ✅ Sim | ✅ Sim | ⚠️ Apenas do seu Depto. |

### 👤 Módulo de Visitantes (`/visitors`)

| Ação | Administrador | Recepcionista | Colaborador |
| :--- | :---: | :---: | :---: |
| **Acesso à Página** | ✅ Sim | ✅ Sim | ❌ Bloqueado |
| **Ver Detalhes** | ✅ Sim | ✅ Sim | ❌ Bloqueado |
| **Editar Dados** | ✅ Sim | ✅ Sim | ❌ Bloqueado |
| **Cadastrar Novo** | ✅ Sim | ✅ Sim | ✅ Via Modal (em Nova Visita) |

### 👥 Módulo de Usuários (`/users`)

| Ação | Administrador | Recepcionista | Colaborador |
| :--- | :---: | :---: | :---: |
| **Acesso à Página** | ✅ Sim | ❌ Bloqueado | ❌ Bloqueado |
| **Criar/Editar** | ✅ Sim | ❌ Bloqueado | ❌ Bloqueado |

### 📊 Módulo de Relatórios (`/reports`)

| Ação | Administrador | Recepcionista | Colaborador |
| :--- | :---: | :---: | :---: |
| **Acesso à Página** | ✅ Sim | ❌ Bloqueado | ❌ Bloqueado |
| **Gerar Relatório** | ✅ Sim | ❌ Bloqueado | ❌ Bloqueado |
| **Exportar CSV** | ✅ Sim | ❌ Bloqueado | ❌ Bloqueado |

### ⚙️ Outros

| Ação | Administrador | Recepcionista | Colaborador |
| :--- | :---: | :---: | :---: |
| **Departamentos** | ✅ Gerenciar | 👁️ Visualizar | 👁️ Visualizar |
| **Configurações** | ✅ Editar Perfil | ✅ Editar Perfil | ❌ Bloqueado |

---

## 🔒 REGRAS DE BACKEND (SEGURANÇA)

1.  **Proteção de Rotas API:**
    *   `GET /visits`: Filtra automaticamente pelo `departmentId` se o usuário for `COLABORADOR`.
    *   `PATCH /visits/:id/status`: Verifica se o `departmentId` da visita corresponde ao do usuário se ele for `COLABORADOR`. Retorna `403 Forbidden` em caso de tentativa de acesso indevido.

2.  **Proteção de Frontend:**
    *   Componente `RoleRoute` bloqueia renderização de páginas não autorizadas.
    *   Menu lateral filtra itens dinamicamente baseado na *role*.
