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

export const BarbershopSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  description: z.string().max(300, "Descrição muito longa"),
  address: AddressSchema,
  logoUrl: z.string().url("URL inválida").optional(),
  contact: z.string().min(8, "Contato obrigatório"),
  workingHours: z.array(WorkingHourSchema).min(1, "Informe pelo menos um horário de funcionamento"),
});

export const BarbershopUpdateSchema = BarbershopSchema.partial();
