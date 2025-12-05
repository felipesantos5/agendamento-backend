export interface Data {
  barbershop: Barbershop | null;
  barbers: Barber[];
  services: Service[];
  id: string;
  // customer: Customer;
  date: string;
  hour: string;
  message: string;
  submitting: boolean;
}

// Você precisará definir as interfaces Barbershop, Barber e Service
// com base nos seus schemas do Mongoose.

interface Barbershop {
  _id: string;
  name: string;
  description: string;
  address: {
    cep: string;
    estado: string;
    cidade: string;
    bairro: string;
    rua: string;
    numero: string;
    complemento?: string;
  };
  logoUrl?: string;
  contact: string;
  slug: string;
  workingHours: {
    day: string;
    start: string;
    end: string;
  }[];
}

interface Break {
  enabled: boolean;
  start: string;
  end: string;
  days: string[];
}

export interface Barber {
  _id: string;
  name: string;
  barbershop: string;
  availability: {
    day: string;
    start: string;
    end: string;
  }[];
  break?: Break;
}

interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  barbershop: string;
}

export interface PopulatedBooking {
  _id: string;
  time: string; // Vem como string no formato ISO da API
  status: "booked" | "confirmed" | "completed" | "canceled";
  review?: string; // ID da avaliação, opcional
  paymentStatus?: string;
  // Campos que foram populados e podem ser nulos se o item original foi deletado
  customer: {
    _id: string;
    name: string;
    phone: string;
  } | null;

  barber: {
    _id: string;
    name: string;
  } | null;

  service: {
    _id: string;
    name: string;
    price: number;
    duration: number;
  } | null;

  barbershop: {
    _id: string;
    name: string;
    slug: string;
  } | null;
}
