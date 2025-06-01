// src/validations/bookingValidation.js
import { z } from "zod";
import { ZodObjectId } from "./utils.js";

export const bookingSchema = z.object({
  // barbershop ID virá da URL
  barber: ZodObjectId, // ID do Barbeiro
  service: ZodObjectId, // ID do Serviço
  customer: z.object({
    name: z.string().min(2, "Nome do cliente é obrigatório"),
    // Ajuste para 'whatsapp' se for o caso, e adicione validação de formato de telefone
    phone: z
      .string()
      .regex(
        /^\d{10,11}$/,
        "Número de telefone inválido (apenas dígitos, 10 ou 11)"
      ),
  }),
  time: z.string().datetime({ message: "Formato de data e hora inválido" }), // ISO String
});
