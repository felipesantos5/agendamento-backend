// backend/src/routes/uploadRoutes.js

import express from "express";
import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { fileURLToPath } from "url";
import { requireRole } from "../middleware/authAdminMiddleware.js";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";

// Helper para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Configura o Multer para usar armazenamento em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Função para garantir que o diretório de upload exista
const ensureUploadsDir = (dirPath) => {
  // O caminho é relativo à raiz do projeto DENTRO do contêiner
  const fullPath = path.resolve(dirPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return dirPath;
};

const FIVE_MEGABYTES = 5 * 1024 * 1024;

// --- Configuração para LOGO DA BARBEARIA ---
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // ✅ SALVA NO CAMINHO CORRETO DENTRO DO CONTÊINER
    // Este é o caminho que o Coolify está mapeando com o volume.
    const destinationPath = "public/uploads/logos";
    cb(null, ensureUploadsDir(destinationPath));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "logo-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Rota para Logo
router.post("/logo", upload.single("logoFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    // Faz o upload do buffer do arquivo para o Cloudinary
    const uploadResult = await cloudinary.uploader
      .upload_stream(
        { folder: "barbershop_logos" }, // Opcional: organiza em pastas
        (error, result) => {
          if (error || !result) {
            return res.status(500).json({ error: "Falha no upload para o Cloudinary." });
          }
          // Retorna a URL segura fornecida pelo Cloudinary
          res.status(200).json({ logoUrl: result.secure_url });
        }
      )
      .end(req.file.buffer);
  } catch (error) {
    console.error("Erro no upload:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// --- Configuração para PERFIL DO BARBEIRO ---

// Rota para Perfil do Barbeiro
// router.post("/barber-profile", protectAdmin, requireRole("admin"), uploadBarberProfileMiddleware.single("profileImage"), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: "Nenhum arquivo de perfil foi enviado." });
//   }
//   const imageUrl = `${process.env.API_URL}/uploads/barbers/${req.file.filename}`; // Usa variável de ambiente
//   res.status(200).json({ message: "Imagem de perfil enviada com sucesso!", imageUrl: imageUrl });
// });

// Tratamento de erro genérico do Multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: `Erro de upload: ${error.message}` });
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

export default router;
