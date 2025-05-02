import express from "express";
import mongoose, { Schema, model } from "mongoose";
import cors from "cors";
import { z } from "zod";
import "dotenv/config";

import Barbershop from "./models/Barbershop.js";
import { BarbershopSchema, BarbershopUpdateSchema } from "./validations/barbershopValidation.js";

// --- Conexão MongoDB ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Conexão com MongoDB estabelecida com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao conectar com o MongoDB:", error.message);
    process.exit(1);
  }
};

connectDB();

const Barber = model(
  "Barber",
  new Schema({
    name: String,
    barbershop: { type: Schema.Types.ObjectId, ref: "Barbershop" },
    availability: [{ day: String, start: String, end: String }],
  })
);

const Service = model(
  "Service",
  new Schema({
    name: String,
    description: String,
    price: Number,
    duration: Number, // minutos
    barbershop: { type: Schema.Types.ObjectId, ref: "Barbershop" },
  })
);

const Booking = model(
  "Booking",
  new Schema({
    barbershop: { type: Schema.Types.ObjectId, ref: "Barbershop" },
    barber: { type: Schema.Types.ObjectId, ref: "Barber" },
    service: { type: Schema.Types.ObjectId, ref: "Service" },
    customer: {
      name: String,
      phone: String,
      whatsapp: String,
    },
    time: Date,
    status: { type: String, default: "booked" },
  })
);

const barberSchema = z.object({
  name: z.string(),
  barbershop: z.string(),
  availability: z.array(z.object({ day: z.string(), start: z.string(), end: z.string() })),
});

const serviceSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
  duration: z.number(),
  barbershop: z.string(),
});

const bookingSchema = z.object({
  barbershop: z.string(),
  barber: z.string(),
  service: z.string(),
  customer: z.object({ name: z.string(), phone: z.string(), whatsapp: z.string() }),
  time: z.string(),
});

// --- App Express ---
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173", // ou o URL do frontend de produção
    credentials: true,
  })
);

// --- Barbearia ---
// CRIAÇÃO
app.post("/barbershops", async (req, res) => {
  try {
    const data = BarbershopSchema.parse(req.body);
    const created = await Barbershop.create(data);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

// LISTAR TODAS
app.get("/barbershops", async (_req, res) => {
  res.json(await Barbershop.find());
});

// LISTAR POR ID
app.get("/barbershops/:id", async (req, res) => {
  try {
    const barbershop = await Barbershop.findById(req.params.id);
    if (!barbershop) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }
    res.json(barbershop);
  } catch (e) {
    res.status(400).json({ error: "ID inválido" });
  }
});

// EDITAR (PUT — substitui os campos enviados)
app.put("/barbershops/:id", async (req, res) => {
  try {
    // Valida apenas os campos enviados
    const data = BarbershopUpdateSchema.parse(req.body);
    // Atualiza apenas os campos que chegaram (sem sobrescrever o resto)
    const updated = await Barbershop.findByIdAndUpdate(
      req.params.id,
      { $set: data }, // só os campos do req.body
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

// DELETAR POR ID
app.delete("/barbershops/:id", async (req, res) => {
  try {
    const deleted = await Barbershop.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }
    res.json({ message: "Barbearia removida com sucesso" });
  } catch (e) {
    res.status(400).json({ error: "ID inválido" });
  }
});

app.get("/barbershops/slug/:slug", async (req, res) => {
  try {
    const barbershop = await Barbershop.findOne({ slug: req.params.slug });
    if (!barbershop) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }
    res.json(barbershop); // Isso retorna o _id também!
  } catch (e) {
    res.status(400).json({ error: "Erro na busca pela barbearia" });
  }
});

// --- Funcionários (Barbeiros) ---
app.post("/barbershops/:id/barbers", async (req, res) => {
  try {
    const data = barberSchema.parse({
      ...req.body,
      barbershop: req.params.id,
    });
    const created = await Barber.create(data);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

app.get("/barbershops/:id/barbers", async (req, res) => {
  res.json(await Barber.find({ barbershop: req.params.id }));
});

// --- Serviços ---
app.post("/barbershops/:id/services", async (req, res) => {
  try {
    const data = serviceSchema.parse({
      ...req.body,
      barbershop: req.params.id,
    });
    const created = await Service.create(data);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

app.get("/barbershops/:id/services", async (req, res) => {
  res.json(await Service.find({ barbershop: req.params.id }));
});

// --- Agendamentos ---
app.post("/bookings", async (req, res) => {
  try {
    const data = bookingSchema.parse(req.body);

    // Verifica conflito de horário do barbeiro
    const conflict = await Booking.findOne({
      barber: data.barber,
      time: new Date(data.time),
    });
    if (conflict) return res.status(409).json({ error: "Horário já agendado para esse barbeiro." });

    const created = await Booking.create({ ...data, time: new Date(data.time) });

    // Mock WhatsApp: substituir pelo envio real
    console.log("[WhatsApp] ->", data.customer.whatsapp, "[Cliente] Agendamento confirmado");
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

// Listar agendamentos da barbearia
app.get("/barbershops/:id/bookings", async (req, res) => {
  res.json(await Booking.find({ barbershop: req.params.id }).populate("barber service"));
});

// Listar agendamentos do cliente
app.get("/customers/:phone/bookings", async (req, res) => {
  res.json(await Booking.find({ "customer.phone": req.params.phone }).populate("barbershop barber service"));
});

// --- Inicialização ---
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
