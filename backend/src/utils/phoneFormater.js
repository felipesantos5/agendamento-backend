export function formatPhoneNumber(phone) {
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  // Verifica se o número tem 11 dígitos (DDD + 9 dígitos)
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  // Caso contrário, retorna o número original
  return phone;
}