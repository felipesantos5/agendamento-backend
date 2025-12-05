export const dateFormatter = (dateString: string) => {
  const date = new Date(dateString);

  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    return "Data inválida";
  }

  // Retornar apenas a data no formato brasileiro
  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
};
