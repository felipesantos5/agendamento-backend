import axios from "axios";

// Cache em memória para armazenar os feriados por ano
const holidayCache = new Map();

/**
 * Busca feriados nacionais para um determinado ano usando a BrasilAPI.
 * Utiliza um cache para evitar múltiplas chamadas para o mesmo ano.
 * @param {number} year O ano para buscar os feriados.
 * @returns {Promise<Array<{date: string, name: string, type: string}>>} Uma lista de feriados.
 */
const getHolidaysForYear = async (year) => {
  // Se já temos os feriados para este ano no cache, retorna-os
  if (holidayCache.has(year)) {
    return holidayCache.get(year);
  }

  try {
    const response = await axios.get(`https://brasilapi.com.br/api/feriados/v1/${year}`);

    // Armazena o resultado no cache
    holidayCache.set(year, response.data);

    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar feriados para o ano ${year}:`, error.message);
    // Em caso de erro, retorna um array vazio para não quebrar a aplicação
    return [];
  }
};

/**
 * Verifica se uma data específica é um feriado.
 * @param {Date} date A data a ser verificada.
 * @returns {Promise<{isHoliday: boolean, holidayName: string | null}>}
 */
export const checkIsHoliday = async (date) => {
  const year = date.getFullYear();
  const dateString = date.toISOString().split("T")[0]; // Formato YYYY-MM-DD

  const holidays = await getHolidaysForYear(year);

  const foundHoliday = holidays.find((holiday) => holiday.date === dateString);

  if (foundHoliday) {
    return { isHoliday: true, holidayName: foundHoliday.name };
  }

  return { isHoliday: false, holidayName: null };
};
