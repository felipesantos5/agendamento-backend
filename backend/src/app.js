process.on("uncaughtException", (error) => {
  console.error("🔥 ERRO NÃO TRATADO (Uncaught Exception):", error);
  // Em produção, é recomendado reiniciar a aplicação após um erro desses,
  // pois o estado dela pode estar corrompido.
  // process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 ERRO NÃO TRATADO (Unhandled Rejection):", reason);
});

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
import commissionRoutes from "./routes/commission.js";
import blockedDayRoutes from "./routes/blockedDayRoutes.js";
import authCustomerRoutes from "./routes/authCustomerRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import healthcheckRoutes from "./routes/healtcheck.js";
import planRoutes from "./routes/planRoutes.js";
import timeBlockRoutes from "./routes/admin/timeBlockRoutes.js";
import customerAdminRoutes from "./routes/admin/customerRoutes.js";
import productRoutes from "./routes/products.js";
import paymentRoutes from "./routes/paymentRoutes.js";

import { protectAdmin } from "./middleware/authAdminMiddleware.js";

import "./services/schedulerService.js";

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
  "https://www.admin.barbeariagendamento.com.br",
  "http://31.97.30.228:8088",
  "https://www.barbeariagendamento.com.br",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Não permitido pela política de CORS"));
    }
  },
  credentials: true,
};

// 2. Use as novas opções no middleware cors
// app.use(cors(corsOptions));

app.set("trust proxy", 1);

app.use(cors({ origin: "*", credentials: true }));

app.use(express.json());

app.use(express.static("public"));

app.use("/api", healthcheckRoutes);
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
app.use(
  "/barbershops/:barbershopId/commissions",
  protectAdmin,
  commissionRoutes
);
app.use("/api/barbershops/:barbershopId/blocked-days", blockedDayRoutes);
app.use("/api/barbershops/:barbershopId/reviews", reviewRoutes);
app.use("/api/barbershops/:barbershopId/plans", planRoutes);

app.use("/api/auth/customer", customerRoutes);

app.use("/api/auth/customer", authCustomerRoutes);

app.use("/api/auth/admin", authAdminRoutes);
app.use("/api/barbershops/:barbershopId/admin/customers", customerAdminRoutes);
app.use("/api/barbershops/:barbershopId/products", productRoutes);

// admin

app.use("/api/barbershops/:barbershopId/time-blocks", timeBlockRoutes);
app.use("/api/barbershops/:barbershopId/bookings", paymentRoutes);

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
