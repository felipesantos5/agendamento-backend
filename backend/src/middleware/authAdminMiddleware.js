import jwt from "jsonwebtoken";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;

export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.adminUser && req.adminUser.role === requiredRole) {
      next(); // Permite o acesso se a função for a correta
    } else {
      res.status(403).json({ error: "Acesso proibido: permissões insuficientes." });
    }
  };
};

export const protectAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.adminUser = decoded; // Adiciona os dados do token (userId, barbershopId, barbershopSlug) ao req

      // Opcional: Verificar se o barbershopId do token corresponde ao barbershopId da rota (se aplicável)
      if (req.params.barbershopId && req.adminUser.barbershopId !== req.params.barbershopId) {
        return res.status(403).json({ error: "Acesso não autorizado para esta barbearia." });
      }

      next();
    } catch (error) {
      console.error("Erro na verificação do token:", error.name);
      return res.status(401).json({ error: "Token inválido ou expirado. Acesso não autorizado." });
    }
  } else {
    return res.status(401).json({ error: "Token não fornecido. Acesso não autorizado." });
  }
};
