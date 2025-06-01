// frontend/src/pages/Loja.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

// Component Imports
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import ServiceSelection from "@/components/serviceSelection";
import DateTimeSelection from "@/components/dataTimeSelection";
import PersonalInfo from "@/components/personalInfo";
import StepIndicator from "@/components/stepIndicator";

// Type Definitions
type Barbershop = {
  _id: string;
  name: string;
};

type Service = {
  _id: string;
  name: string;
  // outros campos do serviço que você possa precisar
};

type Barber = {
  _id: string;
  name: string;
  // outros campos do barbeiro
};

// Initial state for our form, making it easy to reset
const initialFormData = {
  service: "",
  barber: "",
  date: "",
  time: "",
  name: "",
  email: "",
  phone: "",
};

export const Loja = () => {
  const { slug } = useParams<{ slug: string }>();

  console.log(`slug`, slug);

  // --- State Management ---
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
  const [formData, setFormData] = useState(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 3;

  // --- Data Fetching ---
  useEffect(() => {
    if (!slug) return;

    const fetchInitialData = async () => {
      try {
        const barbershopResponse = await axios.get(`http://localhost:3001/barbershops/slug/${slug}`);
        const currentBarbershop = barbershopResponse.data;
        setBarbershop(currentBarbershop);
        document.title = `Agendamento em ${currentBarbershop.name}`;

        if (currentBarbershop?._id) {
          // ✅ BUSCAR SERVIÇOS E BARBEIROS AQUI
          const servicesResponse = await axios.get(`http://localhost:3001/barbershops/${currentBarbershop._id}/services`);
          setAllServices(servicesResponse.data);

          const barbersResponse = await axios.get(`http://localhost:3001/barbershops/${currentBarbershop._id}/barbers`);
          setAllBarbers(barbersResponse.data);
        }
      } catch (error) {
        console.error("Erro ao buscar dados iniciais:", error);
        setMessage("Não foi possível carregar os dados da barbearia.");
      }
    };

    fetchInitialData();
  }, [slug]);

  // --- Form Navigation & Data Handling ---
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  // --- Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const { service, barber, date, time, name, phone } = formData;
    if (!service || !barber || !date || !time || !name || !phone) {
      setMessage("Por favor, preencha todos os campos em todas as etapas.");
      setIsSubmitting(false);
      return;
    }

    const bookingTimeISO = new Date(`${date}T${time}:00`).toISOString();
    const bookingPayload = {
      barbershop: barbershop?._id,
      barber: barber,
      service: service,
      time: bookingTimeISO,
      customer: {
        name: name,
        phone: phone.replace(/\D/g, ""), // Salva apenas os dígitos
      },
    };

    try {
      await axios.post(`http://localhost:3001/barbershops/${barbershop?._id}/bookings`, bookingPayload);
      setMessage("Agendamento realizado com sucesso! ✅");
      setFormData(initialFormData);
      setCurrentStep(1);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setMessage(err.response.data?.error ?? "Erro ao agendar. Tente outro horário.");
      } else {
        setMessage("Erro de conexão. Por favor, tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Lógica para encontrar nomes com base nos IDs ---
  const selectedServiceName = useMemo(() => {
    return allServices.find((s) => s._id === formData.service)?.name;
  }, [allServices, formData.service]);

  const selectedBarberName = useMemo(() => {
    return allBarbers.find((b) => b._id === formData.barber)?.name;
  }, [allBarbers, formData.barber]);

  // --- Render Logic ---
  if (!barbershop) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center text-lg">
        <p>{message || "Carregando barbearia..."}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-4 py-8 md:max-w-lg md:px-6 md:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Agende seu Horário</h1>
          <p className="mt-2 text-gray-600">
            Complete os passos abaixo para garantir seu horário em <span className="font-semibold">{barbershop.name}</span>
          </p>
        </div>

        <div className="mb-8">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm md:p-8">
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && (
              <ServiceSelection
                // ✅ PASSAR LISTAS PARA ServiceSelection
                services={allServices}
                barbers={allBarbers}
                selectedService={formData.service}
                selectedBarber={formData.barber}
                onSelectService={(serviceId) => updateFormData({ service: serviceId })}
                onSelectBarber={(barberId) => updateFormData({ barber: barberId })}
              />
            )}

            {currentStep === 2 && <DateTimeSelection formData={formData} updateFormData={updateFormData} barbershopId={barbershop?._id} selectedBarber={formData.barber} />}

            {currentStep === 3 && <PersonalInfo formData={formData} updateFormData={updateFormData} serviceNameDisplay={selectedServiceName} barberNameDisplay={selectedBarberName} />}

            <div className="mt-8 flex justify-between">
              <Button type="button" variant="outline" onClick={handlePrevious} className={`${currentStep === 1 ? "invisible" : ""}`}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>

              {currentStep < totalSteps ? (
                <Button type="button" onClick={handleNext} className="bg-rose-600 text-white hover:bg-rose-700">
                  Próximo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" className="bg-rose-600 text-white hover:bg-rose-700" disabled={isSubmitting}>
                  {isSubmitting ? "Agendando..." : "Confirmar Agendamento"}
                  <Check className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>

            {message && (
              <div className="mt-6 text-center">
                <p className={`text-sm ${message.includes("sucesso") ? "text-green-600" : "text-red-600"}`}>{message}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
};
