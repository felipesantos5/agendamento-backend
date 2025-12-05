export const CepFormat = (value: string = ""): string => {
  if (!value) return ""; // Retorna string vazia se o valor for nulo/undefined/vazio

  const cleaned = value.replace(/\D/g, ""); // Remove todos os não dígitos

  // Limita a 8 dígitos
  const cepDigits = cleaned.slice(0, 8);

  if (cepDigits.length > 5) {
    return `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`;
  }
  return cepDigits; // Retorna os dígitos se ainda não tiver 5 para o hífen
};
