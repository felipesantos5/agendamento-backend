import { z } from "zod";

const barberBaseSchema = z.object({
  name: z.string().min(2, "Nome do funcionário é obrigatório"),

  // --- CAMPO ADICIONADO ---
  // Torna o email opcional na base
  email: z.string().email({ message: "Formato de email inválido." }).optional(),
  // -------------------------

  image: z.string().url("URL da imagem inválida").optional().or(z.literal("")),
  availability: z
    .array(
      z.object({
        day: z.string().min(3, "Dia da semana inválido"),
        start: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora deve ser HH:mm"),
        end: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora deve ser HH:mm"),
      })
    )
    .optional(),
  break: z
    .object({
      enabled: z.boolean().default(false),
      start: z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Formato de hora deve ser HH:mm")
        .default("12:00"),
      end: z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Formato de hora deve ser HH:mm")
        .default("13:00"),
      days: z
        .array(z.string())
        .default([])
        .refine(
          (days) =>
            days.every((day) => ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"].includes(day)),
          "Dias da semana inválidos"
        ),
    })
    .optional()
    .default({
      enabled: false,
      start: "12:00",
      end: "13:00",
      days: [],
    }),
  commission: z.number().optional().default(0),
  productCommission: z.number().optional().default(0),
});

export const barberCreationSchema = barberBaseSchema.extend({
  // Sobrescreve 'email' para torná-lo obrigatório na criação
  email: z.string().email({ message: "Formato de email inválido." }),
  // Se você também envia a senha inicial no mesmo payload, adicione aqui:
  // password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
});

// barberUpdateSchema agora herdará o 'email' opcional do barberBaseSchema
export const barberUpdateSchema = barberBaseSchema;
