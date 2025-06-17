import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { format, parseISO, isPast, differenceInMilliseconds } from "date-fns";
import { ptBR } from "date-fns/locale";

// Importações de componentes ShadCN/UI
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Para o filtro
import { Switch } from "@/components/ui/switch"; // Para o toggle
import { Label } from "@/components/ui/label"; // Para os rótulos dos filtros
import { Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import apiClient from "@/services/api";
import { PhoneFormat } from "@/helper/phoneFormater";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Contexto do AdminLayout
interface AdminOutletContext {
  barbershopId: string;
  barbershopName: string;
}

// Tipo para os dados do agendamento
interface Booking {
  _id: string;
  customer: {
    name: string;
    phone?: string;
    whatsapp?: string;
  };
  barber: {
    _id: string;
    name: string;
  };
  service: {
    _id: string;
    name: string;
    price: number;
  };
  time: string;
  status: string;
}

// Tipo para os dados do barbeiro (para o filtro)
interface Barber {
  _id: string;
  name: string;
}

const daysOfWeekForFilter = [
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

export function AgendamentosPage() {
  const { barbershopId, barbershopName } = useOutletContext<AdminOutletContext>();

  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("all");
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>("all");
  const [showPastAppointments, setShowPastAppointments] = useState<boolean>(false);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isUserAdmin = user?.role === "admin";

  useEffect(() => {
    if (!barbershopId) return;

    const fetchPageData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let bookingsResponse;

        if (isUserAdmin) {
          // Se for admin, busca todos os agendamentos da barbearia E a lista de barbeiros para o filtro
          const [resBookings, resBarbers] = await Promise.all([
            apiClient.get(`/barbershops/${barbershopId}/bookings`),
            apiClient.get(`/barbershops/${barbershopId}/barbers`),
          ]);
          bookingsResponse = resBookings;
          setAllBarbers(resBarbers.data);
        } else {
          // Se for barbeiro, busca apenas os SEUS agendamentos pela nova rota
          bookingsResponse = await apiClient.get(`/barbershops/${barbershopId}/barbers/bookings/barber`);
          console.log("bookingsResponse", bookingsResponse);
          // Não precisa buscar todos os barbeiros, pois o filtro não será mostrado
        }

        setBookings(bookingsResponse.data);
      } catch (err: any) {
        console.error("Erro ao buscar dados de agendamentos:", err);
        setError(err.response?.data?.error || "Não foi possível carregar os dados.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageData();
  }, [barbershopId]);

  const displayedBookings = useMemo(() => {
    let filtered = [...bookings];

    // 1. Filtrar por barbeiro selecionado
    if (isUserAdmin && selectedBarberFilter !== "all") {
      filtered = filtered.filter((booking) => booking.barber?._id === selectedBarberFilter);
    }

    if (selectedDayFilter !== "all") {
      filtered = filtered.filter((booking) => {
        // É importante considerar o fuso horário para pegar o dia da semana correto
        // da data UTC que vem do banco. Uma forma simples é criar a data como se
        // fosse local para o dia da semana não mudar por causa de UTC-3.
        const dateInLocalTZ = new Date(booking.time.replace("Z", ""));
        const dayOfWeek = dateInLocalTZ.getDay(); // Retorna 0 (Domingo) a 6 (Sábado)
        return String(dayOfWeek) === selectedDayFilter;
      });
    }

    // 2. Filtrar agendamentos passados (se a opção estiver desmarcada)
    if (!showPastAppointments) {
      filtered = filtered.filter((booking) => !isPast(parseISO(booking.time)));
    }

    // 3. Ordenar a lista filtrada
    // return filtered.sort((a, b) => {
    //   const dateA = parseISO(a.time);
    //   const dateB = parseISO(b.time);
    //   const aIsPast = isPast(dateA);
    //   const bIsPast = isPast(dateB);

    //   if (aIsPast && bIsPast) return differenceInMilliseconds(dateB, dateA);
    //   if (aIsPast && !bIsPast) return -1;
    //   if (!aIsPast && bIsPast) return 1;
    //   return differenceInMilliseconds(dateA, dateB);
    // });

    return filtered.sort((a, b) => {
      const dateA = parseISO(a.time);
      const dateB = parseISO(b.time);
      return differenceInMilliseconds(dateA, dateB);
    });
  }, [bookings, selectedBarberFilter, showPastAppointments, selectedDayFilter, isUserAdmin]);

  const formatBookingTime = (isoTime: string) => {
    try {
      const dateObj = parseISO(isoTime);
      return {
        date: format(dateObj, "dd/MM/yyyy", { locale: ptBR }),
        time: format(dateObj, "HH:mm"),
        isPast: isPast(dateObj),
      };
    } catch (e) {
      return { date: "Data inválida", time: "Hora inválida", isPast: false };
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      setIsDeleting(true);
      await apiClient.delete(`/barbershops/${barbershopId}/bookings/${bookingId}`);
      setBookings(bookings.filter(booking => booking._id !== bookingId));
      toast.success("Agendamento excluído com sucesso!");
    } catch (error: any) {
      console.error("Erro ao excluir agendamento:", error);
      toast.error(error.response?.data?.error || "Erro ao excluir agendamento");
    } finally {
      setIsDeleting(false);
      setBookingToDelete(null);
    }
  };

  if (isLoading && bookings.length === 0 && allBarbers.length === 0)
    return <p className="text-center p-10">Carregando agendamentos e barbeiros...</p>;
  if (error && bookings.length === 0) return <p className="text-center p-10 text-red-500">{error}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendamentos - {barbershopName}</CardTitle>
        {/* <CardDescription>
          {isUserAdmin ? "Visualize e filtre os agendamentos da sua barbearia." : "Visualize e filtre os seus agendamentos."}
        </CardDescription> */}
      </CardHeader>
      <CardContent>
        {error && !isLoading && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center text-sm font-medium text-gray-700 mr-2 whitespace-nowrap">
            <Filter className="mr-2 h-5 w-5" /> Filtros:
          </div>

          {isUserAdmin && (
            <div className="flex-grow min-w-[200px] w-full sm:w-auto">
              <Label htmlFor="barberFilter" className="text-xs font-medium text-gray-600">
                Profissional:
              </Label>
              <Select value={selectedBarberFilter} onValueChange={setSelectedBarberFilter}>
                <SelectTrigger id="barberFilter" className="w-full mt-1">
                  <SelectValue placeholder="Todos os Profissionais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Profissionais</SelectItem>
                  {allBarbers.map((barber) => (
                    <SelectItem key={barber._id} value={barber._id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex-grow min-w-[200px] w-full sm:w-auto">
            <Label htmlFor="dayFilter" className="text-xs font-medium text-gray-600">
              Dia da Semana:
            </Label>
            <Select value={selectedDayFilter} onValueChange={setSelectedDayFilter}>
              <SelectTrigger id="dayFilter" className="w-full mt-1">
                <SelectValue placeholder="Todos os Dias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Dias</SelectItem>
                {daysOfWeekForFilter.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toggle para exibir passados (comum para ambos os papéis) */}
          <div className="flex items-center space-x-2 pt-2 sm:pt-5 w-full sm:w-auto justify-baseline md:justify-end">
            <Switch id="showPastToggle" checked={showPastAppointments} onCheckedChange={setShowPastAppointments} />
            <Label htmlFor="showPastToggle" className="text-sm font-medium text-gray-600 cursor-pointer whitespace-nowrap">
              Exibir passados
            </Label>
          </div>
        </div>

        <Table>
          <TableCaption>
            {displayedBookings.length === 0
              ? "Nenhum agendamento encontrado para os filtros selecionados."
              : `Exibindo ${displayedBookings.length} agendamento(s).`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Data e Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Serviço</TableHead>
              {isUserAdmin && <TableHead>Profissional</TableHead>}
              <TableHead className="text-right">Preço (R$)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedBookings.map((booking) => {
              const { date, time, isPast: bookingIsPast } = formatBookingTime(booking.time);
              return (
                <TableRow key={booking._id} className={bookingIsPast && showPastAppointments ? "opacity-70 bg-gray-50" : ""}>
                  <TableCell className="W-[200px]">
                    <div className="flex items-center">
                      <div>
                        <div>{date}</div>
                        <div className={`text-sm ${bookingIsPast ? "text-gray-500" : "text-muted-foreground"}`}>{time} horas</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">{booking.customer.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">{PhoneFormat(booking.customer.phone) || "Não informado"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">{booking.service.name}</div>
                  </TableCell>
                  {isUserAdmin && <TableCell>{booking.barber.name}</TableCell>}
                  <TableCell className="text-right">
                    {typeof booking.service?.price === "number" ? booking.service.price.toFixed(2) : "N/A"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={booking.status === "booked" ? "default" : booking.status === "completed" ? "secondary" : "outline"}
                      className={
                        bookingIsPast && booking.status === "booked"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                          : booking.status === "canceled"
                          ? "bg-red-100 text-red-700 border-red-300"
                          : booking.status === "booked"
                          ? "bg-blue-100 text-blue-700 border-blue-300"
                          : booking.status === "completed"
                          ? "bg-green-100 text-green-700 border-green-300"
                          : ""
                      }
                    >
                      {bookingIsPast && booking.status === "booked"
                        ? "Ocorrido"
                        : booking.status === "booked"
                        ? "Agendado"
                        : booking.status === "completed"
                        ? "Concluído"
                        : booking.status === "canceled"
                        ? "Cancelado"
                        : booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                      onClick={() => setBookingToDelete(booking._id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <AlertDialog open={!!bookingToDelete} onOpenChange={() => setBookingToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bookingToDelete && handleDeleteBooking(bookingToDelete)}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
