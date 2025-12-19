import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./ProgressBar";
import { StepServices } from "./StepServices";
import { StepBarbers } from "./StepBarbers";
import { StepBarbershop } from "./StepBarbershop";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/config/BackendUrl";
import apiClient from "@/services/api";
import logo from "../../assets/logo-png.png"
interface Service {
  _id: string;
  name: string;
  price: number;
  duration: number;
}

interface Barber {
  _id: string;
  name: string;
}

interface SetupWizardProps {
  barbershopId: string;
  barbershopName: string;
  onComplete: () => void;
}

export function SetupWizard({ barbershopId, barbershopName, onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  // Carrega dados existentes (se houver)
  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        const [servicesRes, barbersRes] = await Promise.all([
          apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/services`),
          apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/barbers`),
        ]);
        setServices(servicesRes.data || []);
        setBarbers(barbersRes.data || []);
      } catch (error) {
        console.error("Erro ao carregar dados existentes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingData();
  }, [barbershopId]);

  const getCompletedSteps = () => {
    const completed: number[] = [];
    if (services.length >= 1) completed.push(1);
    if (barbers.length >= 1) completed.push(2);
    return completed;
  };

  const canAdvance = () => {
    if (currentStep === 1) return services.length >= 1;
    if (currentStep === 2) return barbers.length >= 1;
    return true;
  };

  const handleNext = () => {
    if (canAdvance() && currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pt-0">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-4">
          {/* <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Scissors className="w-8 h-8 text-blue-600" />
          </div> */}
          <img src={logo} alt="Logo BarbeariAgendamento" className="w-20 mx-auto mb-4" />
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Configure sua barbearia</h1>
          <p className="text-gray-700 text-">
            Complete os cadastros abaixo para que seus clientes possam agendar
          </p>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Progress bar */}
          <ProgressBar currentStep={currentStep} completedSteps={getCompletedSteps()} />

          {/* Conteúdo do step */}
          <div className="p-6 min-h-[400px] pt-3">
            {currentStep === 1 && (
              <StepServices
                barbershopId={barbershopId}
                services={services}
                onServicesChange={setServices}
              />
            )}
            {currentStep === 2 && (
              <StepBarbers
                barbershopId={barbershopId}
                barbers={barbers}
                onBarbersChange={setBarbers}
              />
            )}
            {currentStep === 3 && (
              <StepBarbershop
                barbershopId={barbershopId}
                barbershopName={barbershopName}
                servicesCount={services.length}
                barbersCount={barbers.length}
                onComplete={onComplete}
                isCompleting={isCompleting}
                setIsCompleting={setIsCompleting}
              />
            )}
          </div>

          {/* Footer com botões */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>

        {/* Dica */}
        <p className="text-center text-gray-400 text-xs mt-4">
          Você pode alterar todas as configurações depois no painel administrativo
        </p>
      </div>
    </div>
  );
}
