// backend/src/routes/uploadRoutes.js

import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import "dotenv/config"; // Garante que as variáveis de ambiente sejam carregadas
import { protectAdmin, requireRole } from "../middleware/authAdminMiddleware.js"; // Supondo que este middleware exista

const router = express.Router();

// --- Configuração do Cloudinary ---
// Pega as credenciais das suas variáveis de ambiente (.env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// --- Configuração do Multer ---
// Usa armazenamento em memória para processar o arquivo antes de enviá-lo para a nuvem.
const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Apenas arquivos de imagem são permitidos!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
});

// --- Rota para Upload de LOGO DA BARBEARIA ---
// Endpoint: POST /api/upload/logo
router.post(
  "/logo",
  protectAdmin, // Garante que o usuário está logado
  requireRole("admin"), // Garante que o usuário tem permissão de admin
  upload.single("logoFile"), // Processa o arquivo do campo 'logoFile'
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo de logo foi enviado." });
      }

      // Envia o buffer do arquivo para o Cloudinary
      cloudinary.uploader
        .upload_stream(
          {
            folder: "barbershop_logos", // Salva em uma pasta específica no Cloudinary
            resource_type: "image",
          },
          (error, result) => {
            if (error || !result) {
              console.error("Cloudinary upload error:", error);
              return res.status(500).json({ error: "Falha no upload da imagem." });
            }
            // Retorna a URL segura e otimizada do Cloudinary
            res.status(200).json({ message: "Logo enviada com sucesso!", logoUrl: result.secure_url });
          }
        )
        .end(req.file.buffer);
    } catch (error) {
      console.error("Erro na rota de upload de logo:", error);
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  }
);

// --- ✅ NOVA ROTA PARA UPLOAD DE PERFIL DO BARBEIRO ---
// Endpoint: POST /api/upload/barber-profile
router.post(
  "/barber-profile",
  protectAdmin,
  requireRole("admin"),
  upload.single("profileImage"), // Espera um arquivo no campo 'profileImage'
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo de perfil foi enviado." });
      }

      // Envia o buffer do arquivo para o Cloudinary
      cloudinary.uploader
        .upload_stream(
          {
            folder: "barber_profiles", // Salva em uma pasta separada para organização
            resource_type: "image",
          },
          (error, result) => {
            if (error || !result) {
              console.error("Cloudinary upload error:", error);
              return res.status(500).json({ error: "Falha no upload da imagem de perfil." });
            }
            // Retorna a URL segura
            res.status(200).json({ message: "Imagem de perfil enviada com sucesso!", imageUrl: result.secure_url });
          }
        )
        .end(req.file.buffer);
    } catch (error) {
      console.error("Erro na rota de upload de perfil:", error);
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  }
);

// Middleware de tratamento de erro do Multer (genérico para todas as rotas neste arquivo)
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: `Erro de upload: ${error.message}` });
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

export default router;
