import express from "express";
import Booking from "../models/Booking.js";
import Barbershop from "../models/Barbershop.js";
import Customer from "../models/Customer.js";
import Barber from "../models/Barber.js";
import Service from "../models/Service.js";
import TimeBlock from "../models/TimeBlock.js";
import mongoose from "mongoose";
import { bookingSchema as BookingValidationSchema } from "../validations/bookingValidation.js";
import { sendWhatsAppConfirmation } from "../services/evolutionWhatsapp.js";
import { formatBookingTime } from "../utils/formatBookingTime.js";
import { formatPhoneNumber } from "../utils/phoneFormater.js";
import { checkHolidayAvailability } from "../middleware/holidayCheck.js";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";
import { protectCustomer } from "../middleware/authCustomerMiddleware.js";
import {
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  format,
  isSameDay,
} from "date-fns";
import { z } from "zod";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { appointmentLimiter } from "../middleware/rateLimiting.js";

const router = express.Router({ mergeParams: true });

// Criar Agendamento em uma Barbearia
// Rota esperada: POST /barbershops/:barbershopId/bookings
router.post(
  "/",
  checkHolidayAvailability,
  appointmentLimiter,
  async (req, res) => {
    try {
      const data = BookingValidationSchema.parse(req.body);
      const bookingTime = new Date(data.time);

      const customer = await Customer.findOneAndUpdate(
        { phone: data.customer.phone },
        {
          $setOnInsert: {
            name: data.customer.name,
            phone: data.customer.phone,
          },
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

      const createdBooking = await Booking.create({
        ...data,
        customer: customer._id,
        barbershop: req.params.barbershopId,
      });

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
    // ✅ Use req.params.barbershopId aqui, que vem da rota pai graças ao mergeParams
    const barbershopId = req.params.barbershopId;

    if (!barbershopId || !mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res
        .status(400)
        .json({ error: "ID da barbearia inválido ou não fornecido." });
    }

    const bookings = await Booking.find({ barbershop: barbershopId })
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
    const { barberId } = req.params;
    const { year, month, serviceId } = req.query;

    if (!year || !month || !serviceId) {
      return res
        .status(400)
        .json({ error: "Ano, mês e serviço são obrigatórios." });
    }

    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    const daysInMonth = getDaysInMonth(startDate);

    // 1. Pega os dados essenciais em uma única consulta
    const [barber, service, bookingsForMonth, timeBlocksForMonth] =
      await Promise.all([
        Barber.findById(barberId).lean(),
        Service.findById(serviceId).lean(),
        Booking.find({
          barber: barberId,
          time: { $gte: startDate, $lt: endDate },
          status: { $nin: ["canceled"] },
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

    const unavailableDays = [];

    // 2. Itera por cada dia do mês para verificar a disponibilidade
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dayOfWeekName = format(currentDate, "EEEE", { locale: ptBR });

      const workHours = barber.availability.find(
        (a) => a.day.toLowerCase() === dayOfWeekName.toLowerCase()
      );

      // Se não é um dia de trabalho, o dia está indisponível
      if (!workHours) {
        unavailableDays.push(format(currentDate, "yyyy-MM-dd"));
        continue; // Pula para o próximo dia
      }

      // Calcula o total de slots possíveis no dia
      const [startH, startM] = workHours.start.split(":").map(Number);
      const [endH, endM] = workHours.end.split(":").map(Number);
      const totalWorkMinutes = endH * 60 + endM - (startH * 60 + startM);
      const possibleSlots = Math.floor(totalWorkMinutes / service.duration);

      // Calcula quantos slots já foram consumidos pelos agendamentos existentes
      const bookingsOnThisDay = bookingsForMonth.filter((b) =>
        isSameDay(new Date(b.time), currentDate)
      );
      const slotsTaken = bookingsOnThisDay.length; // Simplificação: 1 booking = 1 slot (refinar se necessário)

      // Verifica se há time blocks que cobrem todo o dia de trabalho
      const timeBlocksOnThisDay = timeBlocksForMonth.filter((block) => {
        const blockStart = new Date(block.startTime);
        const blockEnd = new Date(block.endTime);
        const dayStart = new Date(currentDate);
        dayStart.setHours(startH, startM, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(endH, endM, 0, 0);

        // Verifica se o bloqueio cobre todo o período de trabalho do dia
        return blockStart <= dayStart && blockEnd >= dayEnd;
      });

      // Se há um time block que cobre todo o dia OU se os slots ocupados forem maiores ou iguais aos possíveis, o dia está indisponível
      if (timeBlocksOnThisDay.length > 0 || slotsTaken >= possibleSlots) {
        unavailableDays.push(format(currentDate, "yyyy-MM-dd"));
      }
    }

    res.status(200).json({ unavailableDays });
  } catch (error) {
    console.error("Erro ao calcular disponibilidade mensal:", error);
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
