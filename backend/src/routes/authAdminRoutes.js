import express from "express";
import jwt from "jsonwebtoken";
import AdminUser from "../models/AdminUser.js"; // Ajuste o caminho se necessário
import Barbershop from "../models/Barbershop.js"; // Para buscar o slug
import "dotenv/config"; // Para JWT_SECRET

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET não está definido nas variáveis de ambiente.");
  process.exit(1);
}

// Rota de Login do Admin: POST /api/auth/admin/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    const user = await AdminUser.findOne({ email }).populate("barbershop", "slug name"); // Popula o slug e nome da barbearia
    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas." }); // Usuário não encontrado
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciais inválidas." }); // Senha incorreta
    }

    if (!user.barbershop) {
      return res.status(500).json({ error: "Usuário não associado a uma barbearia." });
    }

    const payload = {
      userId: user._id,
      barbershopId: user.barbershop._id,
      barbershopSlug: user.barbershop.slug, // Inclui o slug para facilitar o redirect no frontend
      barbershopName: user.barbershop.name,
      // você pode adicionar outras infos como 'role' se tiver
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" }); // Token expira em 24 horas

    res.json({
      message: "Login bem-sucedido!",
      token,
      user: {
        // Envia algumas infos úteis para o frontend
        email: user.email,
        barbershopId: user.barbershop._id,
        barbershopSlug: user.barbershop.slug,
        barbershopName: user.barbershop.name,
      },
    });
  } catch (error) {
    console.error("Erro no login do admin:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

export default router;
