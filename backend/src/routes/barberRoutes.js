// src/routes/barberRoutes.js
import express from "express";
import mongoose from "mongoose";
import Barber from "../models/Barber.js";
import AdminUser from "../models/AdminUser.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import { barberSchema as BarberValidationSchema } from "../validations/barberValidation.js";
import { z } from "zod";
import { parseISO, startOfDay, endOfDay, format as formatDateFns } from "date-fns";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";
import { requireRole } from "../middleware/authAdminMiddleware.js";
import { ptBR } from "date-fns/locale";
import crypto from "crypto";
import "dotenv/config";

const router = express.Router({ mergeParams: true }); // mergeParams é importante para acessar :barbershopId

const BRAZIL_TIMEZONE = "America/Sao_Paulo";

// Adicionar Barbeiro a uma Barbearia
// Rota: POST /barbershops/:barbershopId/barbers
router.post("/", protectAdmin, requireRole("admin"), async (req, res) => {
  try {
    // ... (sua validação de autorização) ...
    const data = BarberValidationSchema.parse(req.body);

    const existingAdminUser = await AdminUser.findOne({ email: data.email });
    if (existingAdminUser) {
      return res.status(409).json({ error: "Este email já está em uso." });
    }

    const newBarber = await Barber.create({
      name: data.name,
      image: data.image,
      availability: data.availability,
      barbershop: req.params.barbershopId,
    });

    // ✅ GERAÇÃO DO TOKEN
    const setupToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(setupToken).digest("hex");

    // O token expira em, por exemplo, 72 horas
    const tokenExpiration = Date.now() + 72 * 60 * 60 * 1000;

    if (newBarber) {
      await AdminUser.create({
        email: data.email,
        role: "barber",
        barbershop: req.params.barbershopId,
        barberProfile: newBarber._id,
        status: "pending",
        accountSetupToken: hashedToken,
        accountSetupTokenExpires: new Date(tokenExpiration),
      });
    }

    // ✅ Retorna o link de configuração para o admin frontend
    // Em um app real, você enviaria este link por email para data.email
    const setupLink = `${process.env.ADMIN_FRONTEND_URL}/configurar-senha/${setupToken}`;

    res.status(201).json({
      barber: newBarber,
      setupLink: setupLink, // O admin pode copiar e enviar este link para o barbeiro
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos.", details: e.errors });
    }
    console.error("Erro ao criar funcionário:", e);
    res.status(500).json({ error: e.message || "Erro ao criar funcionário." });
  }
});

// Listar Barbeiros de uma Barbearia
// Rota: GET /barbershops/:barbershopId/barbers
router.get("/", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }
    const barbers = await Barber.find({ barbershop: req.params.barbershopId });
    res.json(barbers);
  } catch (e) {
    console.error("Erro ao buscar funcionários:", e);
    res.status(500).json({ error: "Erro ao buscar funcionários." });
  }
});

