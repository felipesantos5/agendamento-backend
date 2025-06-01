import express from "express";
import mongoose, { Schema, model } from "mongoose";
import cors from "cors";
import { z } from "zod";
import twilio from "twilio";
import "dotenv/config";
import { parseISO, startOfDay, endOfDay } from "date-fns";

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
  customer: z.object({ name: z.string(), phone: z.string() }),
  time: z.string(),
});

const sendMessage = async (to, message) => {
  const client2 = "cliente2";
  client.messages
    .create({
      from: "whatsapp:+14155238886",
      // contentSid: "HX229f5a04fd0510ce1b071852155d3e75",
      // contentVariables: '{"1":"12/1","2":"3pm"}',
      body: `${client2} teste`,
      to: "whatsapp:+554891319311",
    })
    .then((message) => console.log(message));
};

// --- App Express ---
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173", // ou o URL do frontend de produção
    credentials: true,
  })
);

const accountSid = "ACfbf9955ebbc98189a60eb71e3f5b007b"; // Substitua pelo seu Account SID
const authToken = "03da1955e69c03b02972d14bb328d8b6"; // Substitua pelo seu Auth Token

// Inicialize o cliente Twilio
const client = twilio(accountSid, authToken);

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
  const message = `Novo agendamento: e`;
  const barbeiroNumber = "+14155238886"; // Assumindo que o número do barbeiro está no objeto barbershop

  res.json(await Service.find({ barbershop: req.params.id }));
});

// --- Agendamentos ---
// app.post("/barbershops/:id/bookings", async (req, res) => {
//   try {
//     const data = bookingSchema.parse({ ...req.body, barbershop: req.params.id });

//     // Verifica conflito de horário do barbeiro
//     const conflict = await Booking.findOne({
//       barber: data.barber,
//       time: new Date(data.time),
//     });
//     if (conflict) return res.status(409).json({ error: "Horário já agendado para esse barbeiro." });

//     const created = await Booking.create({ ...data, time: new Date(data.time) });

//     const message = `Novo agendamento: ${data.customer.name} - ${data.time}`;
//     const barbeiroNumber = "5548991319311"; // Assumindo que o número do barbeiro está no objeto barbersh

//     // await sendMessage(barbeiroNumber, message);

//     res.status(201).json(created);
//   } catch (e) {
//     res.status(400).json({ error: e.errors || e.message });
//   }
// });

app.get("/barbershops/:barbershopId/barbers/:barberId/free-slots", async (req, res) => {
  try {
    const { date } = req.query; // Espera "YYYY-MM-DD"
    const { barberId } = req.params;

    if (!date) {
      return res.status(400).json({ error: "A data deve ser fornecida." });
    }

    const barber = await Barber.findById(barberId);
    if (!barber) {
      return res.status(404).json({ error: "Barbeiro não encontrado." });
    }

    // `parseISO` converte "2025-06-02" para uma data em UTC no início do dia.
    const selectedDate = parseISO(date);

    // Mapeia o dia da semana (0=Domingo, 1=Segunda, etc.)
    const dayOfWeekName = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][selectedDate.getUTCDay()];

    const workHours = barber.availability.find((a) => a.day === dayOfWeekName);
    if (!workHours) {
      return res.json([]); // Retorna lista vazia se o barbeiro não trabalha
    }

    // Gera todos os slots de 30 minutos do dia
    const slotInterval = 30;
    const allSlots = [];
    const [startHour, startMinute] = workHours.start.split(":").map(Number);
    const [endHour, endMinute] = workHours.end.split(":").map(Number);

    const dayStart = new Date(selectedDate);
    dayStart.setUTCHours(startHour, startMinute, 0, 0);

    const dayEnd = new Date(selectedDate);
    dayEnd.setUTCHours(endHour, endMinute, 0, 0);

    let currentSlot = new Date(dayStart);
    while (currentSlot < dayEnd) {
      allSlots.push(currentSlot.toISOString().slice(11, 16)); // Formato "HH:mm"
      currentSlot.setUTCMinutes(currentSlot.getUTCMinutes() + slotInterval);
    }

    // Busca agendamentos existentes para o dia inteiro (em UTC)
    const bookings = await Booking.find({
      barber: barberId,
      time: {
        $gte: startOfDay(selectedDate),
        $lt: endOfDay(selectedDate),
      },
    });

    // Extrai apenas os horários "HH:mm" dos agendamentos existentes
    const bookedTimes = bookings.map(b => {
        const bookingDate = new Date(b.time);
        const hour = String(bookingDate.getUTCHours()).padStart(2, '0');
        const minute = String(bookingDate.getUTCMinutes()).padStart(2, '0');
        return `${hour}:${minute}`;
    });

    // Filtra os slots, retornando apenas os que NÃO estão na lista de agendados
    const freeSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

    res.json(freeSlots);

  } catch (error) {
    console.error("Erro ao buscar horários livres:", error);
    res.status(500).json({ error: "Erro interno ao processar a solicitação." });
  }
});

// Listar agendamentos da barbearia
app.post("/barbershops/:id/bookings", async (req, res) => {
  try {
    // 1. Validar os dados recebidos com Zod
    const data = bookingSchema.parse({
      ...req.body,
      barbershop: req.params.id,
    });

    const bookingTime = new Date(data.time);

    // 2. Verificar se o horário já foi agendado (dupla checagem de segurança)
    const conflict = await Booking.findOne({
      barber: data.barber,
      time: bookingTime,
    });

    if (conflict) {
      return res.status(409).json({ error: "Este horário acabou de ser preenchido. Por favor, escolha outro." });
    }

    // 3. Se não houver conflito, criar o agendamento no banco
    const createdBooking = await Booking.create({
      ...data,
      time: bookingTime,
    });

    res.status(201).json(createdBooking);

  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos.", details: e.errors });
    }
    res.status(500).json({ error: "Erro interno ao criar agendamento." });
  }
});

// Listar agendamentos do cliente
app.get("/customers/:phone/bookings", async (req, res) => {
  res.json(await Booking.find({ "customer.phone": req.params.phone }).populate("barbershop barber service"));
});

app.get("/barbers/:barberId/bookings", async (req, res) => {
  const { day } = req.query; // Ex: "2024-06-10"

  if (!day) return res.status(400).json({ error: "Informe o dia" });

  // Monta o início e fim do dia para o filtro
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T23:59:59.999Z`);

  const bookings = await Booking.find({
    barber: req.params.barberId,
    date: { $gte: start, $lte: end },
    status: { $ne: "canceled" },
  });
  res.json(bookings);
});

// dias disponveis
app.get("/barbers/:barberId/available-slots", async (req, res) => {
  const { day } = req.query;
  // Supondo horários das 08h às 18h, intervalos de 30min
  const slots = [];
  for (let i = 8; i < 18; i++) {
    slots.push(`${i.toString().padStart(2, "0")}:00`);
    slots.push(`${i.toString().padStart(2, "0")}:30`);
  }

  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T23:59:59.999Z`);

  const bookings = await Booking.find({
    barber: req.params.barberId,
    date: { $gte: start, $lte: end },
    status: { $ne: "canceled" },
  });

  // Mapeia horários ocupados
  const bookedTimes = bookings.map((b) => b.date.toISOString().slice(11, 16));
  const available = slots.filter((slot) => !bookedTimes.includes(slot));

  res.json({ slots: available });
});

// --- Inicialização ---
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
