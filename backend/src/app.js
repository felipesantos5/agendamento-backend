import express from "express";
import mongoose, { Schema, model } from "mongoose";
import cors from "cors";
import { z } from "zod";
import twilio from "twilio";
import "dotenv/config";
import { parseISO, startOfDay, endOfDay } from "date-fns";

import Barbershop from "./models/Barbershop.js";
import {
  BarbershopSchema,
  BarbershopUpdateSchema,
} from "./validations/barbershopValidation.js";

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
  availability: z.array(
    z.object({ day: z.string(), start: z.string(), end: z.string() })
  ),
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

// --- App Express ---
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173", // ou o URL do frontend de produção
    credentials: true,
  })
);

async function setBarbershopContext(req, res, next) {
  const identifier = req.params.slugOuIdBarbearia; // Pega o identificador da URL

  if (!identifier) {
    // Se suas rotas não tiverem esse parâmetro, você precisaria de outra forma
    // de identificar a barbearia (ex: um cabeçalho X-Barbershop-Slug)
    return res
      .status(400)
      .json({ error: "Identificador da barbearia não fornecido na rota." });
  }

  try {
    let barbershopContext;
    // Verifica se o identificador é um ObjectId válido
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      barbershopContext = await Barbershop.findById(identifier)
        .select("_id name")
        .lean();
    } else {
      // Se não for ObjectId, assume que é um slug
      barbershopContext = await Barbershop.findOne({ slug: identifier })
        .select("_id name")
        .lean();
    }

    if (!barbershopContext) {
      return res.status(404).json({ error: "Barbearia não encontrada." });
    }

    // Adiciona o ID da barbearia (e talvez o nome) ao objeto da requisição
    // para que as rotas subsequentes possam usá-lo.
    req.barbershopIdContexto = barbershopContext._id.toString();
    req.barbershopNameContexto = barbershopContext.name;
    next(); // Prossegue para a próxima função de middleware ou para a rota
  } catch (error) {
    console.error("Erro no middleware setBarbershopContext:", error);
    return res
      .status(500)
      .json({ error: "Erro interno ao definir o contexto da barbearia." });
  }
}

const accountSid = "ACfbf9955ebbc98189a60eb71e3f5b007b"; // Substitua pelo seu Account SID
const authToken = "48d997484cb70c6a082f98dbe43e1091"; // Substitua pelo seu Auth Token
const twilioWhatsappNumber = "+14155238886";

// Inicialize o cliente Twilio
const client = twilio(accountSid, authToken);

async function sendWhatsAppConfirmation(
  customerName,
  customerPhone,
  bookingDate
) {
  try {
    // Formata a data e hora para uma leitura amigável
    const formattedDate = new Date(bookingDate).toLocaleDateString("pt-BR");
    const formattedTime = new Date(bookingDate).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    const messageBody = `Olá, ${customerName}! Seu agendamento para o dia ${formattedDate} às ${formattedTime} foi confirmado com sucesso. ✅`;

    await client.messages.create({
      from: `whatsapp:${twilioWhatsappNumber}`,
      to: `whatsapp:+55${customerPhone}`, // Garante o formato internacional
      body: messageBody,
      // Para produção com templates, o formato seria um pouco diferente:
      // contentSid: 'SEU_CONTENT_SID_DO_TEMPLATE',
      // contentVariables: JSON.stringify({
      //   1: customerName,
      //   2: formattedDate,
      //   3: formattedTime,
      // }),
    });

    console.log(`Mensagem de confirmação enviada para ${customerName}`);
  } catch (error) {
    console.error("Erro ao enviar mensagem de WhatsApp:", error);
    // É importante que um erro aqui não impeça o agendamento de ser confirmado para o usuário.
    // Você pode querer adicionar um sistema de log ou alerta para esses casos.
  }
}

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
app.post("/barbershops/:id/bookings", async (req, res) => {
  try {
    const data = bookingSchema.parse({
      ...req.body,
      barbershop: req.params.id,
    });

    const bookingTime = new Date(data.time);

    const conflict = await Booking.findOne({
      barber: data.barber,
      time: bookingTime,
    });

    if (conflict) {
      return res.status(409).json({
        error:
          "Este horário acabou de ser preenchido. Por favor, escolha outro.",
      });
    }

    const createdBooking = await Booking.create({
      ...data,
      time: bookingTime,
    });

    // ✅ CHAMA A FUNÇÃO DE ENVIO APÓS O SUCESSO DO AGENDAMENTO ✅
    if (createdBooking) {
      // Chama a função sem esperar (em "segundo plano") para não atrasar a resposta ao frontend
      sendWhatsAppConfirmation(
        createdBooking.customer.name,
        createdBooking.customer.phone,
        createdBooking.time
      );
    }

    res.status(201).json(createdBooking);
  } catch (e) {
    console.error("ERRO AO CRIAR AGENDAMENTO:", e);
    // ... (resto do seu 'catch' block)
  }
});

