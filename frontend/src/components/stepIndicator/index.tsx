interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const steps = [
    { number: 1, title: "Serviço e Barbeiro" },
    { number: 2, title: "Data e Hora" },
    { number: 3, title: "Dados de contato" },
  ];

  return (
    <div className="relative">
      {/* Progress bar */}
      <div className="absolute left-0 top-4 h-0.5 w-full bg-gray-200">
        <div
          className="h-0.5 bg-[var(--loja-theme-color)] transition-all duration-300"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="relative flex justify-between">
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                step.number === currentStep
                  ? "border-[var(--loja-theme-color)] bg-[var(--loja-theme-color)] text-white"
                  : step.number < currentStep
                  ? "border-[var(--loja-theme-color)] bg-white text-[var(--loja-theme-color)]"
                  : "border-gray-300 bg-white text-gray-400"
              }`}
            >
              {step.number}
            </div>
            <span className="mt-2 text-center text-xs font-medium md:text-sm">{step.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
