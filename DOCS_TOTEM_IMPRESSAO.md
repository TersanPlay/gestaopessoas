# Documentação Técnica: Desenvolvimento do Módulo de Impressão do Totem

Este documento descreve a implementação técnica e o fluxo de desenvolvimento da funcionalidade de impressão de comprovantes (tíquetes) no módulo de Totem do sistema Face Auth Connect.

## 1. Visão Geral

A funcionalidade foi desenvolvida para gerar e imprimir comprovantes térmicos (80mm) diretamente do navegador, sem necessidade de drivers complexos no servidor. O foco principal é a agilidade no atendimento (Autoatendimento) e a entrega física de um comprovante com QR Code para controle de acesso.

### Principais Funcionalidades
- **Impressão de Entrada**: Comprovante com dados do visitante, destino e QR Code/Token de acesso.
- **Impressão de Saída**: Comprovante de confirmação de saída (individual ou em lote).
- **Formato**: Papel térmico 80mm (largura) x 76mm (altura ajustada).

## 2. Arquitetura e Tecnologias

A solução utiliza uma abordagem **Client-Side PDF Generation**:

*   **Biblioteca Principal**: `jspdf` (Geração de PDF no navegador).
*   **Gerador de QR Code**: `qrcode` (Renderização de QR Codes em DataURL).
*   **Componentes UI**: `shadcn/ui` (Botões, Cards, Feedback visual).
*   **Ícones**: `lucide-react`.

## 3. Estrutura de Arquivos

*   `src/services/printerService.ts`: **Core da lógica**. Contém a configuração da impressora e as funções de desenho do PDF.
*   `src/pages/totem/RegisterEntry.tsx`: Página de Registro de Entrada. Aciona a impressão após o sucesso do cadastro.
*   `src/pages/totem/RegisterExit.tsx`: Página de Registro de Saída. Gerencia a impressão em lote de comprovantes de saída.
*   `src/components/totem/`: Componentes visuais compartilhados.

## 4. Detalhes de Implementação

### 4.1. Serviço de Impressão (`PrinterService`)

O arquivo `printerService.ts` centraliza toda a lógica de formatação.

**Configuração da Impressora (`PRINTER_CONFIG`):**
Define as dimensões físicas para impressoras térmicas padrão (ex: Epson TM-T20, Bematech).
```typescript
const PRINTER_CONFIG = {
  width: 80, // mm
  height: 76, // mm (Altura fixa para corte preciso)
  margin: 2,
  contentWidth: 76, // 80 - (2*2)
  fontSize: {
    header: 10,
    token: 18 // Destaque para facilitar leitura visual
  }
};
```

**Geração do Tíquete de Entrada (`generateEntryTicket`):**
1.  **Inicialização**: Cria instância do `jsPDF` com orientação retrato e tamanho personalizado.
2.  **Cabeçalho**: Insere "SISTEMA CORPORATIVO" e "Comprovante de Entrada" centralizados.
3.  **Dados**: Posiciona Nome, Destino e Data/Hora usando coordenadas (X, Y) precisas.
4.  **QR Code e Token**:
    *   Gera o QR Code em tempo real via `QRCode.toDataURL()`.
    *   Posiciona o QR Code à esquerda e o Token (texto grande) à direita para otimizar o espaço vertical.
5.  **Finalização**: Chama `doc.autoPrint()` para abrir a caixa de diálogo de impressão automaticamente e retorna um `Blob URL`.

### 4.2. Integração no Frontend

**Fluxo de Entrada (`RegisterEntry.tsx`):**
*   O usuário preenche os dados (CPF, Destino, Motivo).
*   Após a confirmação (Step `success`), o botão "Imprimir Comprovante" fica disponível.
*   A função `generateThermalReceipt` coleta os dados do estado (`visitor`, `visit`) e chama o serviço.

```typescript
const generateThermalReceipt = async () => {
    // ... validação
    const blobUrl = await PrinterService.generateEntryTicket({
        visitorName: visitor.name,
        qrCodeToken: visit.qrCodeToken,
        // ... outros dados
    });
    PrinterService.printBlob(blobUrl);
};
```

**Fluxo de Saída (`RegisterExit.tsx`):**
*   Permite selecionar múltiplas visitas para encerramento.
*   A função `generateThermalReceipt` itera sobre os itens selecionados.
*   O `PrinterService.generateExitReport` cria um PDF multipáginas (`doc.addPage()`) se houver mais de um comprovante.

## 5. Desafios e Soluções

| Desafio | Solução |
| :--- | :--- |
| **Tamanho do Papel** | Definido formato customizado `[80, 76]` no jsPDF para evitar desperdício de papel e garantir corte correto. |
| **Qualidade do QR Code** | Uso da lib `qrcode` com `errorCorrectionLevel: 'M'` e tamanho aumentado antes de inserir no PDF. |
| **Impressão Automática** | Inclusão do comando `doc.autoPrint()` no script do PDF, que sugere a impressão imediata ao navegador. |
| **Layout Responsivo** | Grid manual (X, Y) calculado com base em constantes para garantir alinhamento perfeito na impressora térmica. |

## 6. Como Testar

1.  Acesse o Totem (`/totem`).
2.  Realize um fluxo completo de entrada.
3.  Na tela de confirmação, clique em "Imprimir Comprovante".
4.  Uma nova janela/aba abrirá com o PDF gerado e a caixa de impressão do sistema operacional.

---
**Observação**: Para funcionamento ideal em produção (Totem), recomenda-se configurar o navegador (Chrome/Edge) em modo "Kiosk Printing" para pular a caixa de diálogo de confirmação de impressão.
