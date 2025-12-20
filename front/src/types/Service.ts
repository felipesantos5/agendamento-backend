export interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  isPlanService?: boolean;
  plan?: {
    _id: string;
    name: string;
  } | string; // Pode ser populado (objeto) ou apenas o ID (string)
}
