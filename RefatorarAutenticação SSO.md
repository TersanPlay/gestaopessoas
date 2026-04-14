Implemente autenticação institucional DIRETAMENTE no meu sistema web, consumindo a API SSO da Câmara Municipal de Parauapebas. Todo o fluxo deve ocorrer dentro do próprio sistema — sem redirecionar o usuário para interfaces externas.

## Conceito

O sistema externo é responsável por:
- Exibir sua própria interface de autenticação (login e primeiro acesso)
- Gerenciar o fluxo completo de login e cadastro
- Consumir a API de autenticação institucional via chamadas HTTP
- Controlar a navegação do usuário internamente

## Dados de Configuração

- **Base URL da API:** https://syqqkqdvyxkyqqniguds.supabase.co/functions/v1
- **API Key (client_id):** b2933c35e78c08e38697919332020fa62032770f490c633a1810fa7d92c256b4
- **Sistema:** Sistema Gestão

## Fluxo 1 — Login Padrão (usuário já cadastrado)

### Tela de Login

O sistema deve exibir uma tela com:
- Campo de **e-mail** (e-mail institucional @parauapebas.pa.leg.br)
- Campo de **senha**
- Link para "Primeiro Acesso"

### Chamada à API

```
POST https://syqqkqdvyxkyqqniguds.supabase.co/functions/v1/sso-login
Content-Type: application/json

{
  "email": "servidor@parauapebas.pa.leg.br",
  "senha": "senha_do_servidor",
  "client_id": "b2933c35e78c08e38697919332020fa62032770f490c633a1810fa7d92c256b4"
}
```

> **Nota:** O campo `redirect_uri` é **opcional**. Se omitido, a API retorna o código diretamente no JSON. Se informado, retorna uma `redirect_url` montada.

### Resposta de sucesso (sem redirect_uri):
```json
{
  "sucesso": true,
  "code": "CODIGO_DE_AUTORIZACAO"
}
```

### Resposta de sucesso (com redirect_uri):
```json
{
  "sucesso": true,
  "redirect_url": "https://seu-sistema.gov.br/callback?code=CODIGO"
}
```

### Após receber o código, trocar por token (SERVER-SIDE):

```
POST https://syqqkqdvyxkyqqniguds.supabase.co/functions/v1/sso-token
Content-Type: application/json

{
  "code": "[CODIGO_RECEBIDO]",
  "client_id": "b2933c35e78c08e38697919332020fa62032770f490c633a1810fa7d92c256b4"
}
```

### Resposta com dados do servidor:
```json
{
  "sucesso": true,
  "token": "eyJhbGci...",
  "servidor": {
    "nome": "Nome Completo",
    "matricula": "12345",
    "email": "nome@parauapebas.pa.leg.br",
    "cargo": "Cargo do Servidor",
    "lotacao": "Setor de Lotação",
    "vinculo": "Efetivo",
    "data_admissao": "2020-01-15",
    "carga_horaria_semanal": 40
  }
}
```

## Fluxo 2 — Primeiro Acesso (Validação Institucional)

O sistema deve oferecer uma opção de **"Primeiro Acesso"** ou **"Ainda não tenho conta"**.

### Etapa 2.1 — Validação por Matrícula e CPF

Tela com:
- Campo de **Matrícula**
- Campo de **CPF**

```
POST https://syqqkqdvyxkyqqniguds.supabase.co/functions/v1/sso-validar
Content-Type: application/json

{
  "matricula": "12345",
  "cpf": "000.000.000-00",
  "client_id": "b2933c35e78c08e38697919332020fa62032770f490c633a1810fa7d92c256b4"
}
```

> **Nota:** O campo `redirect_uri` é **opcional** neste endpoint.

### Resposta:
```json
{
  "sucesso": true,
  "servidor_encontrado": true,
  "conta_existente": false,
  "servidor_id": "uuid-do-servidor",
  "nome": "Nome do Servidor",
  "sistema_nome": "Sistema Gestão",
  "email_cadastrado": null
}
```

