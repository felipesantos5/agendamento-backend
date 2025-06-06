// src/validations/barberValidation.js
import { z } from "zod";

export const barberSchema = z.object({
  name: z.string().min(2, "Nome do barbeiro é obrigatório"),
  image: z.string().url("URL da imagem inválida").optional().or(z.literal("")),
  email: z.string().email({ message: "Formato de email inválido." }),
  availability: z
    .array(
      z.object({
        day: z.string().min(3, "Dia da semana inválido"),
        start: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora deve ser HH:mm"),
        end: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora deve ser HH:mm"),
      })
    )
    .min(1, "Informe ao menos um dia de disponibilidade."),
});
