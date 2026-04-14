# Guia de Integração — API de Autenticação Unificada

**Versão:** 1.0  
**Última atualização:** Março 2026  
**Plataforma:** Câmara Municipal de Parauapebas

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Autenticação e Segurança](#2-autenticação-e-segurança)
3. [Endpoints de Dados](#3-endpoints-de-dados)
4. [Fluxo SSO — Autenticação Centralizada](#4-fluxo-sso--autenticação-centralizada)
5. [Exemplos de Integração](#5-exemplos-de-integração)
6. [Códigos de Erro](#6-códigos-de-erro)
7. [Boas Práticas](#7-boas-práticas)

---

## 1. Visão Geral

A API de Autenticação Unificada é uma plataforma centralizada para consulta de dados funcionais de servidores públicos e autenticação institucional via SSO.

### Funcionalidades

| Categoria | Descrição |
|---|---|
| **Autenticação** | Validação de servidores por matrícula + CPF com emissão de JWT |
| **Consulta de Dados** | Busca de servidores, lotações e estatísticas institucionais |
| **SSO** | Single Sign-On para sistemas externos com fluxo de autorização por código |

### Conceitos Principais

- **API Key (X-API-Key):** Chave única do sistema integrado, enviada no header de cada requisição.
- **JWT (JSON Web Token):** Token temporário (1h) com dados do servidor, emitido após autenticação.
- **Código de Autorização (SSO):** Código de uso único (5 min) trocado por token de acesso.

---

## 2. Autenticação e Segurança

### Header de Autenticação

Todas as requisições (exceto health check e endpoints SSO públicos) exigem o header:

```
X-API-Key: sua_chave_api_aqui
```

> ⚠️ **Não use** `Authorization: Bearer`. O header correto é `X-API-Key`.

### Rate Limiting

Cada sistema tem um limite de requisições por minuto (padrão: 60). Ao exceder, a API retorna `429 Too Many Requests`.

### IP Whitelist

Se configurado, apenas IPs na lista branca podem acessar a API. IPs não autorizados recebem `403 Forbidden`.

### Expiração de Chave

Chaves API podem ter data de expiração. Chaves expiradas retornam `401 Unauthorized`.

---

## 3. Endpoints de Dados

**Base URL:**
```
https://<projeto>.supabase.co/functions/v1
```

### 3.1 POST `/autenticar`

Autentica um servidor por matrícula e CPF. Retorna JWT + dados funcionais.

**Request:**
```json
{
  "matricula": "12345",
  "cpf": "12345678901"
}
```

**Response (200):**
```json
{
  "sucesso": true,
  "token": "eyJhbGci...",
  "servidor": {
    "nome": "João da Silva",
    "matricula": "12345",
    "cargo": "Analista",
    "lotacao": "Departamento de Tecnologia da Informação",
    "vinculo": "Efetivo",
    "data_admissao": "2020-01-15"
  }
}
```

### 3.2 GET `/autenticar`

Health check — verifica se a API está online. Não requer autenticação.

**Response (200):**
```json
{
  "status": "online",
  "versao": "1.0"
}
```

### 3.3 POST `/consultar-servidor`

Consulta dados funcionais de um servidor sem gerar JWT.

**Request:**
```json
{
  "matricula": "12345",
  "cpf": "12345678901"
}
```

**Response (200):**
```json
{
  "sucesso": true,
  "servidor": {
    "nome": "João da Silva",
    "matricula": "12345",
    "cargo": "Analista",
    "lotacao": "Departamento de Tecnologia da Informação",
    "vinculo": "Efetivo",
    "data_admissao": "2020-01-15",
    "carga_horaria_semanal": 40
  }
}
```

### 3.4 POST `/buscar-servidores`

Busca paginada de servidores com filtros opcionais.

**Request:**
```json
{
  "nome": "João",
  "lotacao": "Tecnologia",
  "cargo": "Analista",
  "vinculo": "Efetivo",
  "page": 1,
  "per_page": 20
}
```

> Todos os campos são opcionais. `nome` e `lotacao` usam busca parcial (ILIKE).

**Response (200):**
```json
{
  "sucesso": true,
  "servidores": [
    {
      "nome": "João da Silva",
      "matricula": "12345",
      "cargo": "Analista",
      "lotacao": "Departamento de Tecnologia da Informação",
      "vinculo": "Efetivo"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20,
  "total_pages": 1
}
```

### 3.5 GET `/listar-lotacoes`

Retorna todas as lotações padronizadas com a contagem de servidores ativos.

**Response (200):**
```json
{
  "sucesso": true,
  "lotacoes": [
    { "nome": "Departamento de Tecnologia da Informação", "total_servidores": 15 },
    { "nome": "Diretoria Administrativa", "total_servidores": 42 }
  ],
  "total": 2
}
```

### 3.6 GET `/estatisticas`

Retorna métricas institucionais agregadas.

**Response (200):**
```json
{
  "sucesso": true,
  "total_servidores": 850,
  "por_vinculo": {
    "Efetivo": 500,
    "Comissionado": 200,
    "Contratado": 150
  },
  "por_lotacao": {
    "Diretoria Administrativa": 42,
    "Departamento de TI": 15
  },
  "admissoes_mes": 5,
  "demissoes_mes": 2
}
```

---

## 4. Fluxo SSO — Autenticação Centralizada

O SSO permite que sistemas externos autentiquem servidores sem gerenciar credenciais.

### Diagrama do Fluxo

```
Sistema Externo                          Plataforma (IdP)
───────────────                          ────────────────
[Botão "Entrar"]  ──redirect──→  /sso/validar?client_id=XXX&redirect_uri=YYY
                                         │
                                    ┌────▼─────────────┐
                                    │ Tela 1: Validação │
                                    │ Matrícula + CPF   │
                                    └────┬─────────────┘
                                         │
                                    ┌────▼──────────────────┐
                                    │ Primeiro acesso?       │
                                    │ SIM → Cadastro (email  │
                                    │       + senha)         │
                                    │ NÃO → Login (email    │
                                    │       + senha)         │
                                    └────┬──────────────────┘
                                         │
  ←──redirect com código──────────  callback?code=ABC123
         │
  Troca código por token
  via POST /sso-token
```

### 4.1 POST `/sso-validar`

Valida se o servidor existe na base de dados.

**Request:**
```json
{
  "matricula": "12345",
  "cpf": "12345678901",
  "client_id": "sua_api_key",
  "redirect_uri": "https://sistema-externo.gov.br/callback"
}
```

**Response (200):**
```json
{
  "sucesso": true,
  "servidor_encontrado": true,
  "conta_existente": false,
  "servidor_id": "uuid",
  "nome": "João da Silva",
  "sistema_nome": "Biblioteca Digital",
  "email_cadastrado": null
}
```

### 4.2 POST `/sso-registrar`

Cadastra email e senha para primeiro acesso do servidor.

**Request:**
```json
{
  "matricula": "12345",
  "cpf": "12345678901",
  "email": "joao@camara.gov.br",
  "senha": "SenhaSegura123!",
  "client_id": "sua_api_key",
  "redirect_uri": "https://sistema-externo.gov.br/callback"
}
```

**Response (200):**
```json
{
  "sucesso": true,
  "redirect_url": "https://sistema-externo.gov.br/callback?code=abc123..."
}
```

### 4.3 POST `/sso-login`

Login com email e senha para servidores já cadastrados.

**Request:**
```json
{
  "email": "joao@camara.gov.br",
  "senha": "SenhaSegura123!",
  "client_id": "sua_api_key",
  "redirect_uri": "https://sistema-externo.gov.br/callback"
}
```

**Response (200):**
```json
{
  "sucesso": true,
  "redirect_url": "https://sistema-externo.gov.br/callback?code=abc123..."
}
```

### 4.4 POST `/sso-token`

Troca o código de autorização por um token JWT com dados do servidor. **Esta chamada deve ser feita server-side.**

**Request:**
```json
{
  "code": "abc123...",
  "client_id": "sua_api_key"
}
```

**Response (200):**
```json
{
  "sucesso": true,
  "token": "eyJhbGci...",
  "servidor": {
    "nome": "João da Silva",
    "matricula": "12345",
    "email": "joao@camara.gov.br",
    "cargo": "Analista",
    "lotacao": "Departamento de Tecnologia da Informação",
    "vinculo": "Efetivo"
  }
}
```

---

## 5. Exemplos de Integração

### 5.1 cURL

```bash
# Autenticar servidor
curl -X POST https://<projeto>.supabase.co/functions/v1/autenticar \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_chave_api" \
  -d '{"matricula": "12345", "cpf": "12345678901"}'

# Buscar servidores
curl -X POST https://<projeto>.supabase.co/functions/v1/buscar-servidores \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_chave_api" \
  -d '{"nome": "João", "page": 1, "per_page": 10}'

# Listar lotações
curl -X GET https://<projeto>.supabase.co/functions/v1/listar-lotacoes \
  -H "X-API-Key: sua_chave_api"

# Estatísticas
curl -X GET https://<projeto>.supabase.co/functions/v1/estatisticas \
  -H "X-API-Key: sua_chave_api"
```

### 5.2 JavaScript (fetch)

```javascript
const BASE_URL = "https://<projeto>.supabase.co/functions/v1";
const API_KEY = "sua_chave_api";

// Autenticar
const response = await fetch(`${BASE_URL}/autenticar`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  },
  body: JSON.stringify({ matricula: "12345", cpf: "12345678901" }),
});
const data = await response.json();
console.log(data.token, data.servidor);

// Buscar servidores com paginação
const busca = await fetch(`${BASE_URL}/buscar-servidores`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  },
  body: JSON.stringify({ nome: "Maria", page: 1, per_page: 20 }),
});
const resultado = await busca.json();
console.log(resultado.servidores, resultado.total_pages);

// Listar lotações
const lotacoes = await fetch(`${BASE_URL}/listar-lotacoes`, {
  headers: { "X-API-Key": API_KEY },
});
const dadosLotacoes = await lotacoes.json();

// Estatísticas
const stats = await fetch(`${BASE_URL}/estatisticas`, {
  headers: { "X-API-Key": API_KEY },
});
const dadosStats = await stats.json();
```

### 5.3 Python (requests)

```python
import requests

BASE_URL = "https://<projeto>.supabase.co/functions/v1"
HEADERS = {
    "Content-Type": "application/json",
    "X-API-Key": "sua_chave_api",
}

# Autenticar
resp = requests.post(f"{BASE_URL}/autenticar", json={
    "matricula": "12345",
    "cpf": "12345678901"
}, headers=HEADERS)
dados = resp.json()
print(dados["token"], dados["servidor"])

# Buscar servidores
resp = requests.post(f"{BASE_URL}/buscar-servidores", json={
    "nome": "Maria",
    "lotacao": "Tecnologia",
    "page": 1,
    "per_page": 20
}, headers=HEADERS)
resultado = resp.json()
for servidor in resultado["servidores"]:
    print(servidor["nome"], servidor["lotacao"])

# Listar lotações
resp = requests.get(f"{BASE_URL}/listar-lotacoes", headers=HEADERS)
for lotacao in resp.json()["lotacoes"]:
    print(f"{lotacao['nome']}: {lotacao['total_servidores']} servidores")

# Estatísticas
resp = requests.get(f"{BASE_URL}/estatisticas", headers=HEADERS)
stats = resp.json()
print(f"Total: {stats['total_servidores']}")
```

### 5.4 Integração SSO (Sistema Externo)

```html
<!-- Botão no sistema externo -->
<a href="https://plataforma.gov.br/sso/validar?client_id=SUA_API_KEY&redirect_uri=https://meusistema.gov.br/callback">
  Entrar com Câmara Municipal
</a>
```

```javascript
// Callback no sistema externo (server-side)
app.get("/callback", async (req, res) => {
  const { code } = req.query;

  const response = await fetch(
    "https://<projeto>.supabase.co/functions/v1/sso-token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code,
        client_id: "SUA_API_KEY",
      }),
    }
  );

  const data = await response.json();
  if (data.sucesso) {
    // Criar sessão local com os dados do servidor
    req.session.user = data.servidor;
    req.session.token = data.token;
    res.redirect("/dashboard");
  } else {
    res.redirect("/login?error=sso_failed");
  }
});
```

---

## 6. Códigos de Erro

| Código | Significado | Causa Comum |
|---|---|---|
| `200` | Sucesso | Requisição processada corretamente |
| `400` | Requisição Inválida | Campos obrigatórios ausentes ou formato incorreto |
| `401` | Não Autorizado | API Key inválida, expirada ou ausente |
| `403` | Proibido | Sistema inativo, IP não autorizado ou redirect_uri não permitida |
| `404` | Não Encontrado | Servidor não encontrado com matrícula/CPF informados |
| `405` | Método Não Permitido | Método HTTP incorreto (ex: GET em endpoint POST) |
| `429` | Muitas Requisições | Rate limit excedido (aguarde 1 minuto) |
| `500` | Erro Interno | Erro inesperado no servidor (contate o suporte) |

### Formato Padrão de Erro

```json
{
  "sucesso": false,
  "mensagem": "Descrição do erro em português"
}
```

---

## 7. Boas Práticas

### Segurança
- **Nunca exponha a API Key no frontend.** Use-a apenas no backend (server-side).
- **Armazene a chave em variáveis de ambiente**, não no código-fonte.
- **Configure a lista de IPs autorizados** em produção.
- **Monitore o uso** pelo painel de métricas do sistema integrado.

### Performance
- **Implemente cache** nas consultas de lotações e estatísticas (TTL sugerido: 5 minutos).
- **Use paginação** ao buscar servidores (`per_page` máximo recomendado: 50).
- **Evite polling excessivo** — respeite o rate limit configurado.

### Integração SSO
- **Registre todas as redirect_uris** no painel administrativo antes de usar.
- **A troca do código por token deve ser server-side** — nunca exponha o `client_id` em JavaScript no navegador.
- **Códigos de autorização expiram em 5 minutos** e são de uso único.
- **Tokens JWT expiram em 1 hora** — implemente renovação quando necessário.

### Tratamento de Erros
- Sempre verifique o campo `sucesso` na resposta.
- Implemente retry com backoff exponencial para erros 429 e 500.
- Registre erros em log para diagnóstico.

---

## Suporte

Para dúvidas ou problemas com a integração, entre em contato com a equipe de Tecnologia da Informação da Câmara Municipal de Parauapebas.
