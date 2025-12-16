import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  highestCompletedStep: number;
  onStepClick: (step: number) => void;
}

export default function StepIndicator({ currentStep, highestCompletedStep, onStepClick }: StepIndicatorProps) {
  const steps = [
    { number: 1, title: "Serviço e Barbeiro" },
    { number: 2, title: "Data e Hora" },
    { number: 3, title: "Dados de contato" },
  ];

  // 1. Defina o total de passos para a barra de progresso funcionar
  const totalSteps = steps.length;

  return (
    <div className="relative">
      {/* Barra de progresso */}
      <div className="absolute left-0 top-4 h-0.5 w-full bg-gray-200" aria-hidden="true">
        <div
          className="h-0.5 bg-[var(--loja-theme-color)] transition-all duration-300"
          // 2. Use a variável totalSteps aqui
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>

      {/* Indicadores de passo */}
      <div className="relative flex justify-between">
        {steps.map((step) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          const isUnlocked = step.number <= highestCompletedStep;

          return (
            <div key={step.number} className="flex flex-col items-center text-center w-1/3">
              <button
                type="button"
                onClick={() => isUnlocked && onStepClick(step.number)}
                // O 'disabled' já previne o clique, mas o estilo do cursor melhora a UX
                disabled={!isUnlocked}
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold text-sm transition-all duration-300 z-10
                  ${
                    isActive
                      ? "border-[var(--loja-theme-color)] bg-[var(--loja-theme-color)] text-white"
                      : isCompleted
                      ? "border-[var(--loja-theme-color)] bg-white text-[var(--loja-theme-color)]"
                      : "border-gray-300 bg-white text-gray-400"
                  }
                `}
              >
                {/* Mostra um check se o passo foi concluído, senão o número */}
                {isCompleted ? <Check size={18} /> : step.number}
              </button>
              <span
                className={`
                mt-2 text-center text-xs font-medium md:text-sm
                ${isActive || isCompleted ? "text-gray-800" : "text-gray-400"}
              `}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
