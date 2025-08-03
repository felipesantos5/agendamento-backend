import rateLimit from "express-rate-limit";

// Rate limiting específico para criação de agendamentos
export const appointmentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  limit: 5, // máximo 3 agendamentos por 10 minutos por IP
  message: {
    error:
      "Limite de agendamentos atingido. Aguarde 10 minutos para fazer um novo agendamento.",
    retryAfter: 10 * 60, // segundos
    code: "APPOINTMENT_LIMIT_EXCEEDED",
  },
  standardHeaders: true, // Inclui headers com info do rate limit
  legacyHeaders: false,
  // Não conta requests que falharam na validação
  skipFailedRequests: true,
  // Não conta requests bem-sucedidos (opcional)
  skipSuccessfulRequests: false,
  // Função para gerar chave única (IP + User ID se logado)
  keyGenerator: (req) => {
    return req.user
      ? `appointment:${req.ip}:${req.user.id}`
      : `appointment:${req.ip}`;
  },
});
