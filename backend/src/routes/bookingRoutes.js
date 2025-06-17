import express from "express";
import Booking from "../models/Booking.js";
import Barber from "../models/Barber.js";
import Barbershop from "../models/Barbershop.js";
import mongoose from "mongoose";
import { bookingSchema as BookingValidationSchema } from "../validations/bookingValidation.js";
import { sendWhatsAppConfirmation } from "../services/evolutionWhatsapp.js";
import { formatBookingTime } from "../utils/formatBookingTime.js";
import {formatPhoneNumber} from '../utils/phoneFormater.js'

const router = express.Router({ mergeParams: true });

// Criar Agendamento em uma Barbearia
// Rota esperada: POST /barbershops/:barbershopId/bookings
router.post("/", async (req, res) => {
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
      const barberShopContact = formatPhoneNumber(barbershop.contact);

      const message = `Olá, ${data.customer.name}!\n\nSeu agendamento na ${barbershop.name} foi confirmado com sucesso para o dia ${formattedTime} ✅\n\nPara mais informações, entre em contato com a barbearia: ${barberShopContact} \nEndereço: ${barbershop.address.rua}, ${barbershop.address.numero} - ${barbershop.address.bairro}\n\nNosso time te aguarda! 💈`;

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

export default router;
