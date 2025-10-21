import express from "express";
import Booking from "../models/Booking.js";
import Barbershop from "../models/Barbershop.js";
import Customer from "../models/Customer.js";
import Barber from "../models/Barber.js";
import Service from "../models/Service.js";
import BlockedDay from "../models/BlockedDay.js";
import TimeBlock from "../models/TimeBlock.js";
import mongoose from "mongoose";
import { bookingSchema as BookingValidationSchema } from "../validations/bookingValidation.js";
import { sendWhatsAppConfirmation } from "../services/evolutionWhatsapp.js";
import { formatBookingTime } from "../utils/formatBookingTime.js";
import { checkHolidayAvailability } from "../middleware/holidayCheck.js";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";
import { protectCustomer } from "../middleware/authCustomerMiddleware.js";
import { startOfMonth, endOfMonth, format, eachDayOfInterval, isToday, isPast } from "date-fns";
import { checkIsHoliday } from "../services/holidayService.js";
import { z } from "zod";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { appointmentLimiter } from "../middleware/rateLimiting.js";
import { addClient, removeClient, sendEventToBarbershop } from "../services/sseService.js";

const router = express.Router({ mergeParams: true });

const rescheduleSchema = z.object({
  newTime: z.string().datetime({ message: "Formato de data e hora inválido" }),
});

router.post("/", checkHolidayAvailability, appointmentLimiter, async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const data = BookingValidationSchema.parse(req.body);
    const bookingTime = new Date(data.time);

    if (!data.customer.name || data.customer.name.trim() === "" || !data.customer.phone || data.customer.phone.trim() === "") {
      return res.status(400).json({
        error: "Nome do cliente é obrigatório.",
      });
    }

    const barbershop = await Barbershop.findById(barbershopId);
    if (!barbershop) {
      return res.status(404).json({ error: "Barbearia não encontrada." });
    }

    const customer = await Customer.findOneAndUpdate(
      { phone: data.customer.phone },
      {
        name: data.customer.name, // Sempre atualiza o nome
        phone: data.customer.phone,
      },
      { new: true, upsert: true }
    );

    const conflict = await Booking.findOne({
      barber: data.barber,
      time: bookingTime,
      status: { $nin: ["canceled"] },
    });

    if (conflict) {
      return res.status(409).json({
        error: "Este horário já foi preenchido. Por favor, escolha outro.",
      });
    }

    const bookingPayload = {
      ...data,
      customer: customer._id,
      barbershop: barbershopId,
    };

    if (barbershop.paymentsEnabled) {
      bookingPayload.paymentStatus = "pending";
    }

    const createdBooking = await Booking.create(bookingPayload);

    customer.bookings.push(createdBooking._id);
    await customer.save();

    if (createdBooking) {
      const barbershop = await Barbershop.findById(req.params.barbershopId);

      // websocket para atualizar dashboard do barbeiro
      const populatedBooking = await Booking.findById(createdBooking._id)
        .populate("customer", "name")
        .populate("barber", "name")
        .populate("service", "name price duration")
        .lean();

      if (populatedBooking) {
        sendEventToBarbershop(barbershopId, "new_booking", populatedBooking);
      } else {
        console.warn(`[SSE] Não foi possível encontrar o booking ${createdBooking._id} para popular e enviar via SSE.`);
      }

      // envio de mensagem ao marcar um horario
      const formattedTime = formatBookingTime(bookingTime, true);
      const cleanPhoneNumber = barbershop.contact.replace(/\D/g, "");
      const whatsappLink = `https://wa.me/55${cleanPhoneNumber}`;
      const locationLink = `https://barbeariagendamento.com.br/localizacao/${barbershop._id}`;
      const message = `Olá, ${customer.name}! Seu agendamento na ${barbershop.name} foi confirmado com sucesso para ${formattedTime} ✅\n\nPara mais informações, entre em contato com a barbearia:\n${whatsappLink}\n\n📍 Ver no mapa:\n${locationLink}\n\nNosso time te aguarda! 💈`;
      sendWhatsAppConfirmation(customer.phone, message);
    }

    res.status(201).json(createdBooking);
  } catch (e) {
    console.error("ERRO AO CRIAR AGENDAMENTO:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados de agendamento inválidos.",
        details: e.errors,
      });
    }
    if (e.name === "CastError") {
      return res.status(400).json({ error: "ID inválido fornecido para um dos campos." });
    }
    res.status(500).json({
      error: "Ocorreu um erro interno ao processar sua solicitação.",
    });
  }
});

