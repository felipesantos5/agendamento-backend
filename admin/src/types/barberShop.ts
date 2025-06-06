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

interface Barber {
  _id: string;
  name: string;
  barbershop: string;
  availability: {
    day: string;
    start: string;
    end: string;
  }[];
}

interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  barbershop: string;
}
