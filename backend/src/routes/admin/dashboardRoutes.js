import express from "express";
import mongoose from "mongoose";
import { protectAdmin, requireRole } from "../../middleware/authAdminMiddleware.js";
import Booking from "../../models/Booking.js";
import Barber from "../../models/Barber.js"; // Import Barber model
import Customer from "../../models/Customer.js"; // Import Customer model
import { startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO, isValid } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz"; // Para lidar com timezones corretamente

const router = express.Router({ mergeParams: true });

// Protege todas as rotas neste arquivo
router.use(protectAdmin, requireRole("admin"));

const BRAZIL_TZ = "America/Sao_Paulo"; // Defina seu timezone

// ROTA PRINCIPAL DO DASHBOARD
// GET /barbershops/:barbershopId/dashboard-metrics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { barbershopId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }

    // --- Tratamento de Datas ---
    let { startDate: startDateQuery, endDate: endDateQuery } = req.query;
    let startDate, endDate;
    const nowInBrazil = toZonedTime(new Date(), BRAZIL_TZ);

    if (startDateQuery && isValid(parseISO(startDateQuery))) {
      startDate = fromZonedTime(startOfDay(parseISO(startDateQuery)), BRAZIL_TZ);
    } else {
      startDate = fromZonedTime(startOfMonth(nowInBrazil), BRAZIL_TZ);
    }

    if (endDateQuery && isValid(parseISO(endDateQuery))) {
      endDate = fromZonedTime(endOfDay(parseISO(endDateQuery)), BRAZIL_TZ);
    } else {
      endDate = fromZonedTime(endOfMonth(nowInBrazil), BRAZIL_TZ);
    }

    if (endDate < startDate) {
      return res.status(400).json({ error: "A data final deve ser posterior à data inicial." });
    }

    // --- Agregação Principal ---
    const results = await Booking.aggregate([
      // 1. Filtro inicial
      {
        $match: {
          barbershop: new mongoose.Types.ObjectId(barbershopId),
          time: { $gte: startDate, $lte: endDate },
        },
      },
      // 2. Lookups
      { $lookup: { from: "services", localField: "service", foreignField: "_id", as: "serviceDetails" } },
      { $lookup: { from: "barbers", localField: "barber", foreignField: "_id", as: "barberDetails" } },
      { $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "customerDetails" } },
      // 3. Unwinds
      { $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$barberDetails", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$customerDetails", preserveNullAndEmptyArrays: true } },
      {
        // 4. Facet
        $facet: {
          // --- Métricas Gerais ---
          generalMetrics: [
            {
              $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                completedBookings: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                canceledBookings: { $sum: { $cond: [{ $eq: ["$status", "canceled"] }, 1, 0] } },
                pendingBookings: { $sum: { $cond: [{ $in: ["$status", ["booked", "confirmed"]] }, 1, 0] } },
                totalRevenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, { $ifNull: ["$serviceDetails.price", 0] }, 0] } },
                onlineRevenue: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$status", "completed"] }, { $eq: ["$paymentStatus", "approved"] }] },
                      { $ifNull: ["$serviceDetails.price", 0] },
                      0,
                    ],
                  },
                },
                onlinePaymentsCount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "approved"] }, 1, 0] } },
                uniqueCustomers: { $addToSet: "$customer" },
              },
            },
            {
              $project: {
                _id: 0,
                totalBookings: 1,
                completedBookings: 1,
                canceledBookings: 1,
                pendingBookings: 1,
                totalRevenue: { $ifNull: ["$totalRevenue", 0] },
                onlineRevenue: { $ifNull: ["$onlineRevenue", 0] },
                onlinePaymentsCount: { $ifNull: ["$onlinePaymentsCount", 0] },
                cancellationRate: {
                  $cond: [{ $gt: ["$totalBookings", 0] }, { $multiply: [{ $divide: ["$canceledBookings", "$totalBookings"] }, 100] }, 0],
                },
                averageTicket: { $cond: [{ $gt: ["$completedBookings", 0] }, { $divide: ["$totalRevenue", "$completedBookings"] }, 0] },
                totalUniqueCustomers: { $size: { $ifNull: ["$uniqueCustomers", []] } },
              },
            },
          ],
          // --- Métricas por Barbeiro ---
          barberMetrics: [
            // Estágio $group permanece o mesmo
            {
              $group: {
                _id: "$barberDetails._id",
                name: { $first: "$barberDetails.name" },
                commissionRate: { $first: { $ifNull: ["$barberDetails.commission", 0] } },
                totalRevenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, { $ifNull: ["$serviceDetails.price", 0] }, 0] } },
                completedBookings: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                canceledBookings: { $sum: { $cond: [{ $eq: ["$status", "canceled"] }, 1, 0] } },
              },
            },
            // PRIMEIRO $project: SANITIZAÇÃO (Corrigido para estar aqui)
            {
              $project: {
                _id: 1,
                name: 1,
                commissionRateNum: { $ifNull: [{ $cond: { if: { $isNumber: "$commissionRate" }, then: "$commissionRate", else: 0 } }, 0] },
                totalRevenueNum: { $ifNull: [{ $cond: { if: { $isNumber: "$totalRevenue" }, then: "$totalRevenue", else: 0 } }, 0] },
                completedBookingsNum: { $ifNull: [{ $cond: { if: { $isNumber: "$completedBookings" }, then: "$completedBookings", else: 0 } }, 0] },
                canceledBookingsNum: { $ifNull: [{ $cond: { if: { $isNumber: "$canceledBookings" }, then: "$canceledBookings", else: 0 } }, 0] },
              },
            },
            // SEGUNDO $project: CÁLCULOS E SAÍDA FINAL (Corrigido para estar aqui)
            {
              $project: {
                _id: 0,
                barberId: "$_id",
                name: { $ifNull: ["$name", "Barbeiro Removido"] },
                commissionRate: "$commissionRateNum",
                totalRevenue: "$totalRevenueNum",
                completedBookings: "$completedBookingsNum",
                canceledBookings: "$canceledBookingsNum",
                totalCommission: {
                  $multiply: ["$totalRevenueNum", { $divide: ["$commissionRateNum", 100] }],
                },
                averageTicket: {
                  $cond: [{ $gt: ["$completedBookingsNum", 0] }, { $divide: ["$totalRevenueNum", "$completedBookingsNum"] }, 0],
                },
              },
            },
            { $sort: { totalRevenue: -1 } },
          ],
          // --- Métricas por Serviço ---
          serviceMetrics: [
            { $match: { status: "completed" } },
            {
              $group: {
                _id: "$serviceDetails._id",
                name: { $first: "$serviceDetails.name" },
                totalRevenue: { $sum: { $ifNull: ["$serviceDetails.price", 0] } },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                serviceId: "$_id",
                name: { $ifNull: ["$name", "Serviço Removido"] },
                totalRevenue: 1,
                count: 1,
              },
            },
            { $sort: { totalRevenue: -1 } },
          ],
          // --- Análise de Novos x Recorrentes ---
          customerAnalysis: [
            { $group: { _id: "$customer", firstVisitDate: { $min: "$customerDetails.createdAt" } } },
            {
              $project: {
                _id: 0,
                customerId: "$_id",
                isNew: { $and: [{ $gte: ["$firstVisitDate", startDate] }, { $lte: ["$firstVisitDate", endDate] }] },
              },
            },
            { $group: { _id: "$isNew", count: { $sum: 1 } } },
            { $project: { _id: 0, type: { $cond: ["$_id", "new", "returning"] }, count: 1 } },
          ],
        },
      },
    ]);

    // --- Organização da Resposta ---
    const dashboardData = {
      period: {
        startDate: toZonedTime(startDate, BRAZIL_TZ).toISOString().split("T")[0],
        endDate: toZonedTime(endDate, BRAZIL_TZ).toISOString().split("T")[0],
      },
      overview: results[0]?.generalMetrics[0] || {
        totalBookings: 0,
        completedBookings: 0,
        canceledBookings: 0,
        pendingBookings: 0,
        totalRevenue: 0,
        onlineRevenue: 0,
        onlinePaymentsCount: 0,
        cancellationRate: 0,
        averageTicket: 0,
        totalUniqueCustomers: 0,
      },
      barberPerformance: results[0]?.barberMetrics || [],
      servicePerformance: results[0]?.serviceMetrics || [],
      customerStats: (results[0]?.customerAnalysis || []).reduce(
        (acc, curr) => {
          acc[curr.type] = curr.count;
          return acc;
        },
        { new: 0, returning: 0 }
      ),
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Erro ao gerar métricas do dashboard:", error);
    const detailedError = error.message || "Erro interno ao processar as métricas.";
    res.status(500).json({
      error: detailedError,
      mongoErrorCode: error.code,
      mongoErrorCodeName: error.codeName,
      // rawError: error // Descomente apenas se precisar de mais detalhes no debug
    });
  }
});

export default router;
