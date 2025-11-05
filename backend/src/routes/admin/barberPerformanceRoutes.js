import express from "express";
import mongoose from "mongoose";
import { protectAdmin } from "../../middleware/authAdminMiddleware.js";
import Booking from "../../models/Booking.js";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const router = express.Router({ mergeParams: true });

// Definir o fuso horário padrão
const BRAZIL_TZ = "America/Sao_Paulo";

// Proteger todas as rotas neste arquivo
// Qualquer usuário logado (admin ou barber) pode acessar,
// mas a lógica interna filtrará pelo ID do token.
router.use(protectAdmin);

/**
 * ROTA: GET /api/barbershops/:barbershopId/barber-performance
 *
 * Retorna as métricas de performance detalhadas para o barbeiro LOGADO.
 *
 * Query Params (Opcionais):
 * - ?startDate=YYYY-MM-DD
 * - ?endDate=YYYY-MM-DD
 * (Se não fornecidos, usa o mês atual)
 */
router.get("/", async (req, res) => {
  try {
    const { barbershopId } = req.params;

    // 1. IDENTIFICAR O BARBEIRO
    // Pegamos o ID do perfil de barbeiro do token JWT (que o protectAdmin já decodificou)
    const barberId = req.adminUser?.barberProfileId;

    if (!barberId) {
      return res.status(403).json({
        error: "Usuário não tem um perfil de barbeiro associado.",
      });
    }

    const barberMongoId = new mongoose.Types.ObjectId(barberId);
    const barbershopMongoId = new mongoose.Types.ObjectId(barbershopId);

    // 2. DEFINIR O PERÍODO DE TEMPO
    let { startDate: startDateQuery, endDate: endDateQuery } = req.query;
    let startDate, endDate;
    const nowInBrazil = toZonedTime(new Date(), BRAZIL_TZ);

    if (startDateQuery) {
      startDate = fromZonedTime(startOfMonth(parseISO(startDateQuery)), BRAZIL_TZ);
    } else {
      startDate = fromZonedTime(startOfMonth(nowInBrazil), BRAZIL_TZ);
    }

    if (endDateQuery) {
      endDate = fromZonedTime(endOfMonth(parseISO(endDateQuery)), BRAZIL_TZ);
    } else {
      endDate = fromZonedTime(endOfMonth(nowInBrazil), BRAZIL_TZ);
    }

    // 3. CONSTRUIR A PIPELINE DE AGREGAÇÃO
    const pipeline = [
      // Estágio 1: Filtrar agendamentos relevantes
      {
        $match: {
          barbershop: barbershopMongoId,
          barber: barberMongoId,
          status: "completed", // Apenas agendamentos concluídos
          time: { $gte: startDate, $lte: endDate },
        },
      },
      // Estágio 2: Buscar detalhes do serviço (para preço e nome)
      {
        $lookup: {
          from: "services",
          localField: "service",
          foreignField: "_id",
          as: "serviceDetails",
        },
      },
      // Estágio 3: Buscar detalhes do barbeiro (para taxa de comissão)
      {
        $lookup: {
          from: "barbers",
          localField: "barber",
          foreignField: "_id",
          as: "barberDetails",
        },
      },
      // Estágio 4: Buscar detalhes do cliente (para métricas extras)
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customerDetails",
        },
      },
      // Desconstruir os arrays dos lookups
      { $unwind: "$serviceDetails" },
      { $unwind: "$barberDetails" },
      { $unwind: "$customerDetails" },

      // Estágio 5: Executar agregações paralelas (métricas gerais E breakdown por serviço)
      {
        $facet: {
          // Faceta 1: Métricas Gerais
          geral: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$serviceDetails.price" },
                totalBookings: { $sum: 1 },
                // Pega a comissão (assumindo que é a mesma para todos os bookings do barbeiro)
                commissionRate: { $first: "$barberDetails.commission" },
                // Cria um array de IDs de clientes únicos
                uniqueCustomers: { $addToSet: "$customerDetails._id" },
              },
            },
            {
              $project: {
                _id: 0,
                totalRevenue: 1,
                totalBookings: 1,
                commissionRate: 1,
                // Calcula a comissão total
                totalCommission: {
                  $multiply: ["$totalRevenue", { $divide: ["$commissionRate", 100] }],
                },
                // Métrica extra: Ticket Médio
                averageTicket: {
                  $cond: [{ $gt: ["$totalBookings", 0] }, { $divide: ["$totalRevenue", "$totalBookings"] }, 0],
                },
                // Métrica extra: Total de Clientes Únicos
                totalUniqueCustomers: { $size: "$uniqueCustomers" },
              },
            },
          ],
          // Faceta 2: Breakdown por Serviço (O que você pediu)
          servicosExecutados: [
            {
              $group: {
                _id: "$serviceDetails._id",
                serviceName: { $first: "$serviceDetails.name" },
                count: { $sum: 1 },
                revenueFromService: { $sum: "$serviceDetails.price" },
              },
            },
            { $sort: { revenueFromService: -1 } }, // Ordena por mais rentáveis
            {
              $project: {
                _id: 0,
                serviceId: "$_id",
                serviceName: 1,
                count: 1,
                revenueFromService: 1,
              },
            },
          ],
        },
      },
    ];

    // 4. EXECUTAR A AGREGAÇÃO
    const result = await Booking.aggregate(pipeline);

    // 5. FORMATAR A RESPOSTA
    // O $facet retorna um array, pegamos o primeiro elemento
    const metrics = result[0];

    // Limpa a resposta para o frontend
    const response = {
      // Formata o período para o frontend saber o que está vendo
      period: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      // Se 'geral' estiver vazio (nenhum booking), retorna valores zerados
      overview: metrics.geral[0] || {
        totalRevenue: 0,
        totalBookings: 0,
        commissionRate: (await mongoose.model("Barber").findById(barberMongoId).select("commission").lean())?.commission || 0,
        totalCommission: 0,
        averageTicket: 0,
        totalUniqueCustomers: 0,
      },
      serviceBreakdown: metrics.servicosExecutados || [],
    };

    res.json(response);
  } catch (error) {
    console.error("Erro ao buscar métricas de performance do barbeiro:", error);
    res.status(500).json({ error: "Erro interno ao buscar métricas." });
  }
});

export default router;
