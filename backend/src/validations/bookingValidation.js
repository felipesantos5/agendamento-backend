// src/validations/bookingValidation.js
import { z } from "zod";
import { ZodObjectId } from "./utils.js";

export const bookingSchema = z.object({
  barber: ZodObjectId,
  service: ZodObjectId,
  customer: z.object({
    name: z.string(),
    phone: z
      .string()
      .regex(
        /^\d{10,11}$/,
        "Número de telefone inválido (apenas dígitos, 10 ou 11)"
      ),
  }),
  time: z.string().datetime({ message: "Formato de data e hora inválido" }),
});
