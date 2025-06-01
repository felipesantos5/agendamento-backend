import express from "express";
import mongoose from "mongoose";
import Barber from "../models/Barber.js";
import Booking from "../models/Booking.js";
import { parseISO, startOfDay, endOfDay } from "date-fns";
import { barberSchema as BarberValidationSchema } from "../validations/barberValidation.js"; // Renomeado

const router = express.Router({ mergeParams: true }); // mergeParams é importante para acessar :barbershopId

// Adicionar Barbeiro a uma Barbearia
// Rota esperada: POST /barbershops/:barbershopId/barbers
router.post("/", async (req, res) => {
  try {
    const data = BarberValidationSchema.parse(req.body);
    const created = await Barber.create({
      ...data,
      barbershop: req.params.barbershopId, // Pega o ID da barbearia da URL
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

// Listar Barbeiros de uma Barbearia
// Rota esperada: GET /barbershops/:barbershopId/barbers
router.get("/", async (req, res) => {
  try {
    const barbers = await Barber.find({ barbershop: req.params.barbershopId });
    res.json(barbers);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar barbeiros." });
  }
});

router.get("/:barberId/free-slots", async (req, res) => {
  try {
    const { date } = req.query;
    const { barberId, barbershopId } = req.params; // barbershopId vem do mergeParams

    if (!date || !barberId || !barbershopId) {
      return res.status(400).json({
        error: "Data, ID do barbeiro e ID da barbearia são obrigatórios.",
      });
    }
    if (
      !mongoose.Types.ObjectId.isValid(barberId) ||
      !mongoose.Types.ObjectId.isValid(barbershopId)
    ) {
      return res
        .status(400)
        .json({ error: "ID do barbeiro ou da barbearia inválido." });
    }

    const barber = await Barber.findById(barberId);
    // Verifica se o barbeiro existe E se pertence à barbearia especificada na URL
    if (!barber || barber.barbershop.toString() !== barbershopId) {
      return res.status(404).json({
        error: "Barbeiro não encontrado ou não pertence a esta barbearia.",
      });
    }

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
    const workHours = barber.availability.find((a) => a.day === dayOfWeekName);

    if (!workHours) return res.json([]); // Sem horários de trabalho para este dia

    const allLocalSlots = [];
    const [startHour, startMinute] = workHours.start.split(":").map(Number);
    const [endHour, endMinute] = workHours.end.split(":").map(Number);
    const slotInterval = 30;

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

    const bookings = await Booking.find({
      barber: barberId, // Filtra pelo ID do barbeiro
      barbershop: barbershopId, // Segurança extra: garante que o agendamento é da mesma barbearia
      time: { $gte: startOfDay(selectedDate), $lt: endOfDay(selectedDate) },
    });

    const bookedTimes = new Set(
      bookings.map((booking) => {
        return new Date(booking.time).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        });
      })
    );

    const slotsWithStatus = allLocalSlots.map((time) => ({
      time: time,
      isBooked: bookedTimes.has(time),
    }));
    res.json(slotsWithStatus);
  } catch (error) {
    console.error("Erro ao buscar status dos horários:", error);
    res.status(500).json({ error: "Erro interno ao processar a solicitação." });
  }
});

export default router;
