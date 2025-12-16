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
  description?: string;
  themeColor?: string;
  slug: string;
  logoUrl?: string;
  instagram?: string;
  whatsappNumber?: string;
  contact?: string; // Mantendo o contact se ainda for usado
  address: Address;
  workingHours: WorkingHour[];
  paymentsEnabled?: boolean;
}

export interface Barber {
  _id: string;
  name: string;
  image: string;
  availability: Availability[];
}

// Interface para a disponibilidade do barbeiro (se for diferente de WorkingHour)
export interface Availability {
  day: string;
  start: string;
  end: string;
}
