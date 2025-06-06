// backend/src/routes/uploadRoutes.js

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Helper para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// --- Configuração Geral para Filtro de Imagem e Limites ---
const imageFileFilter = (req, file, cb) => {
  // Aceita apenas arquivos de imagem
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Apenas arquivos de imagem são permitidos! (PNG, JPG, GIF, WebP)"), false);
  }
};

const FIVE_MEGABYTES = 5 * 1024 * 1024;

// --- Configuração e Rota para LOGO DA BARBEARIA ---
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../../public/uploads/logos");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "logo-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadLogoMiddleware = multer({
  storage: logoStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: FIVE_MEGABYTES },
});

router.post("/logo", uploadLogoMiddleware.single("logoFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo de logo foi enviado." });
  }
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/logos/${req.file.filename}`;
  res.status(200).json({ message: "Logo enviada com sucesso!", logoUrl: fileUrl });
});

// --- ✅ NOVA CONFIGURAÇÃO E ROTA PARA PERFIL DO BARBEIRO ---

// 1. Configuração do Multer para salvar na pasta 'barbers'
const barberProfileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../../public/uploads/barbers");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "barber-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadBarberProfileMiddleware = multer({
  storage: barberProfileStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: FIVE_MEGABYTES },
});

// 2. Nova rota para upload de perfil do barbeiro
// O endpoint final será POST /api/upload/barber-profile
router.post(
  "/barber-profile",
  uploadBarberProfileMiddleware.single("profileImage"), // 'profileImage' é o nome do campo que o frontend enviará
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo de perfil foi enviado." });
    }
    // Constrói a URL pública do arquivo salvo na pasta 'barbers'
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/barbers/${req.file.filename}`;
    res.status(200).json({ message: "Imagem de perfil enviada com sucesso!", imageUrl: imageUrl });
  }
);

// Middleware de tratamento de erro para todas as rotas de upload neste arquivo
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: `Erro de upload (Multer): ${error.message}` });
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

export default router;
