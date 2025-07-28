/**
 * Formata um objeto Date para uma string legível em português do Brasil.
 * Exemplo de saída: "terça-feira, 17 de junho, às 14:30"
 * @param {Date} dateObject O objeto Date a ser formatado.
 * @returns {string} A data e hora formatadas.
 */
export function formatBookingTime(dateObject) {
  // Opções para formatar a data
  const dateOptions = {
    weekday: "long", // "segunda-feira"
    month: "long", // "julho"
    day: "numeric", // "28"
    timeZone: "America/Sao_Paulo",
  };

  // Opções para formatar a hora
  const timeOptions = {
    hour: "2-digit", // "19"
    minute: "2-digit", // "30"
    hour12: false,
    timeZone: "America/Sao_Paulo",
  };

  // Formata a data e a hora separadamente
  const formattedDate = new Intl.DateTimeFormat("pt-BR", dateOptions).format(
    dateObject
  );
  const formattedTime = new Intl.DateTimeFormat("pt-BR", timeOptions).format(
    dateObject
  );

  // Combina as strings no formato desejado
  return `${formattedDate}, às ${formattedTime}`;
}
