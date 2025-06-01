export const PhoneFormat = (value: string) => {
  return value
    .replace(/\D/g, "")
    .slice(0, 11) // Remove tudo que não for dígito
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};
