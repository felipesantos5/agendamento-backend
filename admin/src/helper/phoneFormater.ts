export const PhoneFormat = (value: string = ""): string => {
  // Adicionado valor padrão para input
  if (!value) return ""; // Retorna string vazia se o valor for nulo/undefined/vazio
  return value
    .replace(/\D/g, "") // Remove tudo que não for dígito
    .slice(0, 11) // Limita a 11 dígitos (DDD + 9 dígitos celular)
    .replace(/^(\d{2})(\d)/, "($1) $2") // Adiciona parênteses no DDD: (XX)YYYYYYYYY
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2"); // Adiciona o hífen: (XX) YYYYY-YYYY
};
