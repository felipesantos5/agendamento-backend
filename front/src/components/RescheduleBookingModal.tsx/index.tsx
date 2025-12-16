// src/components/RescheduleBookingModal.tsx
import React, { useState } from "react";
import { PopulatedBooking } from "@/types/PopulatedBooking"; // Importe a tipagem
import DateTimeSelection from "../dataTimeSelection"; // Reutilizaremos o componente existente!
import { Button } from "@/components/ui/button";
import apiClient from "@/services/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RescheduleBookingModalProps {
  booking: any;
  onClose: () => void;
  onSuccess: (updatedBooking: PopulatedBooking) => void;
}

const RescheduleBookingModal: React.FC<RescheduleBookingModalProps> = ({
  booking,
  onClose,
  onSuccess,
}) => {
  // Estado local para a nova data e hora selecionadas
  const [newDateTime, setNewDateTime] = useState({ date: "", time: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Função para atualizar a data/hora selecionada no modal
  const handleDateTimeUpdate = (
    data: Partial<{ date: string; time: string }>
  ) => {
    setNewDateTime((prev) => ({ ...prev, ...data }));
  };

  // Função para confirmar a remarcação
  const handleConfirmReschedule = async () => {
    if (!newDateTime.date || !newDateTime.time) {
      toast.error("Por favor, selecione a nova data e horário.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newTimeISO = new Date(
        `${newDateTime.date}T${newDateTime.time}:00`
      ).toISOString();

      // Faz a requisição PATCH para o backend
      // Ajuste o endpoint conforme sua API
      const response = await apiClient.patch(
        `/barbershops/${booking.barbershop._id}/bookings/${booking._id}/reschedule`,
        { newTime: newTimeISO } // Envia a nova data/hora no formato ISO
      );

      if (response.status === 200) {
        onSuccess(response.data); // Chama a função de sucesso passando o agendamento atualizado
      } else {
        // Tratar outros status de sucesso se necessário
        toast.error("Resposta inesperada do servidor ao remarcar.");
      }
    } catch (error: any) {
      console.error("Erro ao remarcar:", error);
      toast.error(
        error.response?.data?.error ||
          "Não foi possível remarcar o horário. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formata a data/hora atual para exibição
  const currentFormattedDateTime = format(
    new Date(booking.time),
    "dd/MM/yyyy 'às' HH:mm",
    { locale: ptBR }
  );

  return (
    <div className="space-y-6 p-4">
      {/* Informações do Agendamento Atual */}
      <div className="text-sm space-y-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
        <p>
          <strong>Serviço:</strong> {booking.service.name}
        </p>
        <p>
          <strong>Profissional:</strong> {booking.barber.name}
        </p>
        <p>
          <strong>Horário Atual:</strong> {currentFormattedDateTime}
        </p>
      </div>

      {/* Componente DateTimeSelection para escolher novo horário */}
      {/* Passamos as props necessárias, incluindo o barbeiro e serviço do agendamento original */}
      <DateTimeSelection
        formData={newDateTime}
        updateFormData={handleDateTimeUpdate}
        barbershopId={booking.barbershop._id}
        selectedBarber={booking.barber._id}
        selectedServiceId={booking.service._id}
      />

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirmReschedule}
          disabled={isSubmitting || !newDateTime.date || !newDateTime.time}
          className="bg-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/90"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {isSubmitting ? "Remarcando..." : "Confirmar Remarcação"}
        </Button>
      </div>
    </div>
  );
};

export default RescheduleBookingModal;
