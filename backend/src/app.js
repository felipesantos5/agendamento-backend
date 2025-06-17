import express from "express";
import cors from "cors";
import "dotenv/config";
import { fileURLToPath } from "url";
import path from "path";

import connectDB from "./config/db.js";

import barbershopRoutes from "./routes/barbershopRoutes.js";
import barberRoutes from "./routes/barberRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import authAdminRoutes from "./routes/authAdminRoutes.js";

import { protectAdmin } from "./middleware/authAdminMiddleware.js";

import "./models/Barbershop.js";
import "./models/Barber.js";
import "./models/Service.js";
import "./models/Booking.js";

// Para obter o __dirname em projetos com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importe seu middleware
// import { setBarbershopContext } from './middlewares/barbershopContext.js'; // Se for usar globalmente

connectDB();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://barbeariagendamento.com.br",
  "https://admin.barbeariagendamento.com.br",
  "http://31.97.30.228:8088",
  "http://localhost:8088",
];

const corsOptions = {
  origin: function (origin, callback) {
    // A 'origin' é a URL que está fazendo a requisição para seu backend.

    // Permite requisições sem 'origin' (ex: Postman, apps mobile) E
    // verifica se a 'origin' da requisição está na sua lista de permitidas.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true); // Permite a requisição
    } else {
      callback(new Error("Não permitido pela política de CORS")); // Bloqueia a requisição
    }
  },
  credentials: true, // Importante para permitir o envio de cookies ou tokens de autorização
};

// 2. Use as novas opções no middleware cors
app.use(cors(corsOptions));

app.use(express.json());

app.use(express.static("public"));

// ✅ Servir arquivos estáticos da pasta 'public'
// Se app.js está em src/ e public/ está na raiz do backend/
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// --- Montando as Rotas ---
app.use("/barbershops", barbershopRoutes);

// O :barbershopId será acessível em barberRoutes via req.params.barbershopId se mergeParams=true
app.use("/barbershops/:barbershopId/barbers", barberRoutes);
app.use("/barbershops/:barbershopId/services", serviceRoutes);
app.use("/barbershops/:barbershopId/bookings", bookingRoutes); // bookingRoutes agora contém a sub-rota para free-slots
app.use("/api/upload", protectAdmin, uploadRoutes);
app.use("/barbershops/:barbershopId/analytics", protectAdmin, analyticsRoutes);

app.use("/api/auth/admin", authAdminRoutes);

// Exemplo de como você usaria o setBarbershopContext para as rotas da loja pública
// import { setBarbershopContext } from './middlewares/barbershopContext.js';
// app.get("/api/loja/:slugOuIdBarbearia/dados-publicos", setBarbershopContext, (req, res) => {
//   // req.barbershopIdContexto e req.barbershopNameContexto estão disponíveis
//   res.json({ id: req.barbershopIdContexto, name: req.barbershopNameContexto, outrosDados: "..." });
// });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
