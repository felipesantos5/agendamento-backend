// backend/src/routes/uploadRoutes.js

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { requireRole } from "../middleware/authAdminMiddleware.js";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";

// Helper para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Função para garantir que o diretório de upload exista
const ensureUploadsDir = (dirPath) => {
  // O caminho é relativo à raiz do projeto DENTRO do contêiner
  const fullPath = path.resolve(dirPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return dirPath;
};

// --- Configuração Geral ---
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Apenas arquivos de imagem são permitidos!"), false);
  }
};
const FIVE_MEGABYTES = 5 * 1024 * 1024;
const multerLimits = { fileSize: FIVE_MEGABYTES };

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

const uploadLogoMiddleware = multer({ storage: logoStorage, fileFilter: imageFileFilter, limits: multerLimits });

// Rota para Logo
router.post("/logo", protectAdmin, requireRole("admin"), uploadLogoMiddleware.single("logoFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo de logo foi enviado." });
  }
  const fileUrl = `${process.env.API_URL}/uploads/logos/${req.file.filename}`; // Usa variável de ambiente para a URL base
  res.status(200).json({ message: "Logo enviada com sucesso!", logoUrl: fileUrl });
});

// --- Configuração para PERFIL DO BARBEIRO ---
const barberProfileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // ✅ SALVA NO CAMINHO CORRETO DENTRO DO CONTÊINER
    const destinationPath = "public/uploads/barbers";
    cb(null, ensureUploadsDir(destinationPath));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "barber-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadBarberProfileMiddleware = multer({ storage: barberProfileStorage, fileFilter: imageFileFilter, limits: multerLimits });

// Rota para Perfil do Barbeiro
router.post("/barber-profile", protectAdmin, requireRole("admin"), uploadBarberProfileMiddleware.single("profileImage"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo de perfil foi enviado." });
  }
  const imageUrl = `${process.env.API_URL}/uploads/barbers/${req.file.filename}`; // Usa variável de ambiente
  res.status(200).json({ message: "Imagem de perfil enviada com sucesso!", imageUrl: imageUrl });
});

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
