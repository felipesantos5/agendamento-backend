import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "../ui/spinnerLoading"; //
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import apiClient from "@/services/api"; //
import { cn } from "@/lib/utils"; // Importar cn

const sectionAnimation = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" },
};

interface TimeSlot {
  time: string;
  isBooked: boolean;
}

interface ApiResponse {
  slots: TimeSlot[];
}

// Interface atualizada com layoutMode
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
  layoutMode?: "page" | "modal"; // <-- Nova prop opcional
}

export default function DateTimeSelection({
  formData,
  updateFormData,
  barbershopId,
  selectedBarber,
  selectedServiceId,
  layoutMode = "page", // <-- Define 'page' como padrão
}: DateTimeSelectionProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [holidayMessage, setHolidayMessage] = useState<string | null>(null);
  const [scrollIntent, setScrollIntent] = useState(false);
  const [unavailableDays, setUnavailableDays] = useState<Set<string>>(new Set()); // Nome como no seu último código
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [isSearchingDate, setIsSearchingDate] = useState(false); // Flag para busca de data

  const timeSlotsRef = useRef<HTMLDivElement>(null);

  // Busca horários (usando apiClient agora para consistência)
  useEffect(() => {
    const fetchTimeSlots = async () => {
      setTimeSlots([]);
      setHolidayMessage(null);

      if (formData.date && selectedBarber && barbershopId && selectedServiceId) {
        setLoadingTimes(true);
        try {
          // Usando apiClient em vez de axios direto
          const response = await apiClient.get(`/barbershops/${barbershopId}/barbers/${selectedBarber}/free-slots`, {
            params: { date: formData.date, serviceId: selectedServiceId },
          });
          const data: ApiResponse = response.data;
          setTimeSlots(Array.isArray(data.slots) ? data.slots : response.data || []);
        } catch (error) {
          console.error("Erro ao buscar horários:", error);
          toast.error("Erro ao carregar os horários disponíveis.");
          setTimeSlots([]);
        } finally {
          setLoadingTimes(false);
        }
      } else {
        setTimeSlots([]);
        setLoadingTimes(false);
      }
    };
    fetchTimeSlots();
  }, [formData.date, selectedBarber, barbershopId, selectedServiceId]);

  // Busca disponibilidade mensal (como no seu código, ativa isSearchingDate)
  useEffect(() => {
    if (!barbershopId || !selectedBarber || !selectedServiceId) {
      setLoadingMonthly(false);
      return;
    }
    const fetchMonthlyAvailability = async () => {
      setLoadingMonthly(true);
      setIsSearchingDate(true); // Ativa a flag para buscar a data
      try {
        const response = await apiClient.get(`/barbershops/${barbershopId}/bookings/${selectedBarber}/monthly-availability`, {
          params: {
            year: currentMonth.getFullYear(),
            month: currentMonth.getMonth() + 1,
            serviceId: selectedServiceId,
          },
        });
        // Garante que response.data.unavailableDays seja um array
        const days = Array.isArray(response.data.unavailableDays) ? response.data.unavailableDays : [];
        setUnavailableDays(new Set(days)); // Usa o nome do estado do seu código
      } catch (error) {
        console.error("Erro ao buscar disponibilidade do mês", error);
        setUnavailableDays(new Set());
      } finally {
        setLoadingMonthly(false);
      }
    };
    fetchMonthlyAvailability();
  }, [currentMonth, selectedBarber, selectedServiceId, barbershopId]);

  // useEffect REFINADO para encontrar e selecionar o primeiro dia disponível
  useEffect(() => {
    // Só executa se a busca mensal terminou, ainda não há data selecionada, temos barbeiro E a flag de busca está ativa
    if (!loadingMonthly && !formData.date && selectedBarber && isSearchingDate) {
      let searchDate = new Date();
      searchDate.setHours(0, 0, 0, 0);

      const calendarMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      if (calendarMonthStart > searchDate) {
        searchDate = calendarMonthStart;
      }

      const maxSearchDays = 90;
      let daysSearched = 0;
      let foundAvailableDate = false;

      while (daysSearched < maxSearchDays) {
        const yearStr = searchDate.getFullYear();
        const monthStr = String(searchDate.getMonth() + 1).padStart(2, "0");
        const dayStr = String(searchDate.getDate()).padStart(2, "0");
        const dateString = `${yearStr}-${monthStr}-${dayStr}`;

        // Verifica se pertence ao mês carregado
        if (searchDate.getFullYear() === currentMonth.getFullYear() && searchDate.getMonth() === currentMonth.getMonth()) {
          const isPast = searchDate < new Date(new Date().setHours(0, 0, 0, 0));
          const isUnavailable = unavailableDays.has(dateString); // Usa o nome do estado do seu código

          if (!isPast && !isUnavailable) {
            updateFormData({ date: dateString });
            foundAvailableDate = true;
            break; // Sai do loop
          }
        } else if (
          searchDate.getFullYear() > currentMonth.getFullYear() ||
          (searchDate.getFullYear() === currentMonth.getFullYear() && searchDate.getMonth() > currentMonth.getMonth())
        ) {
          // Se ultrapassou o mês carregado, avança calendário e sai do loop atual
          setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
          // A busca será retomada quando o useEffect de fetchMonthlyAvailability recarregar
          foundAvailableDate = true; // Sinaliza para não continuar buscando neste ciclo
          break;
        }

        searchDate.setDate(searchDate.getDate() + 1);
        daysSearched++;
      }

      if (!foundAvailableDate && daysSearched >= maxSearchDays) {
        console.warn("Não foi encontrada data disponível no limite de busca.");
        toast.info("Não encontramos horários disponíveis nos próximos 90 dias.");
      }
      setIsSearchingDate(false); // Finaliza o estado de busca para este ciclo
    }
  }, [loadingMonthly, unavailableDays, selectedBarber, currentMonth, formData.date, isSearchingDate, updateFormData]); // Dependências atualizadas

  // Função auxiliar para verificar indisponibilidade (usando o estado do seu código)
  const isDayUnavailable = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return unavailableDays.has(dateString);
  };

  // Scroll suave (mantido)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollIntent && !loadingTimes && timeSlotsRef.current) {
        const targetElement = timeSlotsRef.current;
        const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
        const offset = layoutMode === "modal" ? 100 : window.innerHeight * 0.3; // Offset menor no modal
        window.scrollTo({
          top: elementPosition - offset,
          behavior: "smooth",
        });
        setScrollIntent(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [loadingTimes, scrollIntent, layoutMode]); // Adiciona layoutMode à dependência

  // Filtro de slots passados (mantido)
  const filteredAndVisibleSlots = useMemo(() => {
    // ... (lógica igual à anterior) ...
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (formData.date !== todayString) return timeSlots;
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    return timeSlots.filter((slot) => {
      if (!slot.time || !slot.time.includes(":")) return false;
      const [slotHour, slotMinute] = slot.time.split(":").map(Number);
      if (isNaN(slotHour) || isNaN(slotMinute)) return false;
      const slotTimeInMinutes = slotHour * 60 + slotMinute;
      return slotTimeInMinutes > currentTimeInMinutes;
    });
  }, [timeSlots, formData.date]);

  // Funções de calendário (mantidas)
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

  // Navegação de mês (atualizada para impedir ir ao passado e limpar data)
  const handlePrevMonth = () => {
    const today = new Date();
    const firstOfCurrentCalendarMonth = new Date(year, month, 1);
    const firstOfTodayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    if (firstOfCurrentCalendarMonth <= firstOfTodayMonth) return;
    setCurrentMonth(new Date(year, month - 1, 1));
    updateFormData({ date: "" });
  };
  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    updateFormData({ date: "" });
  };
  const canGoPrevMonth = () => {
    const today = new Date();
    const firstOfCurrentCalendarMonth = new Date(year, month, 1);
    const firstOfTodayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstOfCurrentCalendarMonth > firstOfTodayMonth;
  };

  // Seleção de data (mantida)
  const handleDateSelect = (day: number) => {
    const selectedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    updateFormData({ date: selectedDate, time: "" });
    setScrollIntent(true);
  };

  // Verificações de data (mantidas)
  const isDateInPast = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(year, month, day);
    return selectedDate < today;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="space-y-4 md:space-y-6"
        initial={sectionAnimation.initial}
        animate={sectionAnimation.animate}
        exit={sectionAnimation.exit}
      >
        <div>
          <h2
            className={cn(
              "text-xl font-semibold text-gray-900",
              layoutMode === "page" ? "text-center text-2xl" : "text-left" // Título ajustado
            )}
          >
            {layoutMode === "page" ? "Escolha a Data e Hora" : "Selecione a Nova Data e Hora"}
          </h2>
        </div>

        {/* Container Principal com layout condicional */}
        <div
          className={cn(
            "md:min-h-[400px] booking-table-container",
            layoutMode === "page" ? "lg:flex lg:gap-8 lg:items-start" : "flex flex-col gap-6"
          )}
        >
          {/* Calendário com largura condicional */}
          <div className={cn("space-y-4 mb-6 booking-table", layoutMode === "page" ? "lg:w-1/2 lg:flex-shrink-0 lg:mb-0" : "w-full")}>
            <div className="flex items-center justify-between">
              <label className="flex items-center text-base font-medium text-gray-700">
                <Calendar className="mr-2 h-4 w-4" />
                Selecione a Data
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={!canGoPrevMonth()}
                  className={`rounded-md p-1 text-gray-500 hover:bg-gray-100 ${
                    !canGoPrevMonth() ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <span className="text-base font-medium">
                  {monthNames[month]} {year}
                </span>
                <button type="button" onClick={handleNextMonth} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 cursor-pointer">
                  <ChevronRight className="h-7 w-7" />
                </button>
              </div>
            </div>

            {loadingMonthly ? (
              <div className="flex justify-center items-center min-h-[250px] border rounded-lg">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="grid grid-cols-7 bg-gray-50 text-center">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                    <div key={day} className="py-2 text-xs font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {days.map((day, index) => {
                    const isDisabled = day === null || isDateInPast(day) || isDayUnavailable(day);
                    const isSelected = formData.date === `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    let title = undefined;
                    if (isDateInPast(day)) title = "Data indisponível";
                    else if (isDayUnavailable(day)) title = "Nenhum horário disponível"; // Usa isDayUnavailable

                    return (
                      <div key={index} className={`bg-white p-1 md:p-2 ${!day ? "cursor-default" : ""}`}>
                        {day && (
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleDateSelect(day)}
                            className={cn(
                              `mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm relative transition-colors`,
                              isDisabled && "text-gray-400 cursor-not-allowed line-through" + (isDateInPast(day) ? " decoration-2" : ""),
                              isSelected && !isDisabled && "bg-[var(--loja-theme-color)] text-white",
                              !isSelected && !isDisabled && "hover:bg-[var(--loja-theme-color)]/30 cursor-pointer"
                            )}
                            title={title}
                          >
                            {day}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Horários com largura condicional */}
          <div ref={timeSlotsRef} className={cn("space-y-4 booking-table", layoutMode === "page" ? "lg:w-1/2 mt-4 lg:mt-0" : "w-full mt-0")}>
            <label className="flex items-center text-base font-medium text-gray-700">
              <Clock className="mr-2 h-4 w-4" />
              Selecione o Horário
            </label>

            {!selectedBarber &&
              layoutMode === "page" && ( // Só mostra no modo page
                <p className="text-sm text-[var(--loja-theme-color)]">Por favor, selecione um barbeiro na etapa anterior.</p>
              )}
            {selectedBarber && !formData.date && !loadingMonthly && <p className="text-sm text-gray-500">Selecione uma data para ver os horários.</p>}
            {holidayMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700 font-medium">🎉 {holidayMessage}</p>
                <p className="text-xs text-red-600 mt-1">Escolha outra data.</p>
              </div>
            )}

            <div className={`flex items-baseline justify-center w-full min-h-[180px]`}>
              {loadingTimes ? (
                <Spinner />
              ) : (
                <motion.div
                  className={cn(
                    "grid gap-2 w-full",
                    // Ajusta colunas baseado no modo e tamanho da tela
                    layoutMode === "modal" ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-4"
                  )}
                  key={formData.date || "no-date"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {filteredAndVisibleSlots.length > 0 ? (
                    filteredAndVisibleSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={slot.isBooked}
                        onClick={() => updateFormData({ time: slot.time })}
                        className={cn(
                          `rounded-md border p-2 text-center text-sm transition-colors cursor-pointer`,
                          formData.time === slot.time &&
                            !slot.isBooked &&
                            "border-[var(--loja-theme-color)] bg-[var(--loja-theme-color)]/10 text-[var(--loja-theme-color)] font-semibold ring-1 ring-[var(--loja-theme-color)]",
                          slot.isBooked && "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through",
                          !slot.isBooked &&
                            formData.time !== slot.time &&
                            "border-gray-200 hover:border-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/5"
                        )}
                      >
                        {slot.time}
                      </button>
                    ))
                  ) : formData.date && !holidayMessage ? (
                    <p className="col-span-full text-center text-sm text-gray-500 py-4">Nenhum horário disponível para este dia.</p>
                  ) : null}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
