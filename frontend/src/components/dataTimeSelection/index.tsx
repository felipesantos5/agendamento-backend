import { useState, useEffect } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/config/BackendUrl";

interface TimeSlot {
  time: string;
  isBooked: boolean;
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

  // Efeito para buscar horários disponíveis quando a data ou o barbeiro mudam
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (formData.date && selectedBarber && barbershopId) {
        setLoadingTimes(true);
        setTimeSlots([]);
        try {
          const response = await axios.get(`${API_BASE_URL}/barbershops/${barbershopId}/barbers/${selectedBarber}/free-slots`, {
            params: { date: formData.date, serviceId: selectedServiceId },
          });
          setTimeSlots(response.data);
        } catch (error) {
          console.error("Erro ao buscar horários:", error);
        } finally {
          setLoadingTimes(false);
        }
      } else {
        setTimeSlots([]);
      }
    };
    fetchTimeSlots();
  }, [formData.date, selectedBarber, barbershopId]);

  // --- Lógica do Calendário ---
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
    updateFormData({ date: selectedDate, time: "" }); // Reseta a hora ao mudar a data
  };

  const isDateInPast = (day: number) => {
    const today = new Date();
    const selectedDate = new Date(year, month, day);
    return selectedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Escolha a Data e Hora</h2>
        <p className="mt-1 text-sm text-gray-500">Selecione quando você gostaria de nos visitar</p>
      </div>

      <div className="lg:flex gap-8">
        <div className="space-y-4 lg:w-full">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Calendar className="mr-2 h-4 w-4" />
              Selecione a Data
            </label>
            <div className="flex items-center space-x-2">
              <button type="button" onClick={handlePrevMonth} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 cursor-pointer">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium">
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
                      disabled={isDateInPast(day)}
                      onClick={() => handleDateSelect(day)}
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full cursor-pointer text-sm ${
                        isDateInPast(day)
                          ? "!cursor-not-allowed text-gray-300"
                          : formData.date === `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                          ? "bg-[var(--loja-theme-color)] text-white"
                          : "hover:bg-[var(--loja-theme-color)]/30"
                      }`}
                    >
                      {day}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 mt-4 lg:mt-0 lg:w-full">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Clock className="mr-2 h-4 w-4" />
            Selecione o Horário
          </label>
          {!selectedBarber && <p className="text-xs text-[var(--loja-theme-color)]">Por favor, selecione um barbeiro na etapa anterior.</p>}
          {!formData.date && selectedBarber && <p className="text-xs text-gray-500">Por favor, selecione uma data primeiro.</p>}

          {loadingTimes ? (
            <p className="text-sm text-gray-500">Carregando horários...</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {timeSlots.length !== 0
                ? timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      // ✅ NOVO: Desabilita o botão se o horário estiver ocupado
                      disabled={slot.isBooked}
                      onClick={() => updateFormData({ time: slot.time })}
                      // ✅ NOVO: Classes de estilo condicionais
                      className={`rounded-md border p-2 text-center text-sm transition-colors cursor-pointer ${
                        formData.time === slot.time && !slot.isBooked
                          ? "border-[var(--loja-theme-color)] bg-[var(--loja-theme-color)]/10 text-[var(--loja-theme-color)] font-semibold" // Estilo para horário selecionado
                          : slot.isBooked
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through" // Estilo para horário ocupado
                          : "border-gray-200 hover:border-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/20" // Estilo para horário livre
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))
                : formData.date && <p className="col-span-3 text-sm text-gray-500">Nenhum horário disponível para este dia.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
