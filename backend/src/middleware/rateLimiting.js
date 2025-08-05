import rateLimit from "express-rate-limit";

export const appointmentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  limit: 5, // Máximo de 5 tentativas de agendamento por IP a cada 10 minutos
  message: {
    error:
      "Limite de criação de agendamentos atingido. Por favor, aguarde 10 minutos para tentar novamente.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
