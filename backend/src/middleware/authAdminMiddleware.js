import jwt from "jsonwebtoken";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_COOKIE_NAME = "adminAuthToken";

export const protectAdmin = (req, res, next) => {
  let token = null;

  // 1. Tenta pegar o token do Header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // 2. Se não encontrou no header, tenta pegar do Cookie
  //    (req.cookies só existe por causa do middleware cookie-parser)
  if (!token && req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    token = req.cookies[AUTH_COOKIE_NAME];
  }

  // 3. Se encontrou o token (seja no header ou no cookie), verifica
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.adminUser = decoded; // Adiciona os dados do token ao req

      // Verificação opcional do barbershopId (continua igual)
      if (req.params.barbershopId && req.adminUser.barbershopId !== req.params.barbershopId) {
        return res.status(403).json({ error: "Acesso não autorizado para esta barbearia." });
      }

      next(); // Tudo certo, continua para a rota
    } catch (error) {
      // Se a verificação falhar (token inválido/expirado)
      console.error("Erro na verificação do token:", error.name);
      // Limpa o cookie inválido (se ele veio do cookie)
      if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
        res.clearCookie(AUTH_COOKIE_NAME);
      }
      return res.status(401).json({ error: "Token inválido ou expirado. Acesso não autorizado." });
    }
  } else {
    return res.status(401).json({ error: "Token não fornecido. Acesso não autorizado." });
  }
};

export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.adminUser && req.adminUser.role === requiredRole) {
      next(); // Permite o acesso se a função for a correta
    } else {
      res.status(403).json({ error: "Acesso proibido: permissões insuficientes." });
    }
  };
};
