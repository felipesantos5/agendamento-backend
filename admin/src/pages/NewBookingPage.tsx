import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Calendar as CalendarIcon, Clock, Check, X } from "lucide-react"; // Ícones adicionados
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch"; // Importar Switch
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Supondo que você tenha essas tipagens
interface Service {
  _id: string;
  name: string;
}
interface Barber {
  _id: string;
  name: string;
}
interface AdminOutletContext {
  barbershopId: string;
}

export function NewBookingPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();
  const navigate = useNavigate();

  // Estados para os dados do formulário e controle da UI
  const [formData, setFormData] = useState({
    serviceId: "",
    barberId: "",
    date: undefined as Date | undefined,
    time: "", // Horário selecionado (do select)
    customerName: "",
    customerPhone: "",
  });
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingTimes, setIsFetchingTimes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NOVOS ESTADOS PARA O MODO MANUAL ---
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualTime, setManualTime] = useState(""); // Horário manual (do input)
  const [manualStatus, setManualStatus] = useState<"completed" | "booked" | "canceled">("completed");

  // Busca os serviços e barbeiros ao carregar a página
  useEffect(() => {
    if (!barbershopId) return;
    const fetchInitialData = async () => {
      try {
        const [servicesRes, barbersRes] = await Promise.all([
          apiClient.get(`/barbershops/${barbershopId}/services`),
          apiClient.get(`/barbershops/${barbershopId}/barbers`),
        ]);
        setServices(servicesRes.data);
        setBarbers(barbersRes.data);
      } catch (error) {
        toast.error("Erro ao carregar dados da barbearia.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [barbershopId]);

  // Busca horários disponíveis (AGORA CONDICIONAL)
  useEffect(() => {
    // Só busca horários se NÃO estiver no modo manual
    if (!isManualMode && formData.serviceId && formData.barberId && formData.date) {
      const fetchAvailableTimes = async () => {
        setIsFetchingTimes(true);
        setAvailableTimes([]); // Limpa horários antigos
        try {
          const dateString = format(formData.date!, "yyyy-MM-dd");
          const response = await apiClient.get(`/barbershops/${barbershopId}/barbers/${formData.barberId}/free-slots`, {
            params: { date: dateString, serviceId: formData.serviceId },
          });
          setAvailableTimes(response.data.slots.map((slot: any) => slot.time));
        } catch (error) {
          toast.error("Erro ao buscar horários disponíveis.");
        } finally {
          setIsFetchingTimes(false);
        }
      };
      fetchAvailableTimes();
    } else {
      // Se estiver em modo manual, limpa os horários
      setAvailableTimes([]);
      setFormData((prev) => ({ ...prev, time: "" }));
    }
  }, [formData.serviceId, formData.barberId, formData.date, barbershopId, isManualMode]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ATUALIZADO: Lida com ambos os modos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { serviceId, barberId, date, time, customerName, customerPhone } = formData;

    // Validação base
    if (!serviceId || !barberId || !date || !customerName || !customerPhone) {
      toast.error("Por favor, preencha todos os campos (serviço, profissional, data e cliente).");
      setIsSubmitting(false);
      return;
    }

    let apiRoute = "";
    let bookingPayload = {};
    const customerPayload = { name: customerName, phone: customerPhone.replace(/\D/g, "") };

    try {
      if (isManualMode) {
        // --- LÓGICA MODO MANUAL ---
        if (!manualTime) {
          toast.error("Por favor, insira um horário manual.");
          setIsSubmitting(false);
          return;
        }

        // Combina a data do calendário com a hora manual
        const [hours, minutes] = manualTime.split(":").map(Number);
        const finalDateTime = new Date(date);
        finalDateTime.setHours(hours, minutes, 0, 0); // Define a hora local

        apiRoute = `/api/barbershops/${barbershopId}/admin/bookings`; // Rota de admin
        bookingPayload = {
          service: serviceId,
          barber: barberId,
          customer: customerPayload,
          time: finalDateTime.toISOString(), // Envia em UTC
          status: manualStatus,
        };
      } else {
        // --- LÓGICA MODO PADRÃO (FUTURO) ---
        if (!time) {
          toast.error("Por favor, selecione um horário disponível.");
          setIsSubmitting(false);
          return;
        }
        apiRoute = `/barbershops/${barbershopId}/bookings`; // Rota normal
        bookingPayload = {
          service: serviceId,
          barber: barberId,
          time: new Date(`${format(date, "yyyy-MM-dd")}T${time}:00`).toISOString(),
          customer: customerPayload,
          // Status é 'booked' por padrão na API normal
        };
      }

      await apiClient.post(apiRoute, bookingPayload);
      toast.success("Agendamento criado com sucesso!");
      navigate(`/${barbershopId}/agendamentos`); // Redireciona de volta para a agenda
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Falha ao criar agendamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Novo Agendamento</h1>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Agendamento</CardTitle>
            <CardDescription>Preencha os dados abaixo para criar um novo agendamento para um cliente.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* --- NOVO SWITCH --- */}
            <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="manual-mode" className="text-base font-medium">
                  Agendamento Antigo (passado)
                </Label>
                <p className="text-xs text-muted-foreground">Para registrar um atendimento passado, em horário bloqueado ou fora do padrão.</p>
              </div>
              <Switch id="manual-mode" checked={isManualMode} onCheckedChange={setIsManualMode} />
            </div>

            {/* Seção do Agendamento */}
            <div className="space-y-4">
              <Label>Serviço *</Label>
              <Select onValueChange={(value) => handleInputChange("serviceId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label>Profissional *</Label>
              <Select onValueChange={(value) => handleInputChange("barberId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    locale={ptBR}
                    selected={formData.date}
                    onSelect={(date) => handleInputChange("date", date)}
                    initialFocus
                    // Removemos qualquer restrição de data passada
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* --- LÓGICA CONDICIONAL DE HORÁRIO --- */}
            {isManualMode ? (
              <div className="space-y-4">
                <Label htmlFor="manualTime">Horário Manual *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="manualTime"
                    type="time" // Input de hora
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Label>Horário Disponível *</Label>
                <Select onValueChange={(value) => handleInputChange("time", value)} disabled={isFetchingTimes || availableTimes.length === 0}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isFetchingTimes ? "Buscando horários..." : availableTimes.length === 0 ? "Nenhum horário disponível" : "Selecione um horário"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seção do Cliente */}
            <div className="space-y-4">
              <Label htmlFor="customerName">Nome do Cliente *</Label>
              <Input id="customerName" placeholder="João da Silva" onChange={(e) => handleInputChange("customerName", e.target.value)} required />
            </div>
            <div className="space-y-4">
              <Label htmlFor="customerPhone">Telefone do Cliente *</Label>
              <Input id="customerPhone" placeholder="(48) 99999-9999" onChange={(e) => handleInputChange("customerPhone", e.target.value)} required />
            </div>

            {/* --- STATUS (SOMENTE MODO MANUAL) --- */}
            {isManualMode && (
              <div className="space-y-4 md:col-span-2">
                <Label>Status do Agendamento *</Label>
                <Select value={manualStatus} onValueChange={(value: "completed" | "booked" | "canceled") => setManualStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" /> Concluído
                      </div>
                    </SelectItem>
                    <SelectItem value="booked">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-blue-600" /> Agendado
                      </div>
                    </SelectItem>
                    <SelectItem value="canceled">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" /> Cancelado
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Agendamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