// Listar Agendamentos de uma Barbearia
// Rota esperada: GET /barbershops/:barbershopId/bookings
router.get("/", async (req, res) => {
  try {
    const barbershopId = req.params.barbershopId;

    if (!barbershopId || !mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido ou não fornecido." });
    }

    const bookings = await Booking.find({ barbershop: barbershopId })
      .sort({ time: -1 }) // <-- ADICIONE ESTA LINHA
      .populate("barber", "name")
      .populate("service", "name price duration")
      .populate("customer", "name phone");

    res.json(bookings);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    res.status(500).json({ error: "Falha ao buscar agendamentos." });
  }
});

router.put(
  "/:bookingId/status",
  protectAdmin, // Apenas usuários logados no painel podem acessar
  async (req, res) => {
    try {
      const { barbershopId, bookingId } = req.params;
      const { status } = req.body;

      // 1. Validação dos IDs
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ error: "ID do agendamento inválido." });
      }

      const booking = await Booking.findOne({
        _id: bookingId,
        barbershop: barbershopId,
      }).populate("customer", "name phone");

      if (!booking) {
        return res.status(404).json({ error: "Agendamento não encontrado nesta barbearia." });
      }

      const barbershop = await Barbershop.findById(barbershopId);

      // 2. Validação do Status recebido
      const allowedStatuses = ["booked", "completed", "canceled", "confirmed"];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: `Status inválido. Use um dos seguintes: ${allowedStatuses.join(", ")}`,
        });
      }

      const bookingDate = new Date(booking.time);

      const formattedDate = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }).format(bookingDate);

      if (status === "canceled") {
        const message = `Olá ${booking.customer.name},\nInformamos que seu agendamento foi cancelado na ${barbershop.name} para o dia ${formattedDate}.`;

        sendWhatsAppConfirmation(booking.customer.phone, message);
      }

      // 3. Encontrar o agendamento

      // 4. Atualizar o status e salvar
      booking.status = status;
      await booking.save();

      // 5. Retornar a resposta de sucesso com o agendamento atualizado
      res.status(200).json({
        success: true,
        message: `Agendamento atualizado para '${status}' com sucesso.`,
        data: booking,
      });
    } catch (error) {
      console.error("Erro ao atualizar status do agendamento:", error);
      res.status(500).json({ error: "Ocorreu um erro no servidor." });
    }
  }
);

router.put(
  "/:bookingId/cancel", // Mantivemos o mesmo padrão de URL, mas com outra proteção
  protectCustomer, // Protegida para garantir que um cliente esteja logado
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const customerId = req.customer.id; // ID do cliente logado, vindo do middleware protectCustomer

      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ error: "ID do agendamento inválido." });
      }

      // 1. Encontra o agendamento que o cliente quer cancelar
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return res.status(404).json({ error: "Agendamento não encontrado." });
      }

      // 2. VERIFICAÇÃO DE SEGURANÇA CRUCIAL!
      // Garante que o ID do cliente logado é o mesmo ID do cliente no agendamento.
      // Isso impede que o cliente A cancele o agendamento do cliente B.
      if (booking.customer.toString() !== customerId) {
        return res.status(403).json({
          error: "Você não tem permissão para cancelar este agendamento.",
        });
      }

      // 3. Regra de negócio: não permitir cancelamento de agendamentos que já passaram
      if (new Date(booking.time) < new Date()) {
        return res.status(400).json({
          error: "Não é possível cancelar um agendamento que já ocorreu.",
        });
      }

      // 4. Se tudo estiver certo, atualiza o status
      booking.status = "canceled";
      await booking.save();

      // Você pode adicionar uma notificação de WhatsApp para o admin/barbeiro aqui se desejar

      res.status(200).json({
        success: true,
        message: "Seu agendamento foi cancelado com sucesso.",
        data: booking,
      });
    } catch (error) {
      console.error("Erro ao cancelar agendamento pelo cliente:", error);
      res.status(500).json({ error: "Falha ao processar o cancelamento." });
    }
  }
);

