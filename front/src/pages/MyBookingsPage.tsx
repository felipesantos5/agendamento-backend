import { useEffect, useMemo, useState } from "react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import apiClient from "@/services/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, CreditCard, Home, Loader2, LogOut, Repeat, Scissors, User, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RescheduleBookingModal from "@/components/RescheduleBookingModal.tsx";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PopulatedBooking } from "@/types/PopulatedBooking";

export function MyBookingsPage() {
  const { customer, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<PopulatedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPayment, setIsCreatingPayment] = useState<string | null>(null);
  const [bookingToReschedule, setBookingToReschedule] = useState<PopulatedBooking | null>(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  // Função para buscar os agendamentos
  const fetchBookings = async () => {
    try {
      const response = await apiClient.get<PopulatedBooking[]>("/api/auth/customer/me/bookings");
      setBookings(response.data);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      toast.error("Não foi possível carregar seus agendamentos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Separa os agendamentos em "próximos" e "passados"
  const { upcomingBookings, pastBookings } = useMemo(() => {
    const upcoming = bookings.filter((b) => !isPast(new Date(b.time)));
    const past = bookings.filter((b) => isPast(new Date(b.time)));
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [bookings]);

  // Paginação para o histórico
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 5;
  const totalHistoryPages = Math.ceil(pastBookings.length / historyPerPage);
  const paginatedPastBookings = pastBookings.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);

  // Função para cancelar um agendamento
  const handleCancelBooking = async (booking: PopulatedBooking) => {
    try {
      await apiClient.put(`/barbershops/${booking.barbershop._id}/bookings/${booking._id}/cancel`);
      toast.success("Agendamento cancelado com sucesso!");
      // Atualiza a lista localmente para refletir a mudança instantaneamente
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? { ...b, status: "canceled" } : b)));
    } catch (error) {
      toast.error("Ocorreu um erro ao cancelar o agendamento.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/entrar");
    toast.info("Você foi desconectado.");
  };

  const handlePayNow = async (booking: PopulatedBooking) => {
    if (!booking.barbershop._id || !booking._id) return;

    setIsCreatingPayment(booking._id); // Ativa o loading para este botão específico
    try {
      const response = await apiClient.post(`/api/barbershops/${booking.barbershop._id}/bookings/${booking._id}/create-payment`);
      const { payment_url } = response.data;
      if (payment_url) {
        window.location.href = payment_url;
      } else {
        throw new Error("URL de pagamento não recebida.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Falha ao iniciar pagamento.");
      setIsCreatingPayment(null); // Desativa o loading em caso de erro
    }
  };

  const getStatusInfo = (status: PopulatedBooking["status"], isHistory = false) => {
    if (isHistory && (status === "booked" || status === "confirmed")) {
      return { text: "Realizado", className: "bg-blue-100 text-blue-800" };
    }
    switch (status) {
      case "completed":
        return { text: "Concluído", className: "bg-green-100 text-green-800" };
      case "canceled":
        return { text: "Cancelado", className: "bg-red-100 text-red-800" };
      default:
        return { text: "Agendado", className: "bg-blue-100 text-blue-800" };
    }
  };

  const handleOpenRescheduleModal = (booking: PopulatedBooking) => {
    setBookingToReschedule(booking);
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleSuccess = (updatedBooking: PopulatedBooking) => {
    setIsRescheduleModalOpen(false); // Fecha o modal
    setBookingToReschedule(null);
    toast.success("Horário remarcado com sucesso!");
    // Atualiza a lista de agendamentos localmente
    setBookings((prevBookings) => prevBookings.map((b) => (b._id === updatedBooking._id ? updatedBooking : b)));
    // Ou, alternativamente, buscar a lista novamente:
    // fetchBookings();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--loja-theme-color)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-10">
        {/* --- NOVO HEADER --- */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Meus Agendamentos</h1>
            <p className="text-muted-foreground">Olá, {customer?.name?.split(" ")[0]}!</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-sm font-semibold hover:underline cursor-pointer">
              ← Voltar
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sair</span>
            </Button>
          </div>
        </header>

        {/* --- SEÇÃO DE PRÓXIMOS AGENDAMENTOS COM NOVO CARD --- */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Próximos</h2>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-6">
              {upcomingBookings.map((booking) => {
                const statusInfo = getStatusInfo(booking.status);

                const canBeCancelled = booking.status === "booked" || booking.status === "confirmed";

                const showPayButton =
                  booking.barbershop.paymentsEnabled === true && booking.paymentStatus !== "approved" && booking.status !== "canceled";

                const showPaiedBadge =
                  booking.barbershop.paymentsEnabled === true && booking.paymentStatus === "approved" && booking.status !== "canceled";

                const canBeRescheduled = booking.status === "booked" || booking.status === "confirmed";

                return (
                  <Card
                    key={booking._id}
                    className="bg-white dark:bg-gray-800 shadow-md transition-all hover:shadow-lg gap-0 group-hover:ring-2 pb-0 group-hover:ring-blue-200 cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button")) return;
                      navigate(`/${booking.barbershop.slug}`);
                    }}
                  >
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex flex-col justify-between items-start gap-4">
                        <div className="flex items-center gap-2">
                          <img src={booking.barbershop.logoUrl} alt="logo barbearia" className="w-24" />
                          <CardTitle className="text-xl md:text-2xl group-hover:underline">{booking.barbershop.name}</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={`${statusInfo.className} border`}>{statusInfo.text}</Badge>
                          {showPaiedBadge && <Badge className="bg-green-500 border">Pago no App</Badge>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-4 text-sm sm:text-base pt-0">
                      {booking.service ? (
                        <div className="flex items-center gap-3">
                          <Scissors className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">{booking.service?.name || "Serviço indisponível"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Scissors className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold italic text-muted-foreground">Serviço indisponível</span>
                        </div>
                      )}

                      {/* --- CORREÇÃO PREVENTIVA AQUI --- */}
                      {booking.barber ? (
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <span>
                            com <strong>{booking.barber?.name || "Profissional indisponível"}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <span className="italic text-muted-foreground">Profissional indisponível</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span>{format(new Date(booking.time), "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span>
                          às <strong>{format(new Date(booking.time), "HH:mm")}h</strong>
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 rounded-b-lg gap-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 border-t flex-col md:flex-row">
                      {showPayButton && (
                        <Button
                          onClick={() => handlePayNow(booking)}
                          disabled={isCreatingPayment === booking._id}
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto"
                        >
                          {isCreatingPayment === booking._id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="mr-2 h-4 w-4" />
                          )}
                          {isCreatingPayment === booking._id ? "Aguarde..." : "Pagar Agora"}
                        </Button>
                      )}

                      {canBeRescheduled && (
                        <Button
                          variant="outline"
                          onClick={() => handleOpenRescheduleModal(booking)} // Chama a função para abrir o modal
                          className="w-full md:w-auto"
                          size="default"
                        >
                          <Repeat className="mr-2 h-4 w-4" />
                          Remarcar
                        </Button>
                      )}
                      {canBeCancelled && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full md:w-auto">
                              Cancelar Agendamento
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá cancelar o seu agendamento para o serviço de{" "}
                                <strong>{booking.service?.name || "serviço indisponível"}</strong> no dia no dia{" "}
                                <strong>{format(new Date(booking.time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</strong>
                                .
                                <br />
                                <br />
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Manter Agendamento</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancelBooking(booking)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                              >
                                Sim, Cancelar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
              <Home className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold">Nenhum agendamento futuro</h3>
              <p className="mt-1 text-sm text-gray-500">Que tal marcar um novo horário?</p>
            </div>
          )}
        </section>

        {/* --- SEÇÃO DE HISTÓRICO COM NOVO CARD --- */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Histórico</h2>
          {pastBookings.length > 0 ? (
            <>
              <div className="space-y-4">
                {paginatedPastBookings.map((booking) => {
                  const statusInfo = getStatusInfo(booking.status, true);
                  return (
                    <Card
                      key={booking._id}
                      className="bg-white dark:bg-gray-800 shadow-md transition-all hover:shadow-lg gap-0 group-hover:ring-2 group-hover:ring-blue-200 cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button")) return;
                        navigate(`/${booking.barbershop.slug}`);
                      }}
                    >
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-2">
                            <img src={booking.barbershop.logoUrl} alt="logo barbearia" className="w-24" />
                            <CardTitle className="text-xl md:text-2xl group-hover:underline">{booking.barbershop.name}</CardTitle>
                          </div>
                          <Badge className={`${statusInfo.className} border`}>{statusInfo.text}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 space-y-4 text-sm sm:text-base">
                        {booking.service ? (
                          <div className="flex items-center gap-3">
                            <Scissors className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold">{booking.service?.name || "Serviço indisponível"}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Scissors className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold italic text-muted-foreground">Serviço indisponível</span>
                          </div>
                        )}

                        {/* --- CORREÇÃO PREVENTIVA AQUI --- */}
                        {booking.barber ? (
                          <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <span>
                              com <strong>{booking.barber?.name || "Profissional indisponível"}</strong>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <span className="italic text-muted-foreground">Profissional indisponível</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <span>{format(new Date(booking.time), "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <span>
                            às <strong>{format(new Date(booking.time), "HH:mm")}h</strong>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {/* Paginação */}
              {totalHistoryPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button variant="outline" size="sm" onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage === 1}>
                    Anterior
                  </Button>
                  <span className="mx-2 text-sm">
                    Página {historyPage} de {totalHistoryPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                    disabled={historyPage === totalHistoryPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Você ainda não possui histórico de agendamentos.</p>
          )}
        </section>
      </div>

      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="sm:max-w-[625px] h-[80vh] overflow-scroll dialog-rebooking">
          {" "}
          <DialogHeader>
            <DialogTitle>Remarcar Horário</DialogTitle>
            <DialogClose asChild>
              <button className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </button>
            </DialogClose>
          </DialogHeader>
          {bookingToReschedule && (
            <RescheduleBookingModal
              booking={bookingToReschedule}
              onClose={() => {
                setIsRescheduleModalOpen(false);
                setBookingToReschedule(null);
              }}
              onSuccess={handleRescheduleSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
