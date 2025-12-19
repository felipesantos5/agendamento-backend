import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { Link } from "react-router-dom";

// Usaremos a tipagem que você já tem, adaptada para as props
interface Barbershop {
  name: string;
  logoUrl?: string;
}

interface ShopHeaderProps {
  barbershop: Barbershop;
  onBookNowClick: () => void; // Função para rolar para a seção de agendamento
}

export function ShopHeader({ barbershop, onBookNowClick }: ShopHeaderProps) {
  return (
    <header className="flex flex-col items-center text-center p-4 sm:p-6 relative">
      <Avatar className="w-36 h-36 border-4 border-white dark:border-gray-800 shadow-lg mb-4 mt-4">
        <AvatarImage src={barbershop.logoUrl} alt={barbershop.name} />
        <AvatarFallback>{barbershop.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <h1 className="text-3xl font-bold mb-4">{barbershop.name}</h1>
      <Button onClick={onBookNowClick} size="lg" className="w-full max-w-xs bg-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/90">
        Agendar Agora
      </Button>
      <Link to="/meus-agendamentos" className="w-full mt-3 mb-2">
        <Button onClick={onBookNowClick} size="lg" className=" w-full max-w-xs border-[var(--loja-theme-color)] border bg-white text-black hover:bg-[var(--loja-theme-color)]/90 hover:text-white">
          Reagendar/Cancelar Agendamentos
        </Button>
      </Link>
    </header>
  );
}