// Rota: GET /barbershops/:barbershopId/barbers/:barberId/free-slots
router.get("/:barberId/free-slots", async (req, res) => {
  try {
    const { date } = req.query;
    const serviceId = req.query.serviceId; // ✅ Agora esperamos apenas o serviceId

    const { barberId, barbershopId } = req.params;

    // Validações básicas
    // if (!date || !barberId || !barbershopId || !serviceId) {
    //   return res.status(400).json({ error: "Parâmetros incompletos (data, IDs e serviceId são obrigatórios)." });
    // }
    // if (!mongoose.Types.ObjectId.isValid(barberId) || !mongoose.Types.ObjectId.isValid(barbershopId) || !mongoose.Types.ObjectId.isValid(serviceId)) {
    //   return res.status(400).json({ error: "Um ou mais IDs fornecidos são inválidos." });
    // }

    // Buscar o serviço para obter a duração
    const serviceDoc = await Service.findById(serviceId).lean();
    if (!serviceDoc) return res.status(404).json({ error: "Serviço não encontrado." });
    const serviceDuration = serviceDoc.duration;
    if (isNaN(serviceDuration) || serviceDuration <= 0) return res.status(400).json({ error: "Duração do serviço inválida." });

    const barber = await Barber.findById(barberId).lean();
    if (!barber || barber.barbershop.toString() !== barbershopId) {
      /* ... erro ... */
    }

    // selectedDateInput é "YYYY-MM-DD"
    // parseISO cria uma data UTC à meia-noite desse dia.
    // Ex: "2025-06-10" -> 2025-06-10T00:00:00.000Z
    const dateObjectFromQuery = parseISO(date);

    // Para obter o dia da semana no Brasil, precisamos considerar o fuso.
    // Uma forma de simular isso sem date-fns-tz é pegar os componentes da data UTC
    // e construir uma nova data como se fosse local, mas isso pode ser complicado.
    // A forma mais simples para o dia da semana, se date-fns-tz não funciona,
    // é assumir que a string "YYYY-MM-DD" representa o dia local desejado.
    const tempDateForDayName = new Date(`${date}T12:00:00`); // Meio-dia local para evitar problemas de transição de dia por fuso
    const dayOfWeekName = formatDateFns(tempDateForDayName, "EEEE", { locale: ptBR });

    const workHours = barber.availability.find((a) => a.day.toLowerCase() === dayOfWeekName.toLowerCase());
    if (!workHours) return res.json([]);

    const allLocalSlots = [];
    const [startWorkHour, startWorkMinute] = workHours.start.split(":").map(Number); // Ex: 9, 0
    const [endWorkHour, endWorkMinute] = workHours.end.split(":").map(Number); // Ex: 18, 0
    const slotInterval = 15;

    let currentHour = startWorkHour;
    let currentMinute = startWorkMinute;

    // Loop para gerar os horários LOCAIS baseados no workHours
    while (true) {
      const slotEndHour = currentHour + Math.floor((currentMinute + serviceDuration - 1) / 60); // Hora que o serviço terminaria
      const slotEndMinute = ((currentMinute + serviceDuration - 1) % 60) + 1; // Minuto que o serviço terminaria

      // Verifica se o fim do serviço ultrapassa o fim do expediente
      if (slotEndHour > endWorkHour || (slotEndHour === endWorkHour && slotEndMinute > endWorkMinute)) {
        break;
      }

      const timeString = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
      allLocalSlots.push(timeString);

      currentMinute += slotInterval;
      while (currentMinute >= 60) {
        // Use while para caso o intervalo seja > 60
        currentHour++;
        currentMinute -= 60;
      }
      // Para o loop se a próxima hora de início já ultrapassa o limite
      if (currentHour > endWorkHour || (currentHour === endWorkHour && currentMinute >= endWorkMinute)) {
        break;
      }
    }

    // Agendamentos existentes (armazenados em UTC)
    const existingBookings = await Booking.find({
      barber: barberId,
      barbershop: barbershopId,
      // Usamos dateObjectFromQuery que é meia-noite UTC para startOfDay e endOfDay
      time: { $gte: startOfDay(dateObjectFromQuery), $lt: endOfDay(dateObjectFromQuery) },
    })
      .populate("service", "duration")
      .lean();

    // bookedIntervalsLocal: Array de objetos { start: string HH:mm, end: string HH:mm } no horário local
    const bookedIntervalsLocal = existingBookings.map((booking) => {
      // bookedTimeIsUTC é o objeto Date do banco (UTC)
      const bookedTimeIsUTC = booking.time;
      // Precisamos converter este UTC para a hora local do Brasil
      // Usando toLocaleString para obter a hora local e depois extraindo
      const localBookingStartTimeStr = new Date(bookedTimeIsUTC).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: BRAZIL_TIMEZONE,
      });

      const bookingDuration = booking.service?.duration || slotInterval;

      const [bookedStartH, bookedStartM] = localBookingStartTimeStr.split(":").map(Number);

      let bookedEndH = bookedStartH;
      let bookedEndM = bookedStartM + bookingDuration;
      while (bookedEndM >= 60) {
        bookedEndH++;
        bookedEndM -= 60;
      }
      // Garantir que a hora não passe de 23 (embora improvável para durações normais)
      bookedEndH = bookedEndH % 24;

      const localBookingEndTimeStr = `${String(bookedEndH).padStart(2, "0")}:${String(bookedEndM).padStart(2, "0")}`;

      return { start: localBookingStartTimeStr, end: localBookingEndTimeStr };
    });

    const slotsWithStatus = [];

    for (const potentialStartSlot of allLocalSlots) {
      // "09:00", "09:15", etc. (local)
      const [startSlotH, startSlotM] = potentialStartSlot.split(":").map(Number);

      let endSlotH = startSlotH;
      let endSlotM = startSlotM + serviceDuration;
      while (endSlotM >= 60) {
        endSlotH++;
        endSlotM -= 60;
      }
      endSlotH = endSlotH % 24;
      const potentialEndSlot = `${String(endSlotH).padStart(2, "0")}:${String(endSlotM).padStart(2, "0")}`;

      let hasConflict = false;
      for (const booked of bookedIntervalsLocal) {
        // Comparação de strings de horário "HH:mm"
        // Conflito se: (InícioSlot < FimBooked) E (FimSlot > InícioBooked)
        if (potentialStartSlot < booked.end && potentialEndSlot > booked.start) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        slotsWithStatus.push({
          time: potentialStartSlot,
          isBooked: false,
        });
      }
    }

    res.json(slotsWithStatus);
  } catch (error) {
    console.error("Erro ao buscar status dos horários:", error);
    res.status(500).json({ error: "Erro interno ao processar a solicitação." });
  }
});

