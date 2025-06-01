// backend/src/validations/utils.js
import { z } from "zod";

// Validador reutilizável para ObjectIds do MongoDB
export const ZodObjectId = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "ID inválido. Deve ser um ObjectId hexadecimal de 24 caracteres."
  );
