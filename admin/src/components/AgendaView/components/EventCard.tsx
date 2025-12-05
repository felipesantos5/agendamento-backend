import { PopulatedBooking } from "@/types/barberShop";
import { format } from "date-fns";
import { EventProps } from "react-big-calendar";

interface AgendaEvent {
  _id: string;
  title: string;
  start: Date;
  end: Date;
  resource: PopulatedBooking & { color: string }; // O agendamento completo com a cor
}

export const AgendaEvent = ({ event }: EventProps<AgendaEvent>) => {
  return (
    <div className="p-1 text-white text-xs h-full overflow-hidden">
      {/* Mostra o horário do agendamento */}
      <strong className="font-bold truncate flex gap-4">
        {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
        <div className="block truncate opacity-80">{event.resource.service?.name}</div>
      </strong>
      {/* Mostra o nome do cliente */}
      <div className="block truncate">{event.resource.customer?.name}</div>
      {/* Mostra o nome do serviço em uma fonte menor */}
    </div>
  );
};
