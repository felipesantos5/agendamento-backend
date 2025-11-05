import rateLimit from "express-rate-limit";

export const appointmentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  limit: 10, // Máximo de 5 tentativas de agendamento por IP a cada 10 minutos
  message: {
    error: "Limite de criação de agendamentos atingido. Por favor, aguarde 10 minutos para tentar novamente.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limita tentativas de login (com e-mail/senha ou e-mail/otp)
 * 15 tentativas a cada 15 minutos por IP.
 */

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: {
    error: "Muitas tentativas de login deste IP. Por favor, tente novamente após 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limita solicitações de OTP (para evitar abuso do serviço de WhatsApp)
 * 5 solicitações a cada 10 minutos por IP.
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: {
    error: "Muitas solicitações de código. Por favor, tente novamente após 10 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
