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

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

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
