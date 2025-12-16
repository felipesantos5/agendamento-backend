// frontend/src/components/personalInfo/index.tsx

import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";

const sectionAnimation = {
  initial: { opacity: 0, x: 50 }, // Começa invisível e 50px à direita
  animate: { opacity: 1, x: 0 }, // Anima para visível e na posição original
  exit: { opacity: 0, x: -50 }, // Anima para invisível e 50px à esquerda ao sair
  transition: { duration: 0.3, ease: "easeInOut" },
};

const PhoneFormat = (value: string = ""): string => {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

interface PersonalInfoProps {
  formData: {
    name: string;
    email?: string;
    phone: string;
    date: string; // Adicionando 'date' aqui se for usado no resumo
    time: string; // Adicionando 'time' aqui se for usado no resumo
    service?: string; // ID do serviço
    barber?: string; // ID do barbeiro (anteriormente attendant)
    [key: string]: string | undefined; // Permitir outros campos
  };
  updateFormData: (
    data: Partial<{ name: string; email: string; phone: string }>
  ) => void;
  // Props opcionais para exibir os nomes no resumo, se disponíveis
  serviceNameDisplay?: string;
  barberNameDisplay?: string;
}

export default function PersonalInfo({
  formData,
  updateFormData,
  serviceNameDisplay,
  barberNameDisplay,
}: PersonalInfoProps) {
  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const [phoneErrorMessage, setPhoneErrorMessage] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const digitsOnly = inputValue.replace(/\D/g, "");

    updateFormData({ phone: digitsOnly.slice(0, 11) }); // Limita a 11 dígitos no estado

    if (digitsOnly.length > 0 && digitsOnly.length < 11) {
      setIsPhoneValid(false);
    } else if (digitsOnly.length === 11) {
      // Poderia adicionar validação de DDDs válidos ou prefixos de celular aqui
      setIsPhoneValid(true);
      setPhoneErrorMessage("");
    } else if (digitsOnly.length === 0) {
      setIsPhoneValid(true); // Campo vazio é válido até ser 'required' no submit
      setPhoneErrorMessage("");
    } else {
      setIsPhoneValid(false); // Mais de 11 dígitos não é permitido pela formatação
      setPhoneErrorMessage("Número de celular muito longo.");
    }
  };

  // Formatar a data corretamente para exibição
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return "";
    // Corrige o problema do "dia anterior" interpretando a data como local
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexado no JS Date
      const day = parseInt(parts[2], 10);
      const localDate = new Date(year, month, day);
      return localDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
    return "Data inválida"; // Fallback
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="space-y-6"
        initial={sectionAnimation.initial}
        animate={sectionAnimation.animate}
        exit={sectionAnimation.exit}
        // transition={sectionAnimation.transition}
      >
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 text-center">
            Dados Pessoais
          </h2>
          {/* <p className="mt-1 text-sm text-gray-500">Por favor, informe seus dados de contato.</p> */}
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Nome Completo{" "}
              <span className="text-[var(--loja-theme-color)]">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--loja-theme-color)] focus:outline-none focus:ring-[var(--loja-theme-color)] sm:text-sm"
              placeholder="Seu nome completo"
              required
            />
          </div>

          {/*<div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email <span className="text-[var(--loja-theme-color)]">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={(e) => updateFormData({ email: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[var(--loja-theme-color)] focus:outline-none focus:ring-[var(--loja-theme-color)] sm:text-sm"
            placeholder="seu@email.com"
            required
          />
        </div>*/}

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Celular (WhatsApp){" "}
              <span className="text-[var(--loja-theme-color)]">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={PhoneFormat(formData.phone)}
              onChange={handlePhoneChange}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-[var(--loja-theme-color)] sm:text-sm ${
                !isPhoneValid && formData.phone.length > 0
                  ? "border-[var(--loja-theme-color)] focus:border-[var(--loja-theme-color)]"
                  : "border-gray-300 focus:border-[var(--loja-theme-color)]"
              }`}
              placeholder="(XX) XXXXX-XXXX"
              required
              maxLength={15} // Tamanho da string formatada (XX) XXXXX-XXXX
              minLength={15}
            />
            {!isPhoneValid && formData.phone.length > 0 && (
              <p className="mt-1 text-xs text-red-600">{phoneErrorMessage}</p>
            )}
          </div>
        </div>

        <div className="rounded-md bg-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-800">
            Resumo do Agendamento
          </h3>
          <div className="mt-2 space-y-1 text-sm text-gray-700">
            {formData.service && (
              <div className="flex justify-between">
                <span>Serviço:</span>
                <span className="font-medium">
                  {serviceNameDisplay || `ID: ${formData.service}`}
                </span>
              </div>
            )}

            {formData.barber && ( // Mudado de formData.attendant para formData.barber
              <div className="flex justify-between">
                <span>Profissional:</span>
                <span className="font-medium">
                  {barberNameDisplay || `ID: ${formData.barber}`}
                </span>
              </div>
            )}

            {formData.date && (
              <div className="flex justify-between">
                <span>Data:</span>
                <span className="font-medium capitalize">
                  {formatDateForDisplay(formData.date)}
                </span>
              </div>
            )}

            {formData.time && (
              <div className="flex justify-between">
                <span>Horário:</span>
                <span className="font-medium">{formData.time}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
