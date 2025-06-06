// frontend/src/types/index.ts

export interface Address {
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  complemento?: string;
}

export interface WorkingHour {
  day: string;
  start: string;
  end: string;
}

export interface Barbershop {
  _id: string;
  name: string;
  themeColor?: string;
  logoUrl?: string;
  instagramUrl?: string;
  whatsappNumber?: string;
  contact?: string; // Mantendo o contact se ainda for usado
  address: Address;
  workingHours: WorkingHour[];
}

export interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // em minutos
}

export interface Barber {
  _id: string;
  name: string;
  availability: Availability[]; // Supondo que Availability é parecido com WorkingHour
}

// Interface para a disponibilidade do barbeiro (se for diferente de WorkingHour)
export interface Availability {
  day: string;
  start: string;
  end: string;
}

// Você pode também definir os tipos para o formulário aqui
export interface BookingFormData {
  service: string;
  barber: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
}
