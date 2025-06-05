import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Helper para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// --- Configuração do Multer para Upload de Logos ---
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // O __dirname aqui é 'backend/src/routes'
    // Precisamos subir dois níveis para chegar na raiz do backend e então acessar 'public/uploads/logos'
    const uploadPath = path.join(__dirname, "../../public/uploads/logos");

    // Cria o diretório se não existir (síncrono para simplicidade aqui, mas pode ser assíncrono)
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Define um nome de arquivo único para evitar sobrescrever
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "logo-" + uniqueSuffix + path.extname(file.originalname)); // Adicionado 'logo-' para clareza
  },
});

const imageFileFilter = (req, file, cb) => {
  // Aceita apenas arquivos de imagem
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Apenas arquivos de imagem são permitidos! (PNG, JPG, GIF, WebP)"), false);
  }
};

const uploadLogoMiddleware = multer({
  storage: logoStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB para a logo
});

// --- Rota para Upload de Logo ---
// Esta rota será montada em /api/upload, então o endpoint final será POST /api/upload/logo
router.post(
  "/logo",
  uploadLogoMiddleware.single("logoFile"), // 'logoFile' é o nome do campo no FormData
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo de logo foi enviado." });
    }
    // Constrói a URL pública do arquivo
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/logos/${req.file.filename}`;
    res.status(200).json({ message: "Logo enviada com sucesso!", logoUrl: fileUrl });
  },
  // Middleware de tratamento de erro específico para esta rota de upload
  (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      // Um erro do Multer ocorreu ao fazer upload (ex: arquivo muito grande).
      return res.status(400).json({ error: `Erro de upload (Multer): ${error.message}` });
    } else if (error) {
      // Outro erro (ex: filtro de tipo de arquivo).
      return res.status(400).json({ error: error.message });
    }
    // Se tudo estiver ok, mas não foi um upload (improvável aqui), passe para o próximo.
    next();
  }
);

export default router;
