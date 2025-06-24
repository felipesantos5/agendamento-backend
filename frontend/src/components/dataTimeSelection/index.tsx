import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/config/BackendUrl";
import { useHolidays } from "@/hooks/useHolidays";
import { Spinner } from "../ui/spinnerLoading";

interface TimeSlot {
  time: string;
  isBooked: boolean;
}

interface ApiResponse {
  isHoliday: boolean;
  holidayName?: string;
  slots: TimeSlot[];
}

interface DateTimeSelectionProps {
  formData: {
    date: string;
    time: string;
    [key: string]: string;
  };
  updateFormData: (data: Partial<{ date: string; time: string }>) => void;
  barbershopId: string | undefined;
  selectedBarber: string | undefined;
  selectedServiceId: string | undefined;
}

export default function DateTimeSelection({ formData, updateFormData, barbershopId, selectedBarber, selectedServiceId }: DateTimeSelectionProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [holidayMessage, setHolidayMessage] = useState<string | null>(null);

  const { isHoliday, getHolidayName } = useHolidays(currentMonth.getFullYear());

  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (formData.date && selectedBarber && barbershopId) {
        setLoadingTimes(true);
        setTimeSlots([]);
        setHolidayMessage(null);

        try {
          const response = await axios.get(`${API_BASE_URL}/barbershops/${barbershopId}/barbers/${selectedBarber}/free-slots`, {
            params: { date: formData.date, serviceId: selectedServiceId },
          });

          const data: ApiResponse = response.data;

          if (data.isHoliday) {
            setHolidayMessage(`Esta data é feriado: ${data.holidayName}`);
            setTimeSlots([]);
          } else {
            setTimeSlots(data.slots || response.data); // Compatibilidade com resposta antiga
          }
        } catch (error) {
          console.error("Erro ao buscar horários:", error);
        } finally {
          setLoadingTimes(false);
        }
      } else {
        setTimeSlots([]);
        setHolidayMessage(null);
      }
    };
    fetchTimeSlots();
  }, [formData.date, selectedBarber, barbershopId, selectedServiceId]);

  const filteredAndVisibleSlots = useMemo(() => {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (formData.date !== todayString) {
      return timeSlots;
    }

    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    return timeSlots.filter((slot) => {
      const [slotHour, slotMinute] = slot.time.split(":").map(Number);
      const slotTimeInMinutes = slotHour * 60 + slotMinute;
      return slotTimeInMinutes > currentTimeInMinutes;
    });
  }, [timeSlots, formData.date]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const days = Array(firstDayOfMonth)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleDateSelect = (day: number) => {
    const selectedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (isHoliday(selectedDate)) {
      const holidayName = getHolidayName(selectedDate);
      alert(`Esta data é feriado (${holidayName}) e não está disponível para agendamento.`);
      return;
    }

    updateFormData({ date: selectedDate, time: "" });
  };

  const isDateInPast = (day: number) => {
    const today = new Date();
    const selectedDate = new Date(year, month, day);
    return selectedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const isDayHoliday = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return isHoliday(dateString);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Escolha a Data e Hora</h2>
        <p className="mt-1 text-sm text-gray-500">Selecione quando você gostaria de nos visitar</p>
      </div>

      <div className="lg:flex gap-8 md:min-h-[450px]">
        <div className="space-y-4 lg:w-full">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm md:text-base font-medium text-gray-700">
              <Calendar className="mr-2 h-4 w-4" />
              Selecione a Data
            </label>
            <div className="flex items-center space-x-2">
              <button type="button" onClick={handlePrevMonth} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 cursor-pointer">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm md:text-base font-medium">
                {monthNames[month]} {year}
              </span>
              <button type="button" onClick={handleNextMonth} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 cursor-pointer">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="grid grid-cols-7 bg-gray-50 text-center">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div key={day} className="py-2 text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {days.map((day, index) => (
                <div key={index} className={`bg-white p-2 ${!day ? "cursor-default" : "cursor-pointer"}`}>
                  {day && (
                    <button
                      type="button"
                      disabled={isDateInPast(day) || isDayHoliday(day)} // ✅ NOVO: Desabilitar feriados
                      onClick={() => handleDateSelect(day)}
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full cursor-pointer text-sm relative ${
                        isDateInPast(day) || isDayHoliday(day) // ✅ NOVO: Estilo para feriados
                          ? "!cursor-not-allowed text-gray-300 bg-red-50" // ✅ NOVO: Fundo vermelho claro para feriados
                          : formData.date === `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                          ? "bg-[var(--loja-theme-color)] text-white"
                          : "hover:bg-[var(--loja-theme-color)]/30"
                      }`}
                      title={
                        isDayHoliday(day)
                          ? `Feriado: ${getHolidayName(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`)}`
                          : undefined
                      } // ✅ NOVO: Tooltip para feriados
                    >
                      {day}
                      {/* ✅ NOVO: Indicador visual para feriados */}
                      {isDayHoliday(day) && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 mt-4 lg:mt-0 lg:w-full">
          <label className="flex items-center text-sm md:text-base font-medium text-gray-700">
            <Clock className="mr-2 h-4 w-4" />
            Selecione o Horário
          </label>

          {!selectedBarber && <p className="text-xs text-[var(--loja-theme-color)]">Por favor, selecione um barbeiro na etapa anterior.</p>}
          {!formData.date && selectedBarber && <p className="text-sm text-gray-500 md:text-base">Por favor, selecione uma data primeiro.</p>}

          {holidayMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700 font-medium">🎉 {holidayMessage}</p>
              <p className="text-xs text-red-600 mt-1">Escolha outra data para continuar com o agendamento.</p>
            </div>
          )}

          <div className={`flex min-h-[240px] items-center justify-center w-full ${filteredAndVisibleSlots.length === 0 && "min-h-auto"}`}>
            {loadingTimes ? (
              <Spinner />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 w-full">
                {filteredAndVisibleSlots.length > 0
                  ? filteredAndVisibleSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={slot.isBooked}
                        onClick={() => updateFormData({ time: slot.time })}
                        className={`rounded-md border p-2 text-center text-sm transition-colors cursor-pointer ${
                          formData.time === slot.time && !slot.isBooked
                            ? "border-[var(--loja-theme-color)] bg-[var(--loja-theme-color)]/10 text-[var(--loja-theme-color)] font-semibold"
                            : slot.isBooked
                            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through"
                            : "border-gray-200 hover:border-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/20"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))
                  : formData.date &&
                    !holidayMessage && <p className="col-span-full text-sm text-gray-500">Nenhum horário disponível para este dia.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
