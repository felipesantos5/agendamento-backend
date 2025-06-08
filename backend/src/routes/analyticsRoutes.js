import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { requireRole } from "../middleware/authAdminMiddleware.js";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";

const router = express.Router({ mergeParams: true }); // Para acessar :barbershopId

// Função auxiliar para obter datas de início/fim de períodos
const getPeriodDates = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case "lastMonth":
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      break;
    case "last3Months":
      startDate = startOfMonth(subMonths(now, 2)); // Inclui o mês atual e os 2 anteriores
      endDate = endOfMonth(now);
      break;
    case "currentMonth":
    default:
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
  }
  return { startDate, endDate };
};

// ROTA: GET /barbershops/:barbershopId/analytics/overview
router.get("/overview", protectAdmin, requireRole("admin"), async (req, res) => {
  try {
    const { barbershopId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }

    const { startDate, endDate } = getPeriodDates("currentMonth");

    const currentMonthBookingsList = await Booking.find({
      barbershop: new mongoose.Types.ObjectId(barbershopId),
      time: { $gte: startDate, $lte: endDate },
      status: "booked", // Ou inclua 'completed' se fizer sentido para receita
    }).populate("service", "price");

    const currentMonthBookingsCount = currentMonthBookingsList.length;
    const totalRevenueCurrentMonth = currentMonthBookingsList.reduce((sum, booking) => {
      return sum + (booking.service && typeof booking.service.price === "number" ? booking.service.price : 0);
    }, 0);

    res.json({
      currentMonthBookings: currentMonthBookingsCount,
      totalRevenueCurrentMonth: totalRevenueCurrentMonth,
    });
  } catch (error) {
    console.error("Erro ao buscar dados de overview:", error);
    res.status(500).json({ error: "Falha ao buscar dados de overview." });
  }
});

// ROTA: GET /barbershops/:barbershopId/analytics/monthly-bookings?year=YYYY
router.get("/monthly-bookings", async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    if (!mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }

    const monthlyData = await Booking.aggregate([
      {
        $match: {
          barbershop: new mongoose.Types.ObjectId(barbershopId),
          status: { $in: ["booked", "completed"] }, // Considere quais status contar
          time: {
            $gte: startOfYear(new Date(year, 0, 1)),
            $lt: endOfYear(new Date(year, 11, 31)), // Usa endOfYear para incluir todo o ano
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$time" } },
          totalBookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $let: {
              vars: { monthsInYear: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] },
              in: { $arrayElemAt: ["$$monthsInYear", { $subtract: ["$_id.month", 1] }] },
            },
          },
          totalBookings: 1,
        },
      },
    ]);
    res.json(monthlyData);
  } catch (error) {
    console.error("Erro ao buscar agendamentos mensais:", error);
    res.status(500).json({ error: "Falha ao buscar agendamentos mensais." });
  }
});

// ROTA: GET /barbershops/:barbershopId/analytics/bookings-by-barber?period=currentMonth
router.get("/bookings-by-barber", async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const period = req.query.period || "currentMonth";
    const { startDate, endDate } = getPeriodDates(period);

    if (!mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }

    const byBarberData = await Booking.aggregate([
      {
        $match: {
          barbershop: new mongoose.Types.ObjectId(barbershopId),
          status: { $in: ["booked", "completed"] },
          time: { $gte: startDate, $lt: endDate },
        },
      },
      { $group: { _id: "$barber", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, // Opcional: ordenar por mais atendimentos
      {
        $lookup: {
          from: "barbers", // Nome da sua coleção de Barbeiros
          localField: "_id",
          foreignField: "_id",
          as: "barberDetails",
        },
      },
      { $unwind: { path: "$barberDetails", preserveNullAndEmptyArrays: true } }, // Para não quebrar se um barbeiro for deletado
      {
        $project: {
          _id: 0,
          barberId: "$_id",
          barberName: { $ifNull: ["$barberDetails.name", "Desconhecido"] },
          count: 1,
        },
      },
    ]);
    res.json(byBarberData);
  } catch (error) {
    console.error("Erro ao buscar agendamentos por profissional:", error);
    res.status(500).json({ error: "Falha ao buscar agendamentos por profissional." });
  }
});

// ROTA: GET /barbershops/:barbershopId/analytics/popular-services?period=currentMonth&limit=5
router.get("/popular-services", async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const period = req.query.period || "currentMonth";
    const limit = parseInt(req.query.limit) || 5;
    const { startDate, endDate } = getPeriodDates(period);

    if (!mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }

    const popularServices = await Booking.aggregate([
      {
        $match: {
          barbershop: new mongoose.Types.ObjectId(barbershopId),
          status: { $in: ["booked", "completed"] },
          time: { $gte: startDate, $lt: endDate },
        },
      },
      { $group: { _id: "$service", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "services", // Nome da sua coleção de Serviços
          localField: "_id",
          foreignField: "_id",
          as: "serviceDetails",
        },
      },
      { $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          serviceId: "$_id",
          serviceName: { $ifNull: ["$serviceDetails.name", "Desconhecido"] },
          count: 1,
        },
      },
    ]);
    res.json(popularServices);
  } catch (error) {
    console.error("Erro ao buscar serviços populares:", error);
    res.status(500).json({ error: "Falha ao buscar serviços populares." });
  }
});

export default router;