router.get("/:barberId/monthly-availability", async (req, res) => {
  try {
    const { barbershopId, barberId } = req.params;
    const { year, month, serviceId } = req.query;

    if (!year || !month || !serviceId) {
      return res.status(400).json({ error: "Ano, mês e serviço são obrigatórios." });
    }

    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const endDate = endOfMonth(startDate);

    // Obtém a data/hora atual no fuso horário do Brasil para comparação
    const nowInBrazil = toZonedTime(new Date(), "America/Sao_Paulo");

    // 1. Buscar todos os dados necessários para o mês de uma só vez
    const [barber, service, bookings, blockedDays, timeBlocks] = await Promise.all([
      Barber.findById(barberId).lean(),
      Service.findById(serviceId).lean(),
      Booking.find({
        barber: barberId,
        time: { $gte: startDate, $lte: endDate },
        status: { $ne: "canceled" },
      }).lean(),
      BlockedDay.find({
        barbershop: barbershopId,
        date: { $gte: startDate, $lte: endDate },
        barber: { $in: [null, barberId] },
      }).lean(),
      TimeBlock.find({
        barber: barberId,
        startTime: { $lt: endDate },
        endTime: { $gt: startDate },
      }).lean(),
    ]);

    if (!barber || !service) {
      return res.status(404).json({ error: "Barbeiro ou serviço não encontrado." });
    }

    const serviceDuration = service.duration;
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    const unavailableDays = new Set();

    const availabilityMap = new Map(barber.availability.map((a) => [a.day.toLowerCase(), a]));

    // 2. Iterar sobre cada dia do mês
    for (const day of daysInMonth) {
      const dayString = format(day, "yyyy-MM-dd");
      const dayOfWeekName = format(day, "EEEE", { locale: ptBR });

      // Causa #1: Dia bloqueado
      const isDayBlocked = blockedDays.some((blocked) => format(new Date(blocked.date), "yyyy-MM-dd") === dayString);
      if (isDayBlocked) {
        unavailableDays.add(dayString);
        continue;
      }

      // Causa #2: Feriado
      const holidayCheck = await checkIsHoliday(day);
      if (holidayCheck.isHoliday) {
        unavailableDays.add(dayString);
        continue;
      }

      // Causa #3: Barbeiro não trabalha
      const workHours = availabilityMap.get(dayOfWeekName.toLowerCase());
      if (!workHours) {
        unavailableDays.add(dayString);
        continue;
      }

      // Causa #4: Nenhum horário vago no dia
      let hasAvailableSlot = false;
      const slotInterval = 15;

      const [startWorkH, startWorkM] = workHours.start.split(":").map(Number);
      const [endWorkH, endWorkM] = workHours.end.split(":").map(Number);

      const dayStart = new Date(day);
      dayStart.setHours(startWorkH, startWorkM, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(endWorkH, endWorkM, 0, 0);

      const todaysBookings = bookings.filter((b) => format(new Date(b.time), "yyyy-MM-dd") === dayString);
      const todaysTimeBlocks = timeBlocks.filter((tb) => tb.startTime < dayEnd && tb.endTime > dayStart);

      // ---- VALIDAÇÃO ADICIONADA ----
      // Ajusta o ponto de partida da verificação para o dia de hoje
      let initialSlotTime = new Date(dayStart);
      if (isToday(day) && nowInBrazil > initialSlotTime) {
        // Define a hora inicial como a hora atual se já passamos do início do expediente
        initialSlotTime = nowInBrazil;
      }
      // -----------------------------

      let currentSlotTime = new Date(initialSlotTime);

      while (currentSlotTime < dayEnd) {
        const potentialEndTime = new Date(currentSlotTime.getTime() + serviceDuration * 60000);

        if (potentialEndTime > dayEnd) break;

        let hasConflict = false;

        // Verifica conflito com agendamentos
        for (const booking of todaysBookings) {
          const bookingStart = new Date(booking.time);
          const bookingEnd = new Date(bookingStart.getTime() + (booking.service?.duration || serviceDuration) * 60000);
          if (currentSlotTime < bookingEnd && potentialEndTime > bookingStart) {
            hasConflict = true;
            break;
          }
        }
        if (hasConflict) {
          currentSlotTime.setMinutes(currentSlotTime.getMinutes() + slotInterval);
          continue;
        }

        // Verifica conflito com bloqueios de tempo
        for (const block of todaysTimeBlocks) {
          if (currentSlotTime < new Date(block.endTime) && potentialEndTime > new Date(block.startTime)) {
            hasConflict = true;
            break;
          }
        }

        if (!hasConflict) {
          hasAvailableSlot = true;
          break;
        }

        currentSlotTime.setMinutes(currentSlotTime.getMinutes() + slotInterval);
      }

      if (!hasAvailableSlot) {
        unavailableDays.add(dayString);
      }
    }

    res.status(200).json({ unavailableDays: Array.from(unavailableDays) });
  } catch (error) {
    console.error("Erro ao buscar disponibilidade mensal:", error);
    res.status(500).json({ error: "Erro ao processar disponibilidade." });
  }
});

router.get(
  "/stream",
  protectAdmin, // Garante que apenas usuários logados (admin/barbeiro) possam conectar
  (req, res) => {
    const { barbershopId } = req.params;
    // Pega o barbershopId do token JWT para garantir que o usuário pertence a essa barbearia
    const userBarbershopId = req.adminUser?.barbershopId;

    if (userBarbershopId !== barbershopId) {
      return res.status(403).json({ error: "Não autorizado a escutar eventos desta barbearia." });
    }

    // 1. Configura os headers essenciais para SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Envia os headers imediatamente

    // 2. Adiciona o cliente à lista no sseService
    addClient(barbershopId, res);

    // 3. Envia um evento inicial (opcional, bom para confirmar a conexão)
    res.write(`event: connected\ndata: ${JSON.stringify({ message: "Conectado ao stream de agendamentos!" })}\n\n`);

    // 4. Ping periódico para manter a conexão viva (evita timeouts)
    const keepAliveInterval = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 20000); // A cada 20 segundos

    // 5. Lida com a desconexão do cliente
    req.on("close", () => {
      clearInterval(keepAliveInterval); // Para o ping
      removeClient(barbershopId, res); // Remove o cliente da lista
      res.end(); // Fecha a resposta
    });
  }
);

