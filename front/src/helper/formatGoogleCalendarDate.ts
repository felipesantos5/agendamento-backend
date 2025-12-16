export const formatGoogleCalendarDate = (dateStr: string, timeStr: string, durationMinutes: number): { start: string; end: string } | null => {
  try {
    // Cria a data/hora local
    const startTimeLocal = new Date(`${dateStr}T${timeStr}:00`);
    // Calcula o fim somando a duração em milissegundos
    const endTimeLocal = new Date(startTimeLocal.getTime() + durationMinutes * 60000);

    // Função interna para formatar para YYYYMMDDTHHmmssZ
    const toUTCFormat = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      const hours = String(date.getUTCHours()).padStart(2, "0");
      const minutes = String(date.getUTCMinutes()).padStart(2, "0");
      const seconds = String(date.getUTCSeconds()).padStart(2, "0");
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };

    return {
      start: toUTCFormat(startTimeLocal),
      end: toUTCFormat(endTimeLocal),
    };
  } catch (e) {
    console.error("Erro ao formatar data para Google Calendar:", e);
    return null;
  }
};
