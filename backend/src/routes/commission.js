import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";
import { requireRole } from "../middleware/authAdminMiddleware.js";
import "dotenv/config";

const router = express.Router({ mergeParams: true });

router.get("/", protectAdmin, requireRole("admin"), async (req, res) => {
  try {
    const { barbershopId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }

    const { role, barberProfileId } = req.adminUser;
    const { barberId, startDate, endDate, month, year } = req.query;

    // Validação de permissões
    if (role === "barber" && barberId && barberId !== barberProfileId) {
      return res.status(403).json({ error: "Barbeiro não pode visualizar comissões de outros barbeiros" });
    }

    // Construir query base
    let query = {
      barbershop: new mongoose.Types.ObjectId(barbershopId),
      status: "completed", // Apenas agendamentos concluídos
    };

    // Filtro por barbeiro
    if (role === "barber") {
      query.barber = new mongoose.Types.ObjectId(barberProfileId);
    } else if (barberId) {
      query.barber = new mongoose.Types.ObjectId(barberId);
    }

    // Filtro por período
    if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      query.time = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (startDate && endDate) {
      query.time = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Agregação para calcular comissões
    const commissions = await Booking.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "barbers",
          localField: "barber",
          foreignField: "_id",
          as: "barberInfo",
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "service",
          foreignField: "_id",
          as: "serviceInfo",
        },
      },
      { $unwind: "$barberInfo" },
      { $unwind: "$serviceInfo" },
      {
        $group: {
          _id: "$barber",
          barberName: { $first: "$barberInfo.name" },
          barberImage: { $first: "$barberInfo.image" },
          commissionRate: { $first: "$barberInfo.commission" },
          totalServices: { $sum: 1 },
          totalRevenue: { $sum: "$serviceInfo.price" },
          services: {
            $push: {
              bookingId: "$_id",
              serviceName: "$serviceInfo.name",
              servicePrice: "$serviceInfo.price",
              date: "$time",
              customerName: "$customer.name",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          barberName: 1,
          barberImage: 1,
          commissionRate: 1,
          totalServices: 1,
          totalRevenue: 1,
          totalCommission: {
            $multiply: ["$totalRevenue", { $divide: ["$commissionRate", 100] }],
          },
          services: 1,
        },
      },
      { $sort: { totalCommission: -1 } },
    ]);

    res.json({
      success: true,
      data: commissions,
      period: { month, year, startDate, endDate },
    });
  } catch (error) {
    console.error("Erro ao buscar comissões:", error);
    res.status(500).json({ error: "Erro ao calcular comissões" });
  }
});

// GET /api/barbershops/:barbershopId/analytics/commissions/summary
router.get("/summary", protectAdmin, async (req, res) => {
  try {
    const { barbershopId } = req.params; // Correção: Obter barbershopId de req.params
    if (!mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }

    const { year } = req.query;

    const currentYear = year || new Date().getFullYear();

    // Resumo mensal de comissões
    const monthlySummary = await Booking.aggregate([
      {
        $match: {
          barbershop: new mongoose.Types.ObjectId(barbershopId),
          status: "completed",
          time: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31, 23, 59, 59),
          },
        },
      },
      {
        $lookup: {
          from: "barbers",
          localField: "barber",
          foreignField: "_id",
          as: "barberInfo",
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "service",
          foreignField: "_id",
          as: "serviceInfo",
        },
      },
      { $unwind: "$barberInfo" },
      { $unwind: "$serviceInfo" },
      {
        $group: {
          _id: {
            month: { $month: "$time" },
            year: { $year: "$time" },
          },
          totalRevenue: { $sum: "$serviceInfo.price" },
          totalCommissions: {
            $sum: {
              $multiply: ["$serviceInfo.price", { $divide: ["$barberInfo.commission", 100] }],
            },
          },
          totalServices: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    res.json({
      success: true,
      data: monthlySummary,
      year: currentYear,
    });
  } catch (error) {
    console.error("Erro ao buscar resumo de comissões:", error);
    res.status(500).json({ error: "Erro ao buscar resumo" });
  }
});

export default router;
