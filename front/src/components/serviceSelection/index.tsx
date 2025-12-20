import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PriceFormater } from "@/helper/priceFormater";
import { Barber } from "@/types/barberShop";
import { CheckCircle2, ArrowLeft, Star, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Service } from "@/types/Service";
import { CustomerCredit } from "@/pages/loja/sections/BookingPane";

// Interface de props que o componente espera receber do componente pai
interface ServiceSelectionProps {
  selectedService: string;
  selectedBarber: string;
  onSelectService: (id: string) => void;
  onSelectBarber: (id: string) => void;
  services: Service[];
  barbers: Barber[];
  customerCredits?: CustomerCredit[];
  isAuthenticated?: boolean;
}

const sectionAnimation = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" },
};

export default function ServiceSelection({
  selectedService,
  selectedBarber,
  onSelectService,
  onSelectBarber,
  services,
  barbers,
  customerCredits = [],
  isAuthenticated = false,
}: ServiceSelectionProps) {
  // Função para extrair o ID do plano (seja string ou objeto populado)
  const getPlanId = (plan?: { _id: string; name: string } | string): string | undefined => {
    if (!plan) return undefined;
    return typeof plan === "string" ? plan : plan._id;
  };

  // Função para buscar créditos disponíveis para um plano específico
  const getCreditsForPlan = (plan?: { _id: string; name: string } | string) => {
    const planId = getPlanId(plan);
    if (!planId || !isAuthenticated) return null;
    return customerCredits.find((c) => c.planId === planId);
  };
  // Estado para controlar qual visualização está ativa: 'services' ou 'barbers'
  const [view, setView] = useState<"services" | "barbers">("services");

  const handleServiceClick = (serviceId: string) => {
    onSelectService(serviceId);
    // Ao selecionar um serviço, muda para a visualização de barbeiros
    setView("barbers");
    // CORREÇÃO: Rola a tela para o topo suavemente
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBarberClick = (barberId: string) => {
    onSelectBarber(barberId);
  };

  const handleBackToServices = () => {
    // Ao voltar, limpa a seleção de barbeiro e muda a visualização
    onSelectBarber("");
    setView("services");
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {view === "services" && (
          <motion.div
            key="services"
            initial={sectionAnimation.initial}
            animate={sectionAnimation.animate}
            exit={sectionAnimation.exit}
            className="space-y-4"
          >
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-semibold text-gray-900">Escolha o Serviço</h2>
              {/* <p className="mt-1 text-sm text-gray-500">Clique no serviço que você deseja agendar.</p> */}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((service) => {
                const isSelected = service._id === selectedService;
                const planCredits = service.isPlanService ? getCreditsForPlan(service.plan) : null;
                const hasCredits = planCredits && planCredits.creditsRemaining > 0;

                return (
                  <Button
                    key={service._id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => handleServiceClick(service._id)}
                    className={`h-auto p-4 flex flex-col items-start w-full text-left transition-all ${
                      isSelected
                        ? "bg-[var(--loja-theme-color)] text-white hover:bg-[var(--loja-theme-color)]/90 border-transparent shadow-lg"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div>
                        <p className="font-semibold max-w-[200px] whitespace-break-spaces">{service.name}</p>
                        <p className={`text-xs ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>{service.duration} min</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {service.isPlanService ? (
                          <span className={`flex items-center gap-1 font-bold text-sm ${isSelected ? "text-white" : "text-[var(--loja-theme-color)]"}`}>
                            <Star size={16} className="fill-current" />
                            Plano
                          </span>
                        ) : (
                          <span className={`font-bold text-lg ${isSelected ? "text-white" : "text-[var(--loja-theme-color)]"}`}>
                            {PriceFormater(service.price)}
                          </span>
                        )}
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-white" />}
                      </div>
                    </div>

                    {/* Mostrar créditos disponíveis para serviços de plano */}
                    {service.isPlanService && (
                      <div className={`mt-2 flex items-center gap-1 text-xs ${isSelected ? "text-white/90" : "text-gray-600"}`}>
                        <Ticket size={14} />
                        {hasCredits ? (
                          <span className="font-medium">
                            {planCredits.creditsRemaining} crédito{planCredits.creditsRemaining !== 1 ? "s" : ""} disponível
                          </span>
                        ) : isAuthenticated ? (
                          <span className="text-red-500">Sem créditos - Assine o plano</span>
                        ) : (
                          <span>Faça login para usar seus créditos</span>
                        )}
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* --- VISUALIZAÇÃO DE BARBEIROS --- */}
        {view === "barbers" && (
          <motion.div
            key="barbers" // Chave única
            initial={sectionAnimation.initial}
            animate={sectionAnimation.animate}
            exit={sectionAnimation.exit}
            className="space-y-4"
          >
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-semibold text-gray-900">Escolha o Profissional</h2>
              {/* <p className="mt-1 text-sm text-gray-500 md:ml-12">Selecione com quem você quer ser atendido.</p> */}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {barbers.map((barber) => {
                const isSelected = barber._id === selectedBarber;
                return (
                  <Button
                    key={barber._id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => handleBarberClick(barber._id)}
                    className={`h-auto p-3 flex justify-start items-center gap-4 w-full text-left transition-all ${
                      isSelected
                        ? "bg-[var(--loja-theme-color)] text-white hover:bg-[var(--loja-theme-color)]/90 border-transparent shadow-lg"
                        : "bg-white"
                    }`}
                  >
                    <Avatar>
                      <AvatarImage src={barber.image} className="object-cover" />
                      <AvatarFallback>{barber.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">{barber.name}</span>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-white ml-auto" />}
                  </Button>
                );
              })}
              <Button type="button" variant="outline" size="icon" onClick={handleBackToServices}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
