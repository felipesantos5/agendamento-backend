// src/validations/barbershopValidation.ts
import { z } from "zod";

export const AddressSchema = z.object({
  cep: z.string().min(8, "CEP deve ter pelo menos 8 dígitos"),
  estado: z.string().min(2, "Informe o estado"),
  cidade: z.string().min(2, "Informe a cidade"),
  bairro: z.string().min(2, "Informe o bairro"),
  rua: z.string().min(2, "Informe a rua"),
  numero: z.string().min(1, "Informe o número"),
  complemento: z.string().optional(),
});

export const WorkingHourSchema = z.object({
  day: z.string().min(3),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:mm"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:mm"),
});

const hexColorRegex = /^#([0-9A-Fa-f]{6})$/;

export const BarbershopSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  description: z.string().max(300, "Descrição muito longa"),
  address: AddressSchema,
  logoUrl: z.string().url("URL inválida").optional(),
  contact: z.string().min(8, "Contato obrigatório"),
  instagram: z.string().optional(),
  slug: z.string().max(50, "Descrição muito longa"),
  workingHours: z.array(WorkingHourSchema).min(1, "Informe pelo menos um horário de funcionamento"),
  themeColor: z
    .string() // ✅ NOVO CAMPO
    .regex(hexColorRegex, "Cor primária deve ser um código hexadecimal válido (ex: #RRGGBB)")
    .optional() // Opcional na criação, usará o default do Mongoose
    .default("#D10000"), // Mesmo default do Mongoose, para consistência se o frontend não enviar
});

export const BarbershopUpdateSchema = BarbershopSchema.partial();
