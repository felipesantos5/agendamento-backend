import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import apiClient from "@/services/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Barber {
  _id: string;
  name: string;
}
interface BlockedDay {
  _id: string;
  date: string;
  barber?: {
    _id: string;
    name: string;
  };
}

interface AdminOutletContext {
  barbershopId: string;
}

export function AbsencesPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();

  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
  const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [barberToBlock, setBarberToBlock] = useState<string>("all");

  useEffect(() => {
    fetchPageData();
  }, [barbershopId]);

  const fetchPageData = async () => {
    if (!barbershopId) return;
    setIsLoading(true);
    try {
      // Busca dias bloqueados e barbeiros em paralelo para mais performance
      const [blockedDaysRes, barbersRes] = await Promise.all([
        apiClient.get(`/api/barbershops/${barbershopId}/blocked-days`),
        apiClient.get(`/barbershops/${barbershopId}/barbers`),
      ]);
      setBlockedDays(
        blockedDaysRes.data.sort(
          (a: BlockedDay, b: BlockedDay) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        )
      );
      setAllBarbers(barbersRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados da página.");
    } finally {
      setIsLoading(false);
    }
  };

  // Cria um Set com as datas bloqueadas no formato "yyyy-MM-dd" para busca rápida
  const blockedDaysSet = useMemo(() => {
    return new Set(
      blockedDays.map((day) => {
        const date = new Date(day.date);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return format(
          new Date(date.getTime() + userTimezoneOffset),
          "yyyy-MM-dd"
        );
      })
    );
  }, [blockedDays]);

  // Funções para gerar o calendário
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const getDaysInMonth = (y: number, m: number) =>
    new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) =>
    new Date(y, m, 1).getDay();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const days = Array(firstDayOfMonth)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const isDayBlocked = (day: number) => {
    const dateString = format(new Date(year, month, day), "yyyy-MM-dd");
    return blockedDaysSet.has(dateString);
  };

  const isDateInPast = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(year, month, day) < today;
  };

  const handleDateSelect = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

  const handleBlockDay = async (date: Date) => {
    try {
      const payload = {
        date,
        barberId: barberToBlock === "all" ? null : barberToBlock,
      };
      await apiClient.post(
        `/api/barbershops/${barbershopId}/blocked-days`,
        payload
      );
      toast.success(`Dia ${format(date, "dd/MM/yyyy")} bloqueado com sucesso!`);
      fetchPageData(); // Recarrega tudo
      setSelectedDate(undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Falha ao bloquear o dia.");
    }
  };

  const handleUnblockDay = async (dayId: string) => {
    try {
      await apiClient.delete(
        `/api/barbershops/${barbershopId}/blocked-days/${dayId}`
      );
      toast.success(`Dia desbloqueado com sucesso!`);
      fetchPageData();
      setSelectedDate(undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Falha ao desbloquear o dia.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendário de Folgas</CardTitle>
          <CardDescription>
            Selecione uma data para bloquear ou clique em um dia já bloqueado
            para liberá-lo. Dias em vermelho estão indisponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div className="flex flex-col gap-4 items-center">
            <div className="w-full max-w-lg rounded-lg border shadow-sm bg-background">
              <div className="flex items-center justify-between p-4 border-b">
                <span className="text-lg font-semibold">
                  {monthNames[month]} {year}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevMonth}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextMonth}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground p-3 border-b">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                  (day) => (
                    <div key={day} className="py-1">
                      {day}
                    </div>
                  )
                )}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day, index) => (
                  <div
                    key={index}
                    className={`p-1 flex items-center justify-center h-12 border-b ${
                      index % 7 !== 6 ? "border-r" : ""
                    } ${index < 7 ? "border-t" : ""}`}
                  >
                    {day && (
                      <button
                        type="button"
                        disabled={isDateInPast(day)}
                        onClick={() => handleDateSelect(day)}
                        className={`
                          flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors
                          ${
                            isDateInPast(day)
                              ? "text-gray-400 line-through cursor-not-allowed"
                              : isDayBlocked(day)
                              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              : selectedDate?.getDate() === day &&
                                selectedDate?.getMonth() === month
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "hover:bg-accent hover:text-accent-foreground"
                          }
                        `}
                      >
                        {day}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!selectedDate} className="w-full max-w-lg">
                  Gerenciar Dia Selecionado
                </Button>
              </AlertDialogTrigger>

            {selectedDate && (
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você selecionou o dia <span className="font-bold">{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>.
                    {isDayBlocked(selectedDate.getDate())
                      ? " Deseja DESBLOQUEAR este dia para agendamentos?"
                      : " Deseja BLOQUEAR este dia? Nenhum cliente poderá agendar horários nesta data."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedDate(undefined)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      const blockedId = getBlockedDayId(selectedDate);
                      if (blockedId) {
                        handleUnblockDay(blockedId, selectedDate);
                      } else {
                        handleBlockDay(selectedDate);
                      }
                    }}
                    className={!isDayBlocked(selectedDate.getDate()) ? "bg-destructive hover:bg-destructive/90" : ""}
                  >
                    {isDayBlocked(selectedDate.getDate()) ? "Sim, Desbloquear" : "Sim, Bloquear"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            )}
          </AlertDialog> */}

            <AlertDialog
              open={!!selectedDate}
              onOpenChange={(isOpen) => !isOpen && setSelectedDate(undefined)}
            >
              {selectedDate && (
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Gerenciar Folga</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você selecionou o dia{" "}
                      <span className="font-bold">
                        {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      .
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="py-2">
                    <Label>Para quem é esta folga?</Label>
                    <Select defaultValue="all" onValueChange={setBarberToBlock}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toda a Barbearia</SelectItem>
                        {allBarbers.map((barber) => (
                          <SelectItem key={barber._id} value={barber._id}>
                            {barber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleBlockDay(selectedDate)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Confirmar Bloqueio
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              )}
            </AlertDialog>
          </div>

          {/* Coluna da Direita: Lista de Dias Bloqueados */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Dias Bloqueados</h3>
            <ScrollArea className="h-72 w-full rounded-md border p-4">
              {isLoading ? (
                <p>Carregando...</p>
              ) : blockedDays.length > 0 ? (
                <div className="space-y-3">
                  {blockedDays.map((day) => {
                    return (
                      <div
                        key={day._id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary border"
                      >
                        <span className="text-sm font-medium">
                          {format(new Date(day.date), "dd/MM/yyyy - EEEE", {
                            locale: ptBR,
                          })}
                        </span>
                        {day.barber?.name ? (
                          <span className="text-sm font-medium">
                            {day.barber.name}
                          </span>
                        ) : (
                          <span className="text-sm font-medium">
                            Todos os barbeiros
                          </span>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá desbloquear o dia{" "}
                                {format(new Date(day.date), "dd/MM/yyyy")} e ele
                                voltará a ficar disponível para agendamentos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleUnblockDay(day._id)}
                              >
                                Confirmar Desbloqueio
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center pt-4">
                  Nenhum dia bloqueado.
                </p>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
