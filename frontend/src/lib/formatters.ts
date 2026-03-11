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
