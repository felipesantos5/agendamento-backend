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
import cookieParser from "cookie-parser";
import "dotenv/config";
import { fileURLToPath } from "url";
import path from "path";

import connectDB from "./config/db.js";
import helmet from "helmet";
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
import dashboardRoutes from "./routes/admin/dashboardRoutes.js";
import barberPerformanceRoutes from "./routes/admin/barberPerformanceRoutes.js";
import manualBookingRoutes from "./routes/admin/manualBookingRoute.js";
import leadRoutes from "./routes/form/lead.routes.js";
import authSuperAdminRoutes from "./routes/authSuperAdminRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import subscriptionPaymentRoutes from "./routes/subscriptionPaymentRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";

import { protectAdmin, checkAccountStatus } from "./middleware/authAdminMiddleware.js";
import { protectSuperAdmin } from "./middleware/authSuperAdminMiddleware.js";

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

app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://barbeariagendamento.com.br",
  "https://admin.barbeariagendamento.com.br",
  "https://www.admin.barbeariagendamento.com.br",
  "http://31.97.30.228:8088",
  "https://www.barbeariagendamento.com.br",
  "https://barbeariagendamento.com.br/",
  "https://formulario.barbeariagendamento.com.br",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (como Postman) ou de origens na lista
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Não permitido pela política de CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
// app.use(cors({ origin: "*", credentials: true }));

app.use(helmet());
app.use(cookieParser());
app.use(express.json());

app.use(express.static("public"));

app.use("/api", healthcheckRoutes);
// ✅ Servir arquivos estáticos da pasta 'public'
// Se app.js está em src/ e public/ está na raiz do backend/
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// --- Montando as Rotas ---
app.use("/barbershops", barbershopRoutes);
app.use("/api/barbershops", whatsappRoutes);
// Webhook do WhatsApp Evolution API (rota separada sem autenticação)
app.use("/api/whatsapp", whatsappRoutes);

// O :barbershopId será acessível em barberRoutes via req.params.barbershopId se mergeParams=true
app.use("/barbershops/:barbershopId/barbers", barberRoutes);
app.use("/barbershops/:barbershopId/services", serviceRoutes);
app.use("/barbershops/:barbershopId/bookings", bookingRoutes); // bookingRoutes agora contém a sub-rota para free-slots
app.use("/api/upload", protectAdmin, checkAccountStatus, uploadRoutes);
app.use("/barbershops/:barbershopId/analytics", protectAdmin, checkAccountStatus, analyticsRoutes);
app.use("/barbershops/:barbershopId/commissions", protectAdmin, checkAccountStatus, commissionRoutes);
app.use("/api/barbershops/:barbershopId/blocked-days", protectAdmin, checkAccountStatus, blockedDayRoutes);
app.use("/api/barbershops/:barbershopId/reviews", reviewRoutes);
app.use("/api/barbershops/:barbershopId/plans", planRoutes);

app.use("/api/auth/customer", customerRoutes);

app.use("/api/auth/customer", authCustomerRoutes);

app.use("/api/auth/admin", authAdminRoutes);
app.use("/api/barbershops/:barbershopId/admin/customers", protectAdmin, checkAccountStatus, customerAdminRoutes);
app.use("/api/barbershops/:barbershopId/products", productRoutes);

// admin

app.use("/api/barbershops/:barbershopId/time-blocks", protectAdmin, checkAccountStatus, timeBlockRoutes);
app.use("/api/barbershops/:barbershopId/bookings", paymentRoutes);
app.use("/api/barbershops/:barbershopId/subscriptions", subscriptionPaymentRoutes);
app.use("/api/barbershops/:barbershopId/dashboard-metrics", protectAdmin, checkAccountStatus, dashboardRoutes);
app.use("/api/barbershops/:barbershopId/barber-performance", protectAdmin, checkAccountStatus, barberPerformanceRoutes);
app.use("/api/barbershops/:barbershopId/admin/bookings", protectAdmin, checkAccountStatus, manualBookingRoutes);

// Form
app.use('/api/leads', leadRoutes);

// Super Admin
app.use("/api/auth/superadmin", authSuperAdminRoutes);
app.use("/api/superadmin", protectSuperAdmin, superAdminRoutes);

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
