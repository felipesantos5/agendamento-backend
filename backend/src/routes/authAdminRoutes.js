import express from "express";
import jwt from "jsonwebtoken";
import AdminUser from "../models/AdminUser.js";
import "dotenv/config";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../services/emailService.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET não está definido.");
  process.exit(1);
}

// Nome do cookie que será usado (o mesmo definido no protectAdmin)
const AUTH_COOKIE_NAME = "adminAuthToken";

// Rota de Login do Admin: POST /api/auth/admin/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    const user = await AdminUser.findOne({ email }).populate("barbershop", "slug name");
    if (!user || !(await user.comparePassword(password))) {
      // Combina as verificações
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    if (!user.barbershop) {
      return res.status(500).json({ error: "Usuário não associado a uma barbearia." });
    }

    const payload = {
      userId: user._id,
      barbershopId: user.barbershop._id,
      barbershopSlug: user.barbershop.slug,
      barbershopName: user.barbershop.name,
      role: user.role,
      barberProfileId: user.barberProfile,
    };

    // Gera o token JWT (igual a antes)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "365d" });

    // ---- ADIÇÃO: Definir o Cookie HttpOnly ----
    const cookieOptions = {
      httpOnly: true, // Impede acesso via JavaScript no navegador
      secure: process.env.NODE_ENV === "production", // Usa 'secure' (HTTPS) apenas em produção
      sameSite: "Lax", // Proteção CSRF ('Strict' pode ser muito restritivo)
      maxAge: 365 * 24 * 60 * 60 * 1000, // Tempo de vida do cookie (365 dias em milissegundos)
      path: "/", // Cookie acessível em todo o site
    };
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
    // ---------------------------------------------

    // Envia a resposta JSON (igual a antes)
    res.json({
      message: "Login bem-sucedido!",
      token, // Continua enviando o token no corpo para o localStorage
      user: {
        email: user.email,
        barbershopId: user.barbershop._id,
        barbershopSlug: user.barbershop.slug,
        barbershopName: user.barbershop.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Erro no login do admin:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

router.post("/set-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token e senha são obrigatórios." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres." });
    }

    // Hasheia o token recebido para comparar com o que está no banco
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Encontra o usuário pelo token e verifica se não expirou
    const user = await AdminUser.findOne({
      accountSetupToken: hashedToken,
      accountSetupTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        error: "Token inválido ou expirado. Solicite um novo convite.",
      });
    }

    // Define a nova senha, atualiza o status e limpa os campos do token
    user.password = password; // O hook pre-save fará o hash
    user.status = "active";
    user.accountSetupToken = undefined;
    user.accountSetupTokenExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Senha definida com sucesso! Agora você pode fazer o login.",
    });
  } catch (error) {
    console.error("Erro ao definir senha:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await AdminUser.findOne({ email });

    // IMPORTANTE: Sempre retorne uma mensagem de sucesso, mesmo que o e-mail
    // não exista, para evitar que descubram quais e-mails estão cadastrados.
    if (!user) {
      return res.status(200).json({
        message: "Se um e-mail cadastrado for encontrado, um link de redefinição será enviado.",
      });
    }

    // 1. Gerar token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // 2. Salvar o token HASHED no banco de dados para segurança
    user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetExpires = Date.now() + 3600000; // Expira em 1 hora

    await user.save();

    // 3. Enviar o token original (NÃO HASHED) por e-mail
    await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({
      message: "Se um e-mail cadastrado for encontrado, um link de redefinição será enviado.",
    });
  } catch (error) {
    console.error("Erro em /forgot-password:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ROTA: POST /api/auth/admin/reset-password/:token
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "A nova senha é obrigatória." });
    }

    // 1. Converter o token recebido para o mesmo formato hashed do banco
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 2. Encontrar o usuário pelo token hashed E verificar se não expirou
    const user = await AdminUser.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }, // $gt: greater than (maior que)
    });

    if (!user) {
      return res.status(400).json({ error: "Token inválido ou expirado." });
    }

    // 3. Atualizar a senha
    user.password = password; // O pre-save hook do seu model vai fazer o hash
    user.passwordResetToken = undefined; // Limpar o token
    user.passwordResetExpires = undefined; // Limpar a data de expiração

    await user.save();

    // 4. (Opcional) Gerar um novo token de login e logar o usuário automaticamente
    // ... (sua lógica de jwt.sign que já existe no /login)

    res.status(200).json({ success: true, message: "Senha redefinida com sucesso!" });
  } catch (error) {
    console.error("Erro em /reset-password:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

export default router;
