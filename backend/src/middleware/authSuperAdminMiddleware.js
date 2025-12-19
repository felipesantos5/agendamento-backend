import jwt from "jsonwebtoken";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;
const SUPER_ADMIN_COOKIE_NAME = "superAdminAuthToken";

export const protectSuperAdmin = (req, res, next) => {
  let token = null;

  // 1. Tenta pegar o token do Header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // 2. Se não encontrou no header, tenta pegar do Cookie
  if (!token && req.cookies && req.cookies[SUPER_ADMIN_COOKIE_NAME]) {
    token = req.cookies[SUPER_ADMIN_COOKIE_NAME];
  }

  // 3. Se encontrou o token, verifica
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Verifica se é realmente um super admin
      if (!decoded.isSuperAdmin) {
        return res.status(403).json({ error: "Acesso negado. Permissão de super admin necessária." });
      }

      req.superAdmin = decoded;
      next();
    } catch (error) {
      console.error("Erro na verificação do token super admin:", error.name);
      // Limpa o cookie inválido
      if (req.cookies && req.cookies[SUPER_ADMIN_COOKIE_NAME]) {
        res.clearCookie(SUPER_ADMIN_COOKIE_NAME);
      }
      return res.status(401).json({ error: "Token inválido ou expirado." });
    }
  } else {
    return res.status(401).json({ error: "Token não fornecido. Acesso não autorizado." });
  }
};
