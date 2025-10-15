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
import {
  startOfMonth,
  endOfMonth,
  format,
  eachDayOfInterval,
  isToday,
} from "date-fns";
import { checkIsHoliday } from "../services/holidayService.js";
import { z } from "zod";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { appointmentLimiter } from "../middleware/rateLimiting.js";

const router = express.Router({ mergeParams: true });

router.post(
  "/",
  checkHolidayAvailability,
  appointmentLimiter,
  async (req, res) => {
    try {
      const { barbershopId } = req.params;
      const data = BookingValidationSchema.parse(req.body);
      const bookingTime = new Date(data.time);

      if (
        !data.customer.name ||
        data.customer.name.trim() === "" ||
        !data.customer.phone ||
        data.customer.phone.trim() === ""
      ) {
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

      // ---- ALTERAÇÃO 3: Adicionamos o status do pagamento CONDICIONALMENTE ----
      if (barbershop.paymentsEnabled) {
        bookingPayload.paymentStatus = "pending";
      }

      const createdBooking = await Booking.create(bookingPayload);

      customer.bookings.push(createdBooking._id);
      await customer.save();

      if (createdBooking) {
        const barbershop = await Barbershop.findById(req.params.barbershopId);
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
        return res
          .status(400)
          .json({ error: "ID inválido fornecido para um dos campos." });
      }
      res.status(500).json({
        error: "Ocorreu um erro interno ao processar sua solicitação.",
      });
    }
  }
);

// Listar Agendamentos de uma Barbearia
// Rota esperada: GET /barbershops/:barbershopId/bookings
router.get("/", async (req, res) => {
  try {
    const barbershopId = req.params.barbershopId;

    if (!barbershopId || !mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res
        .status(400)
        .json({ error: "ID da barbearia inválido ou não fornecido." });
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
        return res
          .status(404)
          .json({ error: "Agendamento não encontrado nesta barbearia." });
      }

      const barbershop = await Barbershop.findById(barbershopId);

      // 2. Validação do Status recebido
      const allowedStatuses = ["booked", "completed", "canceled", "confirmed"];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: `Status inválido. Use um dos seguintes: ${allowedStatuses.join(
            ", "
          )}`,
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
      return res
        .status(400)
        .json({ error: "Ano, mês e serviço são obrigatórios." });
    }

    const startDate = startOfMonth(
      new Date(parseInt(year), parseInt(month) - 1)
    );
    const endDate = endOfMonth(startDate);

    // Obtém a data/hora atual no fuso horário do Brasil para comparação
    const nowInBrazil = toZonedTime(new Date(), "America/Sao_Paulo");

    // 1. Buscar todos os dados necessários para o mês de uma só vez
    const [barber, service, bookings, blockedDays, timeBlocks] =
      await Promise.all([
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
      return res
        .status(404)
        .json({ error: "Barbeiro ou serviço não encontrado." });
    }

    const serviceDuration = service.duration;
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    const unavailableDays = new Set();

    const availabilityMap = new Map(
      barber.availability.map((a) => [a.day.toLowerCase(), a])
    );

    // 2. Iterar sobre cada dia do mês
    for (const day of daysInMonth) {
      const dayString = format(day, "yyyy-MM-dd");
      const dayOfWeekName = format(day, "EEEE", { locale: ptBR });

      // Causa #1: Dia bloqueado
      const isDayBlocked = blockedDays.some(
        (blocked) => format(new Date(blocked.date), "yyyy-MM-dd") === dayString
      );
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

      const todaysBookings = bookings.filter(
        (b) => format(new Date(b.time), "yyyy-MM-dd") === dayString
      );
      const todaysTimeBlocks = timeBlocks.filter(
        (tb) => tb.startTime < dayEnd && tb.endTime > dayStart
      );

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
        const potentialEndTime = new Date(
          currentSlotTime.getTime() + serviceDuration * 60000
        );

        if (potentialEndTime > dayEnd) break;

        let hasConflict = false;

        // Verifica conflito com agendamentos
        for (const booking of todaysBookings) {
          const bookingStart = new Date(booking.time);
          const bookingEnd = new Date(
            bookingStart.getTime() +
              (booking.service?.duration || serviceDuration) * 60000
          );
          if (currentSlotTime < bookingEnd && potentialEndTime > bookingStart) {
            hasConflict = true;
            break;
          }
        }
        if (hasConflict) {
          currentSlotTime.setMinutes(
            currentSlotTime.getMinutes() + slotInterval
          );
          continue;
        }

        // Verifica conflito com bloqueios de tempo
        for (const block of todaysTimeBlocks) {
          if (
            currentSlotTime < new Date(block.endTime) &&
            potentialEndTime > new Date(block.startTime)
          ) {
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

// Excluir um Agendamento
// Rota esperada: DELETE /barbershops/:barbershopId/bookings/:bookingId
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

export default router;
