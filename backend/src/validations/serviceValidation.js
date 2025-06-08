import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(2, "Nome do serviço é obrigatório"),
  price: z.number().positive("O preço deve ser positivo"),
  duration: z.number().int().positive("A duração deve ser um número positivo de minutos"),
  // barbershop ID será adicionado pelo controller/rota
});
