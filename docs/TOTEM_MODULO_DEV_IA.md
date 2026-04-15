# Modulo Do Totem

Documentacao enxuta para devs e IA sobre o estado atual do modulo do totem e as melhorias recentes no fluxo facial.

## Objetivo

Registrar o que precisa ser conhecido para manter o reconhecimento facial do totem funcionando sem quebrar o cadastro de visitantes.

## Escopo Desta Doc

- Fluxo do `totem/face`
- Dependencia entre cadastro de visitante e reconhecimento facial
- Correcao aplicada para nao perder `faceEmbedding`
- Feedback visual no cadastro de foto
- Recadastro de foto facial no perfil
- Indicadores visuais de aptidao facial

## Resumo Das Melhorias

1. O totem continua tentando reconhecer o rosto e, se falhar, faz fallback para CPF.
2. O cadastro de visitante agora mostra o resultado da geracao do embedding facial.
3. A edicao comum do visitante nao apaga mais o `faceEmbedding` existente.
4. O perfil do visitante ganhou um fluxo dedicado para `Recadastrar Foto Facial`.
5. O perfil e a listagem mostram se o visitante esta apto para reconhecimento facial.

## Regra Funcional Principal

Um visitante so deve ser considerado apto para reconhecimento facial quando possuir:

- `photo`
- `faceEmbedding` preenchido

Se faltar qualquer um dos dois, o sistema deve orientar recadastro da foto.

## Fluxo Atual

### 1. Cadastro Ou Edicao De Visitante

Arquivo principal: `frontend/src/components/VisitorFormDialog.tsx`

- Ao enviar ou capturar uma foto, o frontend tenta gerar o embedding com `face-api.js`.
- O formulario mostra status visual:
  - `processing`
  - `success`
  - `error`
- Em modo `photoOnly`, o salvamento so pode acontecer quando:
  - a foto foi alterada
  - o embedding foi gerado com sucesso

### 2. Reconhecimento No Totem

Arquivo principal: `frontend/src/pages/totem/TotemFace.tsx`

- O totem carrega os modelos do `face-api.js`.
- Captura a imagem da camera.
- Gera o descriptor localmente.
- Envia o descriptor para `POST /totem/face-match`.
- Se encontrar match, segue para o fluxo do visitante identificado.
- Se nao encontrar, redireciona para digitacao de CPF.

### 3. Match No Backend

Arquivo principal: `backend/src/controllers/totemController.ts`

- O endpoint `faceMatch` compara o descriptor recebido com `visitor.faceEmbedding`.
- O backend escolhe a menor distancia valida.
- O threshold atual esta fixo em `0.45`.
- Se a distancia for maior que o threshold, responde `matched: false`.

## Correcao Importante Aplicada

Arquivo principal: `backend/src/controllers/visitorController.ts`

Problema corrigido:

- Ao editar um visitante sem recapturar foto, o frontend podia enviar `faceEmbedding` vazio ou ausente de forma inadequada.
- Isso causava perda do embedding salvo e quebrava o reconhecimento no totem.

Comportamento atual:

- O frontend so envia `faceEmbedding` quando realmente gerou um novo embedding.
- O backend preserva o embedding atual quando a edicao nao traz um novo valor valido.

## Fluxo De Recadastro De Foto

Arquivos principais:

- `frontend/src/pages/VisitorDetails.tsx`
- `frontend/src/components/VisitorFormDialog.tsx`

Comportamento atual:

- O perfil do visitante possui o botao `Recadastrar Foto Facial`.
- Esse fluxo abre o formulario em modo `photoOnly`.
- Nesse modo, o objetivo e trocar somente a foto usada no reconhecimento.
- O usuario recebe feedback visual imediato sobre sucesso ou falha na geracao do embedding.

## Indicadores Visuais Atuais

### Perfil Do Visitante

Arquivo: `frontend/src/pages/VisitorDetails.tsx`

- Exibe alerta permanente indicando:
  - `Foto facial valida para reconhecimento`
  - `Foto facial precisa de recadastro`

Regra usada:

- valido = `photo` + `faceEmbedding`
- invalido = falta de foto ou embedding

### Listagem De Visitantes

Arquivo: `frontend/src/pages/Visitors.tsx`

- Cada card mostra um selo:
  - `Facial valido`
  - `Precisa recadastro`

## Arquivos Mais Sensiveis Deste Fluxo

- `frontend/src/pages/totem/TotemFace.tsx`
- `frontend/src/components/VisitorFormDialog.tsx`
- `frontend/src/pages/VisitorDetails.tsx`
- `frontend/src/pages/Visitors.tsx`
- `backend/src/controllers/totemController.ts`
- `backend/src/controllers/visitorController.ts`
- `backend/src/utils/vector.ts`

## Checklist Antes De Alterar

1. Confirmar se a mudanca pode impactar `faceEmbedding`.
2. Nao sobrescrever embedding existente em edicoes comuns.
3. Manter o fallback por CPF no totem.
4. Validar o modo `photoOnly` apos qualquer ajuste no cadastro.
5. Testar o perfil e a listagem quando mudar regras de status facial.

## Validacao Minima Recomendada

### Frontend

```bash
npm run build
```

### Verificacao Manual

1. Cadastrar ou recadastrar foto de um visitante.
2. Confirmar que o formulario mostra sucesso ao gerar embedding.
3. Confirmar que o perfil passa a mostrar status valido.
4. Confirmar que a listagem mostra selo `Facial valido`.
5. Testar o `totem/face`.
6. Se o match falhar, confirmar fallback para CPF.

## Regras Para IA

- Nao remover o fallback por CPF.
- Nao alterar o threshold sem justificar impacto no reconhecimento.
- Nao salvar foto nova sem tentar gerar embedding.
- Nao enviar `faceEmbedding: null` em edicoes comuns.
- Se criar novo fluxo de foto, reutilizar o `VisitorFormDialog` antes de introduzir outro componente.

## Limites Conhecidos

- O threshold de match esta fixo no backend.
- O carregamento dos modelos faciais depende da CDN publica do `face-api.js`.
- Visitantes antigos sem `faceEmbedding` continuam exigindo recadastro da foto para uso no reconhecimento facial.
