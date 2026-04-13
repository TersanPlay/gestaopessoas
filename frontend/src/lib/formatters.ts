export const maskDocument = (value: string | undefined | null) => {
  if (!value) return '';
  
  // Remove formatting chars to check length
  const digits = value.replace(/\D/g, '');
  
  // CPF (11 digits)
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.***.***-$4');
  }
  
  // CNPJ (14 digits)
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.***.***/$4-$5');
  }

  // RG or other (variable length, usually 7-10)
  // Just show first 3 and last 2, with *** in between
  if (value.length > 5) {
     return value.substring(0, 3) + '****' + value.substring(value.length - 2);
  }
  
  return value;
};

export const formatCpf = (value: string | undefined | null) => {
  if (!value) return '-';

  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return value;

  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
};

export const formatCpfInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export const formatDateLabel = (value: string | undefined | null) => {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('pt-BR');
};

export const formatWhatsAppPhone = (phone: string | undefined | null) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 11) {
    return `55${digits}`;
  }
  return digits;
};

export const generateWhatsAppLink = (
  phone: string | undefined | null,
  visit: {
    visitorName: string;
    departmentName: string;
    date: string;
    accessCode: string;
    motive: string;
  }
) => {
  const formattedPhone = formatWhatsAppPhone(phone);
  if (!formattedPhone) return '';

  const dateStr = visit.date ? new Date(visit.date).toLocaleString('pt-BR') : 'Data não informada';
  
  const text = `*Confirmação de Agendamento de Visita* 🏢\n\n` +
    `Olá *${visit.visitorName}*,\nSua visita foi agendada com sucesso!\n\n` +
    `*Detalhes da Visita:*\n` +
    `📍 *Local:* ${visit.departmentName}\n` +
    `📅 *Data/Hora:* ${dateStr}\n` +
    `🔑 *Código de Acesso:* ${visit.accessCode}\n` +
    `📝 *Motivo:* ${visit.motive}\n\n` +
    `Apresente este código na portaria para liberar seu acesso.`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
};
