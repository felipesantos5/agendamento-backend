// src/app.js
import express from "express";
import cors from "cors";
import "dotenv/config";

import connectDB from "./config/db.js"; // Conexão com o DB

// Importe seus routers
import barbershopRoutes from "./routes/barbershopRoutes.js";
import barberRoutes from "./routes/barberRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";

// Importe seus modelos para que o Mongoose os conheça, caso não sejam importados nas rotas
import "./models/Barbershop.js";
import "./models/Barber.js";
import "./models/Service.js";
import "./models/Booking.js";

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

// --- Montando as Rotas ---
app.use("/barbershops", barbershopRoutes);

// Para rotas aninhadas como /barbershops/:barbershopId/barbers
// O :barbershopId será acessível em barberRoutes via req.params.barbershopId se mergeParams=true
app.use("/barbershops/:barbershopId/barbers", barberRoutes);
app.use("/barbershops/:barbershopId/services", serviceRoutes);
app.use("/barbershops/:barbershopId/bookings", bookingRoutes); // bookingRoutes agora contém a sub-rota para free-slots

// Rotas de Cliente e outras rotas que não foram refatoradas
// app.get("/customers/:phone/bookings", ...);
// app.get("/barbers/:barberId/bookings", ...); // Esta pode ser parte de barberRoutes ou bookingRoutes

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
