/**
 * Formata um objeto Date para uma string legível em português do Brasil.
 * Exemplo de saída: "terça-feira, 17 de junho de 2025, às 14:30"
 * @param {Date} dateObject O objeto Date a ser formatado.
 * @returns {string} A data e hora formatadas.
 */
export function formatBookingTime(dateObject) {
  // Opções para formatar a data e hora
  const options = {
    weekday: "long", // "terça-feira"
    year: "numeric", // "2025"
    month: "long", // "junho"
    day: "numeric", // "17"
    hour: "2-digit", // "14"
    minute: "2-digit", // "30"
    hour12: false, // Formato 24h
    timeZone: "America/Sao_Paulo", // ESSENCIAL para garantir o fuso horário correto!
  };

  // Cria a string inicial, ex: "terça-feira, 17 de junho de 2025 14:30"
  const formattedString = new Intl.DateTimeFormat("pt-BR", options).format(dateObject);

  // Um pequeno truque para deixar a frase mais natural, trocando o último espaço por ", às "
  const lastSpaceIndex = formattedString.lastIndexOf(" ");
  if (lastSpaceIndex !== -1) {
    return formattedString.substring(0, lastSpaceIndex) + ", às" + formattedString.substring(lastSpaceIndex);
  }

  return formattedString;
}
