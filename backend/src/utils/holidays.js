import Holidays from 'date-holidays';

class BrazilianHolidays {
  constructor() {
    this.hd = new Holidays('BR');
  }

  // Verifica se uma data é feriado
  isHoliday(date) {
    const holidays = this.hd.getHolidays(date.getFullYear());
    const dateString = date.toISOString().split('T')[0];
    
    return holidays.some(holiday => {
      const holidayDate = new Date(holiday.date).toISOString().split('T')[0];
      return holidayDate === dateString;
    });
  }

  // Retorna o nome do feriado (se houver)
  getHolidayName(date) {
    const holidays = this.hd.getHolidays(date.getFullYear());
    const dateString = date.toISOString().split('T')[0];
    
    const holiday = holidays.find(holiday => {
      const holidayDate = new Date(holiday.date).toISOString().split('T')[0];
      return holidayDate === dateString;
    });

    return holiday ? holiday.name : null;
  }

  // Lista todos os feriados de um ano
  getYearHolidays(year) {
    return this.hd.getHolidays(year);
  }
}

export default new BrazilianHolidays();