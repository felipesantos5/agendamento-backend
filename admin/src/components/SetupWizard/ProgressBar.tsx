import { Check, Scissors, Users, Store } from "lucide-react";

interface ProgressBarProps {
  currentStep: number;
  completedSteps: number[];
}

const steps = [
  { number: 1, label: "Serviços", icon: Scissors },
  { number: 2, label: "Barbeiros", icon: Users },
  { number: 3, label: "Sua Barbearia", icon: Store },
];

export function ProgressBar({ currentStep, completedSteps }: ProgressBarProps) {
  return (
    <div className="w-full px-6 py-6 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between relative">
        {/* Linha de conexão */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 mx-12" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-emerald-500 mx-12 transition-all duration-500"
          style={{
            width: `${((Math.max(0, currentStep - 1) + (completedSteps.includes(currentStep) ? 1 : 0)) / (steps.length - 1)) * (100 - 20)}%`,
          }}
        />

        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.number);
          const isCurrent = currentStep === step.number;
          const Icon = step.icon;

          return (
            <div key={step.number} className="flex flex-col items-center relative z-10">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm
                  ${isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-blue-600 text-white ring-4 ring-blue-100"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium transition-colors duration-300
                  ${isCurrent ? "text-blue-600" : isCompleted ? "text-emerald-600" : "text-gray-700"}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
