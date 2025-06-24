import brazilianHolidays from '../utils/holidays.js';

export const checkHolidayAvailability = (req, res, next) => {
  try {
    const { time } = req.body;
    const bookingDate = new Date(time);
    
    // Remove a parte do horário para verificar apenas a data
    const dateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    
    if (brazilianHolidays.isHoliday(dateOnly)) {
      const holidayName = brazilianHolidays.getHolidayName(dateOnly);
      return res.status(400).json({
        error: `Agendamentos não são permitidos em feriados. Data selecionada: ${holidayName}`,
        holiday: holidayName,
        date: dateOnly.toISOString().split('T')[0]
      });
    }
    
    next();
  } catch (error) {
    console.error('Erro ao verificar feriado:', error);
    next(); // Continue mesmo com erro para não quebrar o fluxo
  }
};