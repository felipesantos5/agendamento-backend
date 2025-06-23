// frontend/src/pages/Loja.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

// Component Imports
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import ServiceSelection from "@/components/serviceSelection";
import DateTimeSelection from "@/components/dataTimeSelection";
import PersonalInfo from "@/components/personalInfo";
import StepIndicator from "@/components/stepIndicator";
import { SocialLinks } from "@/components/socialLinks";
import { Service } from "@/types/barberShop";
import { API_BASE_URL } from "@/config/BackendUrl";

// Type Definitions
type Barbershop = {
  _id: string;
  name: string;
  logoUrl: string;
  themeColor: string;
  instagram: string;
  contact: string;
};

type Barber = {
  _id: string;
  name: string;
  image?: string;
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
  const navigate = useNavigate();

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
        const barbershopResponse = await axios.get(`${API_BASE_URL}/barbershops/slug/${slug}`);
        const currentBarbershop = barbershopResponse.data;
        setBarbershop(currentBarbershop);
        document.title = `${currentBarbershop.name}`;

        if (currentBarbershop?.themeColor) {
          document.documentElement.style.setProperty("--loja-theme-color", currentBarbershop.themeColor);
        }

        if (currentBarbershop?._id) {
          // ✅ BUSCAR SERVIÇOS E BARBEIROS AQUI
          const servicesResponse = await axios.get(`${API_BASE_URL}/barbershops/${currentBarbershop._id}/services`);
          setAllServices(servicesResponse.data);

          const barbersResponse = await axios.get(`${API_BASE_URL}/barbershops/${currentBarbershop._id}/barbers`);
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
      const response = await axios.post(`${API_BASE_URL}/barbershops/${barbershop?._id}/bookings`, bookingPayload);

      if (response.status === 201 && barbershop) {
        navigate("/agendamento-sucesso", {
          replace: true,
          state: {
            bookingDetails: {
              barbershopName: barbershop.name,
              customerName: name,
              serviceName: selectedServiceName || "Serviço Indisponível",
              barberName: selectedBarberName || "Profissional Indisponível",
              date: date,
              time: time,
            },
            barbershopSlug: slug,
          },
        });
      } else {
        setMessage("Houve um problema ao confirmar seu agendamento");
      }
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

  // ... dentro do seu componente Loja, antes do return

  // Lógica para desabilitar o botão "Próximo" condicionalmente
  let isNextButtonDisabled = false;
  if (currentStep === 1) {
    // Na primeira etapa, desabilita se serviço OU barbeiro não estiverem selecionados
    isNextButtonDisabled = !formData.service || !formData.barber;
  } else if (currentStep === 2) {
    // Na segunda etapa, desabilita se data OU hora não estiverem selecionadas
    isNextButtonDisabled = !formData.date || !formData.time;
  }
  // Para currentStep === 3, o botão "Próximo" não é mostrado, é o de "Confirmar Agendamento".

  // --- Render Logic ---
  if (!barbershop) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center text-lg">
        <p>{message || "Carregando barbearia..."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="bg-gray-50 flex-grow">
        <div className="mx-auto max-w-md pb-4 md:max-w-2xl lg:max-w-4xl md:px-6 md:pb-8">
          <div>{barbershop.logoUrl && <img src={barbershop.logoUrl} alt="logo barbearia" className="w-full max-h-60 m-auto mb-6" />}</div>

          <div className="mb-8 px-4 md:px-0">
            <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm md:p-8">
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
              <div className="flex-grow">
                {currentStep === 1 && (
                  <ServiceSelection
                    services={allServices}
                    barbers={allBarbers}
                    selectedService={formData.service}
                    selectedBarber={formData.barber}
                    onSelectService={(serviceId) => updateFormData({ service: serviceId })}
                    onSelectBarber={(barberId) => updateFormData({ barber: barberId })}
                  />
                )}

                {currentStep === 2 && (
                  <DateTimeSelection
                    formData={formData}
                    updateFormData={updateFormData}
                    barbershopId={barbershop?._id}
                    selectedBarber={formData.barber}
                    selectedServiceId={formData.service}
                  />
                )}

                {currentStep === 3 && (
                  <PersonalInfo
                    formData={formData}
                    updateFormData={updateFormData}
                    serviceNameDisplay={selectedServiceName}
                    barberNameDisplay={selectedBarberName}
                  />
                )}
              </div>

              <div className="mt-8 flex justify-between">
                <Button type="button" variant="outline" onClick={handlePrevious} className={`cursor-pointer ${currentStep === 1 ? "invisible" : ""}`}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Voltar
                </Button>

                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-[var(--loja-theme-color)] text-white cursor-pointer hover:brightness-90 hover:bg-[var(--loja-theme-color)]"
                    disabled={isNextButtonDisabled}
                  >
                    Próximo
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-[var(--loja-theme-color)] text-white hover:brightness-90 hover:bg-[var(--loja-theme-color)] cursor-pointer"
                    disabled={isSubmitting}
                  >
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
      {barbershop && <SocialLinks instagramUrl={barbershop.instagram} whatsappNumber={barbershop.contact} barbershopName={barbershop.name} />}
    </div>
  );
};