router.get("/bookings/barber", protectAdmin, async (req, res) => {
  try {
    const { role, barberProfileId, barbershopId } = req.adminUser; // Dados do token JWT

    let query = { barbershop: new mongoose.Types.ObjectId(barbershopId) };

    // Se a função for 'barber', adiciona o filtro para pegar apenas os agendamentos dele
    if (role === "barber") {
      if (!barberProfileId || !mongoose.Types.ObjectId.isValid(barberProfileId)) {
        return res.status(400).json({ error: "Perfil de barbeiro inválido ou não associado a este usuário." });
      }
      query.barber = new mongoose.Types.ObjectId(barberProfileId);
    }
    // Se a função for 'admin', o query buscará todos os agendamentos da barbearia

    const bookings = await Booking.find(query)
      .populate("barber", "name")
      .populate("service", "name price")
      .populate("customer", "name phone whatsapp") // Incluindo 'whatsapp' se existir
      .sort({ time: 1 }); // Ordena do mais próximo para o mais distante

    res.json(bookings);
  } catch (error) {
    console.error("Erro ao buscar agendamentos do usuário:", error);
    res.status(500).json({ error: "Erro interno ao buscar agendamentos." });
  }
});

// Rota: PUT /barbershops/:barbershopId/barbers/:barberId
router.put("/:barberId", protectAdmin, requireRole("admin"), async (req, res) => {
  try {
    const { barbershopId, barberId } = req.params;

    // 1. Validação de Autorização: O admin está tentando editar um funcionário da sua própria barbearia?
    if (req.adminUser.barbershopId !== barbershopId) {
      return res.status(403).json({ error: "Não autorizado a modificar funcionários desta barbearia." });
    }

    if (!mongoose.Types.ObjectId.isValid(barberId)) {
      return res.status(400).json({ error: "ID do funcionário inválido." });
    }

    // 2. Validação dos Dados Recebidos
    const dataToUpdate = BarberValidationSchema.parse(req.body);

    // 3. Atualização Segura no Banco
    const updatedBarber = await Barber.findOneAndUpdate(
      { _id: barberId, barbershop: barbershopId }, // Condição garante que o barbeiro pertence à barbearia correta
      dataToUpdate, // Novos dados (nome, availability, image)
      { new: true, runValidators: true }
    );

    if (!updatedBarber) {
      return res.status(404).json({ error: "Funcionário não encontrado nesta barbearia." });
    }

    res.json(updatedBarber);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos para atualização do funcionário.", details: e.errors });
    }
    console.error("Erro ao atualizar funcionário:", e);
    res.status(500).json({ error: "Erro interno ao atualizar o funcionário." });
  }
});

// Rota: DELETE /barbershops/:barbershopId/barbers/:barberId
router.delete("/:barberId", protectAdmin, requireRole("admin"), async (req, res) => {
  try {
    const { barbershopId, barberId } = req.params;

    // 1. Validação de Autorização
    if (req.adminUser.barbershopId !== barbershopId) {
      return res.status(403).json({ error: "Não autorizado a deletar funcionários desta barbearia." });
    }

    if (!mongoose.Types.ObjectId.isValid(barberId)) {
      return res.status(400).json({ error: "ID do funcionário inválido." });
    }

    // Opcional: Verificar se o barbeiro tem agendamentos futuros antes de deletar
    const futureBookings = await Booking.findOne({
      barber: barberId,
      time: { $gte: new Date() },
    });

    if (futureBookings) {
      return res.status(400).json({ error: "Não é possível deletar. Este funcionário possui agendamentos futuros." });
    }

    // 2. Deleção Segura no Banco
    const deletedBarber = await Barber.findOneAndDelete({
      _id: barberId,
      barbershop: barbershopId, // Garante que só deleta o funcionário da barbearia correta
    });

    if (!deletedBarber) {
      return res.status(404).json({ error: "Funcionário não encontrado nesta barbearia." });
    }

    res.json({ message: "Funcionário deletado com sucesso.", barberId: deletedBarber._id });
  } catch (e) {
    console.error("Erro ao deletar funcionário:", e);
    res.status(500).json({ error: "Erro interno ao deletar o funcionário." });
  }
});

export default router;
