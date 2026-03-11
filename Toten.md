Modo Tóten — Modelo Final de Telas

Este documento descreve o fluxo completo do Modo Tóten, cobrindo agendamento de visita e finalização de visita, com foco em UX simples, uso por toque (touch) e retorno automático à tela inicial.

🟢 Tela 1 — Boas-vindas

Objetivo: permitir que o visitante escolha a ação principal.

Conteúdo

Logo da instituição

Mensagem de boas-vindas (ex.: “Bem-vindo! Escolha uma opção para continuar”)

Botões (grandes, touch-friendly)

📅 Agendamento

✅ Finalizar Visita

Regras

Ao tocar em um botão, navega para a tela correspondente

Sem timeout nesta tela

🔵 Fluxo A — Agendamento de Visita
🟦 Tela 2 — Identificação do Visitante (CPF)

Objetivo: identificar o visitante já cadastrado.

Conteúdo

Texto de instrução: “Digite seu CPF para continuar”

Campo de input numérico (CPF)

Teclado numérico na tela (touch)

Validações

Máscara de CPF (###.###.###-##)

CPF inválido → mensagem de erro

CPF não cadastrado → mensagem:

❌ CPF não encontrado. Procure a recepção.

Ação

CPF válido → avançar para Tela 3

🟦 Tela 3 — Dados do Visitante

Objetivo: confirmar identidade e coletar dados da visita.

Conteúdo exibido

Nome completo

CPF mascarado (..***-12)

Telefone

E-mail

Campos interativos

Departamento (select)

Motivo da visita (select)

Ações

Botão ⬅ Voltar

Botão ➡ Continuar (habilitado somente após seleção dos campos)

🟦 Tela 4 — Confirmação da Visita

Objetivo: revisão final antes de confirmar.

Conteúdo

Dados do visitante

Departamento escolhido

Motivo da visita

Data e hora do agendamento

Ações

Botão ⬅ Voltar

Botão ✅ Confirmar Visita

🟦 Tela 5 — Visita Confirmada

Objetivo: feedback visual e encerramento do fluxo.

Conteúdo

Ícone de sucesso (✔)

Mensagem destacada:

🎉 Visita confirmada com sucesso!

Ações automáticas

Impressão automática do comprovante

Exibição por 10 segundos

Redirecionamento automático para Tela 1 (Boas-vindas)

🟣 Fluxo B — Finalizar Visita
🟪 Tela 3B — Finalização de Visita

Objetivo: permitir encerrar uma visita ativa.

Conteúdo

Texto de instrução:

“Digite seu CPF ou Código de Acesso”

Campo de input numérico

Teclado numérico na tela

Regras

Aceita:

CPF

Código de acesso (ex.: 242543)

Validações

Não encontrado → mensagem:

❌ CPF ou código inválido.

Visita já finalizada → mensagem apropriada

Ação

Dados válidos → exibir tela de confirmação (pode reutilizar Tela 4)

🔁 Comportamentos Globais do Tóten

⏱ Timeout de inatividade (ex.: 300s → volta para Tela 1)

🎯 Botões grandes (mín. 48px)

🧼 Interface moderna seguindo o designer System, sem excesso de texto

♿ Suporte total a touch

🔐 Sem exibição de dados sensíveis completos

✅ Resultado Esperado

Fluxo simples e intuitivo

Redução de erros no tóten

Agilidade no atendimento

Experiência segura para o visitante

================================================
           NOME DA INSTITUIÇÃO
       Sistema de Controle de Visitas
================================================
CÓDIGO DE ACESSO: 483920 STATUS: CONFIRMADA
DATA: 28/01/2026 HORA: 14:32
-----------------------------------------------
VISITANTE: JOÃO DA SILVA
-----------------------------------------------
VISITA: DEPTO.: RECURSOS HUMANOS
MOTIVO: ENTREVISTA
-----------------------------------------------
   Apresente este comprovante se necessário
        Obrigado pela sua visita!
================================================
