import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button" // shadcn
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import axios from 'axios';

import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import ServiceSelection from "@/components/serviceSelection"
import DateTimeSelection from "@/components/dataTimeSelection"
import PersonalInfo from "@/components/personalInfo"
import StepIndicator from "@/components/stepIndicator"

type WorkingHour = { day: string; start: string; end: string }
type Address = {
  cep: string; estado: string; cidade: string; bairro: string; rua: string; numero: string; complemento?: string
}
type Barbershop = {
  _id: string
  name: string
  address: Address
  workingHours: WorkingHour[]
  contact: string
}
type Barber = { _id: string; name: string }
type Service = { _id: string; name: string; price: number }

export const Loja = () => {
  const { slug } = useParams(); // /loja/:id
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [id, setId] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedBarber, setSelectedBarber] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Busca dados da barbearia, barbeiros e serviços
  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      try {
        const barbershopResponse = await axios.get(`http://localhost:3001/barbershops/slug/${slug}`);
        setBarbershop(barbershopResponse.data);
        setId(barbershopResponse.data._id);

        document.title = barbershopResponse.data.name;
        const barbersResponse = await axios.get(`http://localhost:3001/barbershops/${barbershopResponse.data._id}/barbers`);
        setBarbers(barbersResponse.data);
      } catch (error) {
        console.error(error);
      }
    };


    fetchData();
  }, [slug]);

  // Validação simples de hora no range de funcionamento
  function horarioDisponivel(dia: string, date: string, hour: string) {
    if (!barbershop) return false;
    const d = new Date(date);
    const diaSemana = [
      "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
      "Quinta-feira", "Sexta-feira", "Sábado"
    ][d.getDay()];
    const work = barbershop.workingHours.find(w => w.day === diaSemana);
    if (!work) return false;
    return hour >= work.start && hour <= work.end;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    // Validação básica antes de enviar
    if (!date || !hour || !selectedService || !selectedBarber || !customerName || !customerWhatsapp) {
      setMessage("Preencha todos os campos!");
      setSubmitting(false);
      return;
    }
    // Monta a hora completa ISO
    const horarioAgendado = `${date}T${hour}:00.000Z`;
    try {
      const resp = await axios.post(`http://localhost:3001/barbershops/${barbershop?._id}/bookings`, {
        headers: { "Content-Type": "application/json" },
        body: {
          barbershop: id,
          barber: selectedBarber,
          service: selectedService,
          time: horarioAgendado,
          customer: { name: customerName, whatsapp: customerWhatsapp }
        }
      });
      if (!resp.ok) {
        const val = await resp.json();
        setMessage(val?.error ?? "Erro ao agendar, tente outro horário");
      } else {
        setMessage("Agendamento realizado com sucesso!");
        setCustomerName("");
        setCustomerWhatsapp("");
        setDate("");
        setHour("");
      }
    } catch (err) {
      setMessage("Erro na conexão ou no agendamento!");
    }
    setSubmitting(false);
  }

  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    service: "",
    attendant: "",
    date: "",
    time: "",
    name: "",
    email: "",
    phone: "",
  })

  const totalSteps = 3

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      window.scrollTo(0, 0)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo(0, 0)
    }
  }

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData({ ...formData, ...data })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you would submit the form data to your backend here
    alert("Appointment booked successfully!")
    console.log("Form submitted:", formData)
  }
  console.log("selectedBarber:", selectedBarber);
  // if (!barbershop) return <div className="p-8 text-center text-lg">Carregando barbearia...</div>

  return (
    <>
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-md px-4 py-8 md:max-w-lg md:px-6 md:py-12">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Book Your Hair Appointment</h1>
            <p className="mt-2 text-gray-600">Complete the steps below to schedule your visit</p>
          </div>

          <div className="mb-8">
            <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm md:p-8">
            <form onSubmit={handleSubmit}>
              {currentStep === 1 &&
                <ServiceSelection
                  selectedService={selectedService}
                  selectedBarber={selectedBarber}
                  onSelectService={setSelectedService}
                  onSelectBarber={setSelectedBarber}
                  id={barbershop?._id}
                />}

              {currentStep === 2 &&
                <DateTimeSelection
                  formData={formData}
                  updateFormData={updateFormData}
                />}

              {currentStep === 3 && <PersonalInfo formData={formData} updateFormData={updateFormData} />}

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className={`flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${currentStep === 1 ? "invisible" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </button>

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex items-center rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
                  >
                    Book Appointment
                    <Check className="ml-1 h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}