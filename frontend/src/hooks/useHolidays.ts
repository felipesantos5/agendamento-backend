import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '@/config/BackendUrl';

interface Holiday {
  date: string;
  name: string;
  type: string;
}

export const useHolidays = (year: number) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHolidays = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/holidays/holidays/${year}`);
        console.log('response.data.holidays',response.data.holidays)
        setHolidays(response.data.holidays);
      } catch (error) {
        console.error('Erro ao buscar feriados:', error);
        setHolidays([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHolidays();
  }, [year]);

  const isHoliday = (date: string): boolean => {
    return holidays.some(holiday => {
      const holidayDate = new Date(holiday.date).toISOString().split('T')[0];
      return holidayDate === date;
    });
  };

  const getHolidayName = (date: string): string | null => {
    const holiday = holidays.find(holiday => {
      const holidayDate = new Date(holiday.date).toISOString().split('T')[0];
      return holidayDate === date;
    });
    return holiday ? holiday.name : null;
  };

  return { holidays, loading, isHoliday, getHolidayName };
};