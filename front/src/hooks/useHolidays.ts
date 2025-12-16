import { useState } from "react";

interface Holiday {
  date: string;
  name: string;
  type: string;
}

export const useHolidays = () => {
  const [holidays] = useState<Holiday[]>([]);

  const isHoliday = (date: string): boolean => {
    return holidays.some((holiday) => {
      const holidayDate = new Date(holiday.date).toISOString().split("T")[0];
      return holidayDate === date;
    });
  };

  const getHolidayName = (date: string): string | null => {
    const holiday = holidays.find((holiday) => {
      const holidayDate = new Date(holiday.date).toISOString().split("T")[0];
      return holidayDate === date;
    });
    return holiday ? holiday.name : null;
  };

  return { holidays, isHoliday, getHolidayName };
};
