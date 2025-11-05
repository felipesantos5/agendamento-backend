import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";
import { requireRole } from "../middleware/authAdminMiddleware.js";
import Subscription from "../models/Subscription.js";
import StockMovement from "../models/StockMovement.js";
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
    const { barbershopId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }

    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();
    const barbershopMongoId = new mongoose.Types.ObjectId(barbershopId);

    // Define o período do ano inteiro
    const startDate = new Date(currentYear, 0, 1); // 1º de Janeiro
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59); // 31 de Dezembro

    // 1. Vamos buscar as 3 fontes de receita em paralelo
    const [serviceRevenue, planRevenue, productRevenue] = await Promise.all([
      // Agregação 1: Receita de Serviços (Bookings)
      Booking.aggregate([
        {
          $match: {
            barbershop: barbershopMongoId,
            status: "completed",
            // IMPORTANTE: Ignora receita de planos e prêmios
            paymentStatus: { $nin: ["plan_credit", "loyalty_reward"] },
            time: { $gte: startDate, $lte: endDate },
          },
        },
        { $lookup: { from: "services", localField: "service", foreignField: "_id", as: "serviceInfo" } },
        { $unwind: "$serviceInfo" },
        {
          $group: {
            _id: { month: { $month: "$time" } },
            totalRevenue: { $sum: "$serviceInfo.price" },
          },
        },
      ]),

      // Agregação 2: Receita de Planos (Subscriptions)
      Subscription.aggregate([
        {
          $match: {
            barbershop: barbershopMongoId,
            createdAt: { $gte: startDate, $lte: endDate }, // Data da VENDA do plano
          },
        },
        { $lookup: { from: "plans", localField: "plan", foreignField: "_id", as: "planDetails" } },
        { $unwind: "$planDetails" },
        {
          $group: {
            _id: { month: { $month: "$createdAt" } },
            totalRevenue: { $sum: "$planDetails.price" },
          },
        },
      ]),

      // Agregação 3: Receita de Produtos (StockMovements)
      StockMovement.aggregate([
        {
          $match: {
            barbershop: barbershopMongoId,
            type: "venda", // Apenas vendas
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "productDetails" } },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: { month: { $month: "$createdAt" } },
            // Faturamento Bruto (Preço de Venda * Qtd)
            totalRevenue: { $sum: { $multiply: ["$quantity", "$productDetails.price.sale"] } },
          },
        },
      ]),
    ]);

    // 2. Combinar os resultados em um array de 12 meses
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    // Inicializa o array do gráfico com 12 meses zerados
    const monthlySummary = months.map((monthName, index) => ({
      month: index + 1, // 1 para Jan, 2 para Fev...
      name: monthName,
      totalRevenue: 0,
    }));

    // Função auxiliar para somar os resultados no array 'monthlySummary'
    const combineRevenue = (results) => {
      results.forEach((item) => {
        const monthIndex = item._id.month - 1; // Mês da agregação é 1-based
        if (monthlySummary[monthIndex]) {
          monthlySummary[monthIndex].totalRevenue += item.totalRevenue;
        }
      });
    };

    // Combina as 3 fontes de receita
    combineRevenue(serviceRevenue);
    combineRevenue(planRevenue);
    combineRevenue(productRevenue);

    res.json({
      success: true,
      data: monthlySummary, // Array final pronto para o gráfico
      year: currentYear,
    });
  } catch (error) {
    console.error("Erro ao buscar resumo de faturamento mensal:", error);
    res.status(500).json({ error: "Erro ao buscar resumo" });
  }
});

export default router;
