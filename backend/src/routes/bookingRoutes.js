import express from "express";
import Booking from "../models/Booking.js";
import Barbershop from "../models/Barbershop.js";
import mongoose from "mongoose";
import { bookingSchema as BookingValidationSchema } from "../validations/bookingValidation.js";
import { sendWhatsAppConfirmation } from "../services/evolutionWhatsapp.js";
import { formatBookingTime } from "../utils/formatBookingTime.js";
import { formatPhoneNumber } from "../utils/phoneFormater.js";
import { checkHolidayAvailability } from "../middleware/holidayCheck.js";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";

const router = express.Router({ mergeParams: true });

// Criar Agendamento em uma Barbearia
// Rota esperada: POST /barbershops/:barbershopId/bookings
router.post("/", checkHolidayAvailability, async (req, res) => {
  try {
    const data = BookingValidationSchema.parse(req.body);
    const bookingTime = new Date(data.time);

    const conflict = await Booking.findOne({
      barber: data.barber,
      time: bookingTime,
    });

    if (conflict) {
      return res.status(409).json({
        error: "Este horário já foi preenchido. Por favor, escolha outro.",
      });
    }

    const createdBooking = await Booking.create({
      ...data,
      barbershop: req.params.barbershopId,
      time: bookingTime,
    });

    if (createdBooking) {
      const barbershop = await Barbershop.findById(req.params.barbershopId);
      const formattedTime = formatBookingTime(new Date(bookingTime));

      const fullAddress = `${barbershop.address.rua}, ${barbershop.address.numero} - ${barbershop.address.bairro}`;

      const cleanPhoneNumber = barbershop.contact.replace(/\D/g, "");

      const whatsappLink = `https://wa.me/55${cleanPhoneNumber}`;

      const locationLink = `https://barbeariagendamento.com.br/localizacao/${barbershop._id}`;

      const message = `Olá, ${data.customer.name}!\n\nSeu agendamento na ${barbershop.name} foi confirmado com sucesso para o dia ${formattedTime} ✅\n\nPara mais informações, entre em contato com a barbearia: ${whatsappLink} \nEndereço: ${fullAddress}\n\n📍 *Ver no mapa:*\n${locationLink}\n\nNosso time te aguarda! 💈`;

      sendWhatsAppConfirmation(createdBooking.customer.phone, message);
    }

    res.status(201).json(createdBooking);
  } catch (e) {
    console.error("ERRO AO CRIAR AGENDAMENTO:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados de agendamento inválidos.", details: e.errors });
    }
    if (e.name === "CastError") {
      return res.status(400).json({ error: "ID inválido fornecido para um dos campos." });
    }
    res.status(500).json({ error: "Ocorreu um erro interno ao processar sua solicitação." });
  }
});

// Listar Agendamentos de uma Barbearia
// Rota esperada: GET /barbershops/:barbershopId/bookings
router.get("/", async (req, res) => {
  try {
    // ✅ Use req.params.barbershopId aqui, que vem da rota pai graças ao mergeParams
    const barbershopId = req.params.barbershopId;

    if (!barbershopId || !mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido ou não fornecido." });
    }

    const bookings = await Booking.find({ barbershop: barbershopId }).populate("barber", "name").populate("service", "name price");

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
      });

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
        const message = `Olá ${booking.customer.name},\nInformamos que seu agendamento foi cancelado na ${barbershop.name} para o dia ${formattedDate} foi cancelado.`;

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