app.get(
  "/barbershops/:barbershopId/barbers/:barberId/free-slots",
  async (req, res) => {
    try {
      const { date } = req.query;
      const { barberId } = req.params;

      if (!date || !barberId) {
        return res
          .status(400)
          .json({ error: "Data e ID do barbeiro são obrigatórios." });
      }

      const barber = await Barber.findById(barberId);
      if (!barber) return res.json([]);

      const selectedDate = parseISO(date);
      const dayOfWeekName = [
        "Domingo",
        "Segunda-feira",
        "Terça-feira",
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
        "Sábado",
      ][selectedDate.getUTCDay()];
      const workHours = barber.availability.find(
        (a) => a.day === dayOfWeekName
      );

      if (!workHours) return res.json([]);

      // ✅ CORREÇÃO: Geração de horários locais de forma simples e direta
      const allLocalSlots = [];
      const [startHour, startMinute] = workHours.start.split(":").map(Number);
      const [endHour, endMinute] = workHours.end.split(":").map(Number);
      const slotInterval = 30; // 30 minutos

      let currentHour = startHour;
      let currentMinute = startMinute;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMinute < endMinute)
      ) {
        const timeString = `${String(currentHour).padStart(2, "0")}:${String(
          currentMinute
        ).padStart(2, "0")}`;
        allLocalSlots.push(timeString);

        currentMinute += slotInterval;
        if (currentMinute >= 60) {
          currentHour++;
          currentMinute = 0;
        }
      }

      // Busca os agendamentos existentes (esta parte já estava correta)
      const bookings = await Booking.find({
        barber: barberId,
        time: { $gte: startOfDay(selectedDate), $lt: endOfDay(selectedDate) },
      });

      // Converte a hora UTC do banco para a hora local do Brasil (esta parte já estava correta)
      const bookedTimes = new Set(
        bookings.map((booking) => {
          return new Date(booking.time).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo", // Fuso horário do Brasil
          });
        })
      );

      // Mapeia todos os horários locais e adiciona o status 'isBooked'
      const slotsWithStatus = allLocalSlots.map((time) => ({
        time: time,
        isBooked: bookedTimes.has(time),
      }));

      res.json(slotsWithStatus);
    } catch (error) {
      console.error("Erro ao buscar status dos horários:", error);
      res
        .status(500)
        .json({ error: "Erro interno ao processar a solicitação." });
    }
  }
);

// Listar agendamentos da barbearia
app.get("/barbershops/:id/bookings", async (req, res) => {
  try {
    const barbershopId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }

    const bookings = await Booking.find({ barbershop: barbershopId })
      .populate("barber", "name") // Popula o barbeiro e pega apenas o nome
      .populate("service", "name price"); // Popula o serviço e pega nome e preço

    res.json(bookings);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    res.status(500).json({ error: "Falha ao buscar agendamentos." });
  }
});

// Listar agendamentos do cliente
app.get("/customers/:phone/bookings", async (req, res) => {
  res.json(
    await Booking.find({ "customer.phone": req.params.phone }).populate(
      "barbershop barber service"
    )
  );
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
