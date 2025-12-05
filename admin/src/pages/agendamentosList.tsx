import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Imports de UI e Ícones
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Loader2 } from "lucide-react";
import { Booking } from "@/types/bookings";
import { translatePaymentStatus } from "@/helper/translatePaymentStatus";
import { AdminOutletContext } from "@/types/AdminOutletContext";

// --- Tipagens ---
interface Barber {
  _id: string;
  name: string;
}

// --- Componente Principal ---
export const AgendamentosList = () => {
  const { barbershopId } = useOutletContext<AdminOutletContext>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. ESTADOS PARA FILTROS E PAGINAÇÃO ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10; // Itens por página

  const fetchPageData = async () => {
    if (!barbershopId) return;
    setIsLoading(true);
    try {
      const [bookingsRes, barbersRes] = await Promise.all([
        apiClient.get(`/barbershops/${barbershopId}/bookings`),
        apiClient.get(`/barbershops/${barbershopId}/barbers`),
      ]);
      // Ordena os agendamentos do mais recente para o mais antigo
      const sortedBookings = bookingsRes.data.sort((a: Booking, b: Booking) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setBookings(sortedBookings);
      setAllBarbers(barbersRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Não foi possível carregar os dados.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (barbershopId) {
      fetchPageData();
    }
  }, [barbershopId]);

  // --- 2. LÓGICA DE FILTRAGEM E PAGINAÇÃO ---
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Adicionado 'booking.customer &&' para segurança
      const customerNameMatch = booking.customer && booking.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
      const barberMatch = selectedBarber === "all" || booking.barber?._id === selectedBarber;
      const statusMatch = selectedStatus === "all" || booking.status === selectedStatus;

      // Retorna true apenas se todos os filtros (que se aplicam) forem verdadeiros
      return customerNameMatch && barberMatch && statusMatch;
    });
  }, [bookings, searchTerm, selectedBarber, selectedStatus]);

  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);

  // --- 3. HELPER PARA ESTILIZAR O BADGE DE STATUS ---
  const getStatusBadge = (status: Booking["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-green-500 text-white">
            Concluído
          </Badge>
        );
      case "canceled":
        return <Badge variant="destructive">Cancelado</Badge>;
      case "confirmed":
        return <Badge variant="default">Confirmado</Badge>;
      case "booked":
      default:
        return <Badge variant="outline">Agendado</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Agendamentos</CardTitle>
        {/* <CardDescription>
          Visualize e filtre todos os agendamentos realizados na sua barbearia.
        </CardDescription> */}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* --- 4. ÁREA DE FILTROS --- */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Buscar por nome do cliente..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reseta para a primeira página ao buscar
            }}
            className="flex-grow"
          />
          <Select
            value={selectedBarber}
            onValueChange={(value) => {
              setSelectedBarber(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Profissionais</SelectItem>
              {allBarbers.map((barber) => (
                <SelectItem key={barber._id} value={barber._id}>
                  {barber.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedStatus}
            onValueChange={(value) => {
              setSelectedStatus(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="booked">Agendado</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="canceled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* --- 5. TABELA DE DADOS --- */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Data & Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBookings.length > 0 ? (
                paginatedBookings.map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell className="font-medium">{booking.customer?.name || "Cliente Deletado"}</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>{booking.barber?.name || "Profissional Deletado"}</TableCell>
                    <TableCell>{booking.service?.name || "Serviço Deletado"}</TableCell>
                    <TableCell>{translatePaymentStatus(booking.paymentStatus).text}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {format(new Date(booking.time), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum agendamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* --- 6. PAGINAÇÃO --- */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e: any) => {
                    e.preventDefault();
                    setCurrentPage((p) => Math.max(p - 1, 1));
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="font-medium text-sm mx-4">
                  Página {currentPage} de {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((p) => Math.min(p + 1, totalPages));
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
};
