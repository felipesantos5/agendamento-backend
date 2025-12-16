export interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  isPlanService?: boolean;
}
