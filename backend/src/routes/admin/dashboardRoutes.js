import express from "express";
import mongoose from "mongoose";
import { protectAdmin, requireRole } from "../../middleware/authAdminMiddleware.js";
import Booking from "../../models/Booking.js";
import Barber from "../../models/Barber.js";
import Customer from "../../models/Customer.js";
import StockMovement from "../../models/StockMovement.js";
import Subscription from "../../models/Subscription.js";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO, isValid } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const router = express.Router({ mergeParams: true });

// Protege todas as rotas neste arquivo
router.use(protectAdmin, requireRole("admin"));

const BRAZIL_TZ = "America/Sao_Paulo";

// GET /barbershops/:barbershopId/dashboard-metrics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const barbershopMongoId = new mongoose.Types.ObjectId(barbershopId);

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
    const [bookingResults, planRevenueResults, productSaleResults] = await Promise.all([
      Booking.aggregate([
        // 1. Filtro inicial
        {
          $match: {
            barbershop: barbershopMongoId,
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
                  totalRewardsRedeemed: {
                    $sum: { $cond: [{ $and: [{ $eq: ["$status", "completed"] }, { $eq: ["$paymentStatus", "loyalty_reward"] }] }, 1, 0] },
                  },
                  // A receita só soma se for concluído E NÃO for plano E NÃO for prêmio
                  totalRevenue: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$status", "completed"] },
                            // --- CORREÇÃO 1 AQUI ---
                            { $not: { $in: ["$paymentStatus", ["plan_credit", "loyalty_reward"]] } },
                          ],
                        },
                        { $ifNull: ["$serviceDetails.price", 0] }, // Valor
                        0, // Else
                      ],
                    },
                  },
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
                  totalRewardsRedeemed: { $ifNull: ["$totalRewardsRedeemed", 0] },
                  totalRevenue: { $ifNull: ["$totalRevenue", 0] },
                  onlineRevenue: { $ifNull: ["$onlineRevenue", 0] },
                  onlinePaymentsCount: { $ifNull: ["$onlinePaymentsCount", 0] },
                  cancellationRate: {
                    $cond: [{ $gt: ["$totalBookings", 0] }, { $multiply: [{ $divide: ["$canceledBookings", "$totalBookings"] }, 100] }, 0],
                  },
                  averageTicket: {
                    $cond: [
                      { $gt: [{ $subtract: ["$completedBookings", "$totalRewardsRedeemed"] }, 0] },
                      { $divide: ["$totalRevenue", { $subtract: ["$completedBookings", "$totalRewardsRedeemed"] }] },
                      0,
                    ],
                  },
                  totalUniqueCustomers: { $size: { $ifNull: ["$uniqueCustomers", []] } },
                },
              },
            ],
            // --- Métricas por Barbeiro ---
            barberMetrics: [
              {
                $group: {
                  _id: "$barberDetails._id",
                  name: { $first: "$barberDetails.name" },
                  commissionRate: { $first: { $ifNull: ["$barberDetails.commission", 0] } },
                  // Receita (exclui prêmios/planos)
                  totalRevenue: {
                    $sum: {
                      $cond: [
                        // --- CORREÇÃO 2 AQUI ---
                        { $and: [{ $eq: ["$status", "completed"] }, { $not: { $in: ["$paymentStatus", ["plan_credit", "loyalty_reward"]] } }] },
                        { $ifNull: ["$serviceDetails.price", 0] },
                        0,
                      ],
                    },
                  },
                  // Contagem (inclui prêmios/planos)
                  completedBookings: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                  canceledBookings: { $sum: { $cond: [{ $eq: ["$status", "canceled"] }, 1, 0] } },
                  totalRewardsRedeemed: {
                    $sum: {
                      $cond: [{ $and: [{ $eq: ["$status", "completed"] }, { $eq: ["$paymentStatus", "loyalty_reward"] }] }, 1, 0],
                    },
                  },
                },
              },
              // PRIMEIRO $project: SANITIZAÇÃO
              {
                $project: {
                  _id: 1,
                  name: 1,
                  commissionRateNum: { $ifNull: ["$commissionRate", 0] },
                  totalRevenueNum: { $ifNull: ["$totalRevenue", 0] },
                  completedBookingsNum: { $ifNull: ["$completedBookings", 0] },
                  canceledBookingsNum: { $ifNull: ["$canceledBookings", 0] },
                  totalRewardsRedeemedNum: { $ifNull: ["$totalRewardsRedeemed", 0] },
                },
              },
              // SEGUNDO $project: CÁLCULOS E SAÍDA FINAL
              {
                $project: {
                  _id: 0,
                  barberId: "$_id",
                  name: { $ifNull: ["$name", "Barbeiro Removido"] },
                  commissionRate: "$commissionRateNum",
                  totalRevenue: "$totalRevenueNum",
                  completedBookings: "$completedBookingsNum",
                  canceledBookings: "$canceledBookingsNum",
                  totalRewardsRedeemed: "$totalRewardsRedeemedNum",
                  totalCommission: { $multiply: ["$totalRevenueNum", { $divide: ["$commissionRateNum", 100] }] },
                  averageTicket: {
                    $cond: [
                      { $gt: [{ $subtract: ["$completedBookingsNum", "$totalRewardsRedeemedNum"] }, 0] },
                      { $divide: ["$totalRevenueNum", { $subtract: ["$completedBookingsNum", "$totalRewardsRedeemedNum"] }] },
                      0,
                    ],
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
                  // Receita (exclui prêmios/planos)
                  totalRevenue: {
                    // --- CORREÇÃO 3 AQUI ---
                    $sum: {
                      $cond: [{ $not: { $in: ["$paymentStatus", ["plan_credit", "loyalty_reward"]] } }, { $ifNull: ["$serviceDetails.price", 0] }, 0],
                    },
                  },
                  count: { $sum: 1 }, // Contagem total (inclui prêmios)
                  redeemedAsReward: {
                    $sum: {
                      $cond: [{ $eq: ["$paymentStatus", "loyalty_reward"] }, 1, 0],
                    },
                  },
                },
              },
              {
                // $project
                $project: {
                  _id: 0,
                  serviceId: "$_id",
                  name: { $ifNull: ["$name", "Serviço Removido"] },
                  totalRevenue: 1,
                  count: 1,
                  redeemedAsReward: 1,
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
                  // Receita (exclui prêmios/planos)
                  totalRevenue: {
                    $sum: {
                      $cond: [
                        // --- CORREÇÃO FINAL AQUI ---
                        { $not: { $in: ["$paymentStatus", ["plan_credit", "loyalty_reward"]] } },
                        { $ifNull: ["$serviceDetails.price", 0] },
                        0,
                      ],
                    },
                  },
                  count: { $sum: 1 }, // Contagem total (inclui prêmios)
                  redeemedAsReward: {
                    $sum: {
                      $cond: [{ $eq: ["$paymentStatus", "loyalty_reward"] }, 1, 0],
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  serviceId: "$_id",
                  name: { $ifNull: ["$name", "Serviço Removido"] },
                  totalRevenue: 1,
                  count: 1,
                  redeemedAsReward: 1,
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
      ]),

      Subscription.aggregate([
        {
          $match: {
            barbershop: new mongoose.Types.ObjectId(barbershopId),
            // Filtra planos VENDIDOS (criados) dentro do período
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $lookup: {
            from: "plans", // Coleção de Planos
            localField: "plan",
            foreignField: "_id",
            as: "planDetails",
          },
        },
        { $unwind: "$planDetails" },
        {
          $group: {
            _id: null,
            totalPlanRevenue: { $sum: "$planDetails.price" }, // Soma o PREÇO do plano
            totalPlansSold: { $sum: 1 },
          },
        },
      ]),

      StockMovement.aggregate([
        {
          $match: {
            barbershop: new mongoose.Types.ObjectId(barbershopId),
            type: "venda", // Filtra APENAS movimentações do tipo "venda"
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        // Precisamos buscar o preço de VENDA do produto
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: null,
            totalItemsSold: { $sum: "$quantity" },
            // Lucro Bruto = Receita Total (Preço de Venda * Qtd)
            totalGrossRevenue: { $sum: { $multiply: ["$quantity", "$productDetails.price.sale"] } },
            // Custo Total = Custo de Compra * Qtd (já está em totalCost)
            totalCostOfGoods: { $sum: "$totalCost" },
          },
        },
        {
          $project: {
            _id: 0,
            totalItemsSold: 1,
            totalGrossRevenue: 1, // <- Lucro Bruto (Faturamento)
            totalCostOfGoods: 1,
            // Lucro Líquido = Faturamento - Custo
            totalNetProfit: { $subtract: ["$totalGrossRevenue", "$totalCostOfGoods"] }, // <- Lucro Líquido
          },
        },
      ]),
    ]); // Fim do Promise.all

    // --- 3. COMBINAR OS RESULTADOS ---

    const results = bookingResults[0];
    const planRevenueData = planRevenueResults[0] || { totalPlanRevenue: 0, totalPlansSold: 0 };
    const productMetricsData = productSaleResults[0] || {
      totalItemsSold: 0,
      totalGrossRevenue: 0,
      totalCostOfGoods: 0,
      totalNetProfit: 0,
    };

    // Pega os dados de generalMetrics (agora corrigidos)
    const overviewData = results?.generalMetrics[0] || {
      totalBookings: 0,
      completedBookings: 0,
      canceledBookings: 0,
      pendingBookings: 0,
      totalRewardsRedeemed: 0, // <-- Inclui o novo campo no default
      totalRevenue: 0,
      onlineRevenue: 0,
      onlinePaymentsCount: 0,
      cancellationRate: 0,
      averageTicket: 0,
      totalUniqueCustomers: 0,
    };

    // Cálculo da Receita Total (sem alteração)
    const totalRevenueCombined =
      overviewData.totalRevenue + // (Já é R$ 0 para prêmios)
      planRevenueData.totalPlanRevenue +
      productMetricsData.totalGrossRevenue;

    // --- 4. Organização da Resposta ---
    const dashboardData = {
      period: {
        startDate: toZonedTime(startDate, BRAZIL_TZ).toISOString().split("T")[0],
        endDate: toZonedTime(endDate, BRAZIL_TZ).toISOString().split("T")[0],
      },
      // Visão Geral (Soma de tudo)
      overview: {
        ...overviewData, // Pega (totalBookings, canceledBookings, etc)

        // --- CAMPOS ATUALIZADOS/ADICIONADOS ---
        totalRevenue: totalRevenueCombined, // Receita total (Serviços + Planos + Produtos)

        revenueFromServices: overviewData.totalRevenue, // Receita apenas de serviços avulsos
        revenueFromPlans: planRevenueData.totalPlanRevenue, // Receita apenas de planos
        revenueFromProducts: productMetricsData.totalGrossRevenue, // Receita apenas de produtos

        totalPlansSold: planRevenueData.totalPlansSold,
        totalProductsSold: productMetricsData.totalItemsSold, // Total de itens vendidos
        // ------------------------------------
      },

      // --- NOVO BLOCO: Métricas detalhadas de Produtos ---
      productMetrics: {
        totalItemsSold: productMetricsData.totalItemsSold,
        totalGrossRevenue: productMetricsData.totalGrossRevenue, // Lucro Bruto (Faturamento)
        totalCostOfGoods: productMetricsData.totalCostOfGoods, // Custo
        totalNetProfit: productMetricsData.totalNetProfit, // Lucro Líquido
      },
      // --------------------------------------------------

      // Blocos existentes
      barberPerformance: results?.barberMetrics || [],
      servicePerformance: results?.serviceMetrics || [],
      customerStats: (results?.customerAnalysis || []).reduce(
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
    });
  }
});

export default router;