router.delete("/:bookingId", async (req, res) => {
  try {
    const { bookingId, barbershopId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: "ID do agendamento inválido." });
    }

    const booking = await Booking.findOneAndDelete({
      _id: bookingId,
      barbershop: barbershopId,
    });

    if (!booking) {
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }

    const barbershop = await Barbershop.findById(barbershopId);

    if (!barbershop) {
      return res.status(404).json({ error: "Barbearia não encontrada." });
    }

    const bookingDate = new Date(booking.time);

    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }).format(bookingDate);

    const message = `Olá ${booking.customer.name},\nInformamos que seu agendamento foi cancelado na ${barbershop.name} para o dia ${formattedDate} foi cancelado.`;

    sendWhatsAppConfirmation(booking.customer.phone, message);

    res.status(200).json({ message: "Agendamento excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir agendamento:", error);
    res.status(500).json({ error: "Falha ao excluir agendamento." });
  }
});

router.patch("/:bookingId/reschedule", async (req, res) => {
  try {
    const { barbershopId, bookingId } = req.params;
    const validationResult = rescheduleSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Dados inválidos.",
        details: validationResult.error.errors,
      });
    }

    const { newTime } = validationResult.data;
    const newBookingTime = new Date(newTime);

    // 1. Validação básica da nova data
    if (isPast(newBookingTime)) {
      return res.status(400).json({ error: "Não é possível reagendar para uma data passada." });
    }

    // 2. Buscar o agendamento original (populando dados necessários)
    const booking = await Booking.findOne({
      _id: bookingId,
      barbershop: barbershopId,
    })
      .populate("barber")
      .populate("service")
      .populate("customer", "name phone"); // Inclui customer para notificação

    if (!booking) {
      return res.status(404).json({ error: "Agendamento não encontrado nesta barbearia." });
    }

    // Se o agendamento já foi cancelado ou concluído, não pode reagendar
    if (["canceled", "completed"].includes(booking.status)) {
      return res.status(400).json({
        error: `Agendamentos com status '${booking.status}' não podem ser reagendados.`,
      });
    }

    const barber = booking.barber;
    const service = booking.service;
    const customer = booking.customer;

    if (!barber || !service || !customer) {
      return res.status(500).json({
        error: "Dados do agendamento original estão incompletos (barbeiro, serviço ou cliente).",
      });
    }

    // 3. Verificar disponibilidade do NOVO horário
    //    (Lógica similar à verificação de criação e free-slots)

    //    a) Verificar feriado
    const holidayCheck = await checkIsHoliday(newBookingTime);
    if (holidayCheck.isHoliday) {
      return res.status(400).json({
        error: `O novo horário (${holidayCheck.holidayName}) é um feriado.`,
      });
    }

    //    b) Verificar disponibilidade do barbeiro (dia da semana e horário)
    const dayOfWeekName = format(newBookingTime, "EEEE", { locale: ptBR });
    const workHours = barber.availability.find((a) => a.day.toLowerCase() === dayOfWeekName.toLowerCase());
    if (!workHours) {
      return res.status(400).json({ error: "O barbeiro não trabalha neste dia da semana." });
    }
    const [startH, startM] = workHours.start.split(":").map(Number);
    const [endH, endM] = workHours.end.split(":").map(Number);
    const newStartTimeMinutes = newBookingTime.getHours() * 60 + newBookingTime.getMinutes();
    const workStartTimeMinutes = startH * 60 + startM;
    const workEndTimeMinutes = endH * 60 + endM;
    const newEndTime = new Date(newBookingTime.getTime() + service.duration * 60000);
    const newEndTimeMinutes = newEndTime.getHours() * 60 + newEndTime.getMinutes();

    if (newStartTimeMinutes < workStartTimeMinutes || newEndTimeMinutes > workEndTimeMinutes) {
      return res.status(400).json({
        error: "O novo horário está fora do expediente do barbeiro.",
      });
    }

    //    c) Verificar conflitos com OUTROS agendamentos
    const conflictingBooking = await Booking.findOne({
      _id: { $ne: bookingId }, // Exclui o próprio agendamento da verificação
      barber: barber._id,
      time: newBookingTime,
      status: { $nin: ["canceled"] },
    });
    if (conflictingBooking) {
      return res.status(409).json({
        error: "Conflito: Já existe outro agendamento neste novo horário.",
      });
    }

    //    d) Verificar conflitos com bloqueios de tempo (TimeBlock)
    const conflictingTimeBlock = await TimeBlock.findOne({
      barber: barber._id,
      startTime: { $lt: newEndTime },
      endTime: { $gt: newBookingTime },
    });
    if (conflictingTimeBlock) {
      return res.status(409).json({
        error: "Conflito: O novo horário coincide com um período bloqueado.",
      });
    }

    // 4. Atualizar o horário do agendamento
    booking.time = newBookingTime;
    // Opcional: Mudar status para 'confirmed' ou manter 'booked'
    // booking.status = "confirmed";
    await booking.save();

    // 5. (Opcional) Notificar o cliente sobre o reagendamento
    const formattedNewTime = format(newBookingTime, "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
    const message = `Olá, ${customer.name}! Seu agendamento foi reagendado para ${formattedNewTime}. Até lá! 💈`;
    sendWhatsAppConfirmation(customer.phone, message); // Reutiliza sua função de notificação

    res.status(200).json({
      success: true,
      message: "Agendamento reagendado com sucesso!",
      data: booking, // Retorna o agendamento atualizado
    });
  } catch (error) {
    console.error("Erro ao reagendar:", error);
    if (error instanceof z.ZodError) {
      // Trata erros específicos do Zod
      return res.status(400).json({
        error: "Dados de entrada inválidos.",
        details: error.errors,
      });
    }
    res.status(500).json({ error: "Ocorreu um erro interno ao reagendar." });
  }
});

export default router;