### Etapa 2.2 — Tratamento dos cenários

**Cenário A — `conta_existente: true`:**
- Informar ao usuário: "Você já possui cadastro com o e-mail [email_cadastrado]"
- Redirecionar para a tela de login padrão

**Cenário B — `conta_existente: false`:**
- Exibir formulário de cadastro com:
  - Campo de **E-mail** (sugestão: usar @parauapebas.pa.leg.br)
  - Campo de **Senha** (mínimo 6 caracteres)
  - Campo de **Confirmar Senha**

### Etapa 2.3 — Registro da conta

```
POST https://syqqkqdvyxkyqqniguds.supabase.co/functions/v1/sso-registrar
Content-Type: application/json

{
  "servidor_id": "[ID_DO_SERVIDOR]",
  "matricula": "12345",
  "cpf": "000.000.000-00",
  "email": "servidor@parauapebas.pa.leg.br",
  "senha": "senha_escolhida",
  "client_id": "b2933c35e78c08e38697919332020fa62032770f490c633a1810fa7d92c256b4"
}
```

> **Nota:** O campo `redirect_uri` é **opcional**. Se omitido, a API retorna o código diretamente.

### Resposta de sucesso:
```json
{
  "sucesso": true,
  "code": "CODIGO_DE_AUTORIZACAO"
}
```

Após o registro, trocar o código por token usando o mesmo endpoint `/sso-token` descrito no Fluxo 1.

## Regras de Segurança (OBRIGATÓRIAS)

1. **A API Key (client_id) NUNCA deve ser exposta no frontend** — usar apenas no backend
2. **Todas as chamadas à API devem ser feitas SERVER-SIDE** (Node.js, Python, PHP, etc.)
3. **O código de autorização expira em 5 minutos** e é de uso único
4. **O token JWT expira em 1 hora**
5. **A redirect_uri é OPCIONAL** — se informada, deve ser pré-registrada no painel administrativo
6. **Emails SSO usam exclusivamente o domínio @parauapebas.pa.leg.br**
7. **CPF deve ser sanitizado** (remover pontuação) antes de enviar à API

## O que implementar

### Páginas/Telas:
1. **Tela de Login** — campos de e-mail e senha + link "Primeiro Acesso"
2. **Tela de Primeiro Acesso** — campos de matrícula e CPF
3. **Tela de Cadastro** — campos de e-mail, senha e confirmação (exibida apenas quando `conta_existente: false`)
4. **Tela de Sucesso/Redirecionamento** — após autenticação bem-sucedida

### Backend:
1. **Endpoint de login** — recebe e-mail/senha → chama `/sso-login` → troca código por token via `/sso-token`
2. **Endpoint de validação** — recebe matrícula/CPF → chama `/sso-validar`
3. **Endpoint de registro** — recebe dados de cadastro → chama `/sso-registrar` → troca código por token
4. **Criação de sessão local** com os dados do servidor retornados
5. **Logout** que limpa a sessão local

## Tratamento de Erros

| Cenário | Ação |
|---|---|
| `sucesso: false` no login | Exibir "E-mail ou senha incorretos" |
| `servidor_encontrado: false` na validação | Exibir "Servidor não encontrado. Verifique matrícula e CPF" |
| `conta_existente: true` na validação | Informar e-mail cadastrado e redirecionar para login |
| Código expirado no `/sso-token` | Exibir "Sessão expirada. Faça login novamente" |
| Erro de rede/timeout | Exibir "Erro de comunicação. Tente novamente" |

## Diferença para o SSO com Redirecionamento

| Aspecto | SSO com Redirect (Prompt 1) | SSO Direto (Este Prompt) |
|---|---|---|
| Interface de login | Plataforma IdP | Sistema externo |
| Redirecionamento | Sim (para plataforma) | Não |
| Controle da UX | Plataforma | Sistema externo |
| Complexidade | Menor (1 redirect) | Maior (3 endpoints) |
| Personalização | Limitada | Total |