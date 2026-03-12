import { jsPDF } from 'jspdf';


// Configurações da Impressora Térmica (80mm)
const PRINTER_CONFIG = {
  width: 80, // mm
  height: 76, // mm (Altura ajustada para corte)
  margin: 2,
  contentWidth: 76, // 80 - (2*2)
};

interface PrintData {
  visitorName: string;
  department?: string;
  motive?: string;
  date: string; // ISO string
  accessCode?: string;
  checkoutTime?: string; // ISO string
  type: 'scheduling' | 'finish';
}

export const PrinterService = {
  /**
   * Gera um PDF formatado para impressora térmica 80mm
   */
  async generateTicket(data: PrintData): Promise<string> {
    // 1. Inicialização do jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [PRINTER_CONFIG.width, PRINTER_CONFIG.height],
    });

    // Configurações de fonte
    doc.setFont('courier', 'bold'); // Fonte monoespaçada simula impressora matricial/térmica
    
    let y = 5; // Posição vertical inicial
    const centerX = PRINTER_CONFIG.width / 2;
    const leftX = PRINTER_CONFIG.margin;
    const rightX = PRINTER_CONFIG.width - PRINTER_CONFIG.margin;

    // --- CABEÇALHO ---
    doc.setFontSize(10);
    doc.text('NOME DA INSTITUIÇÃO', centerX, y, { align: 'center' });
    y += 4;
    
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text('Sistema de Controle de Visitas', centerX, y, { align: 'center' });
    y += 4;

    // Linha separadora dupla (simulada com texto)
    doc.text('='.repeat(40), centerX, y, { align: 'center' });
    y += 4;

    // --- INFO BLOCK (Código e Status) ---
    doc.setFontSize(9);
    doc.setFont('courier', 'bold');
    
    // Esquerda: Código
    doc.text(`COD: ${data.accessCode || '---'}`, leftX, y);
    
    // Direita: Status
    const statusText = data.type === 'finish' ? 'FINALIZADA' : 'CONFIRMADA';
    doc.text(`STATUS: ${statusText}`, rightX, y, { align: 'right' });
    y += 4;

    // Data e Hora
    const dateObj = new Date(data.date);
    const dateStr = dateObj.toLocaleDateString('pt-BR');
    const timeStr = data.checkoutTime 
      ? new Date(data.checkoutTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text(`DATA: ${dateStr}`, leftX, y);
    doc.text(`HORA: ${timeStr}`, rightX, y, { align: 'right' });
    y += 4;

    // Separador tracejado
    doc.text('-'.repeat(48), centerX, y, { align: 'center' });
    y += 4;

    // --- VISITANTE ---
    doc.setFontSize(8);
    doc.text('VISITANTE:', leftX, y);
    y += 4;
    
    doc.setFontSize(11);
    doc.setFont('courier', 'bold');
    // Truncar nome se muito longo
    const visitorName = data.visitorName.length > 25 
      ? data.visitorName.substring(0, 25) + '...' 
      : data.visitorName;
    doc.text(visitorName, leftX, y);
    y += 4;

    // Separador tracejado
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text('-'.repeat(48), centerX, y, { align: 'center' });
    y += 4;

    // --- DETALHES DA VISITA ---
    
    // Detalhes
    doc.setFontSize(8);
    doc.setFont('courier', 'bold');
    doc.text('DEPTO:', leftX, y);
    y += 3;
    doc.setFont('courier', 'normal');
    doc.text(data.department || 'N/A', leftX, y);
    y += 4;

    doc.setFont('courier', 'bold');
    doc.text('MOTIVO:', leftX, y);
    y += 3;
    doc.setFont('courier', 'normal');
    doc.text(data.motive || 'N/A', leftX, y);
    y += 5; // Espaço extra antes do rodapé

    // Separador final
    doc.text('-'.repeat(48), centerX, y, { align: 'center' });
    y += 4;

    // --- RODAPÉ ---
    doc.setFontSize(8);
    doc.text('Apresente este comprovante', centerX, y, { align: 'center' });
    y += 4;
    
    doc.setFontSize(9);
    doc.setFont('courier', 'bold');
    doc.text('Obrigado pela sua visita!', centerX, y, { align: 'center' });
    
    // Borda final
    y += 3;
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text('='.repeat(40), centerX, y, { align: 'center' });

    // Comando para impressão automática
    doc.autoPrint();

    // Retorna Blob URL para abrir em nova janela/iframe
    return String(doc.output('bloburl'));
  },

  /**
   * Abre a janela de impressão para o Blob gerado
   */
  printBlob(blobUrl: string) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
      }, 100);
    };
  }
};
