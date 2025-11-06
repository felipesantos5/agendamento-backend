import express from "express";
import Customer from "../../models/Customer.js";
import Plan from "../../models/Plan.js";
import Booking from "../../models/Booking.js";
import Subscription from "../../models/Subscription.js";
import { protectAdmin, requireRole } from "../../middleware/authAdminMiddleware.js";
import { addDays } from "date-fns";
import mongoose from "mongoose";

const router = express.Router({ mergeParams: true });
// router.use(protectAdmin, requireRole("admin", "barber"));

// ROTA PARA LISTAR TODOS OS CLIENTES DA BARBEARIA
// GET /api/barbershops/:barbershopId/admin/customers
router.get("/", protectAdmin, requireRole("admin", "barber"), async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const searchTerm = req.query.search || ""; // Pega o termo de busca da query

    // --- NOVO PARÂMETRO DE FILTRO ---
    const { subscriptionStatus } = req.query; // "with-plan" ou "without-plan"

    if (!mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }

    // --- Início da Pipeline de Agregação ---
    // Começa com os estágios que sempre serão executados
    const pipeline = [
      // 1. Filtrar bookings apenas desta barbearia
      {
        $match: {
          barbershop: new mongoose.Types.ObjectId(barbershopId),
        },
      },
      // 2. Ordenar os bookings DE CADA cliente pelo mais recente primeiro
      {
        $sort: { time: -1 },
      },
      // 3. Agrupar por cliente para pegar a data do último booking e manter o ID
      {
        $group: {
          _id: "$customer",
          lastBookingTime: { $first: "$time" },
        },
      },
      // 4. Buscar os detalhes do cliente
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customerDetails",
        },
      },
      // 5. Desconstrói o array (remove clientes sem detalhes, ex: deletados)
      {
        $unwind: "$customerDetails",
      },
    ];

    // --- Adiciona o estágio $match de busca por NOME/TELEFONE (se houver) ---
    if (searchTerm) {
      // Tenta buscar pelo nome diretamente (case-insensitive)
      const nameSearchRegex = new RegExp(searchTerm, "i"); // Usar searchTerm diretamente

      // Mantém a busca por telefone como estava
      const phoneSearchRegex = searchTerm.replace(/\D/g, ""); // Apenas dígitos para telefone

      pipeline.push({
        $match: {
          $or: [
            { "customerDetails.name": nameSearchRegex }, // Aplica o regex simples no nome
            // Busca apenas se o searchTerm parece ser um número de telefone (contém dígitos)
            // Isso evita que a busca por "Joao" tente encontrar "Joao" no campo telefone.
            ...(phoneSearchRegex.length > 0 ? [{ "customerDetails.phone": { $regex: phoneSearchRegex } }] : []),
          ],
        },
      });
    }

    // --- ADIÇÃO DO NOVO FILTRO DE ASSINATURA ---
    // Este lookup é feito ANTES da paginação para filtrar o total de clientes

    // 6. Fazer o lookup das assinaturas ativas ANTES da paginação
    pipeline.push({
      $lookup: {
        from: "subscriptions",
        let: { customerId: "$_id" }, // Usa _id que veio do $group (é o customer ID)
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$customer", "$$customerId"] },
              status: "active",
              barbershop: new mongoose.Types.ObjectId(barbershopId),
              endDate: { $gte: new Date() },
            },
          },
          { $limit: 1 }, // Só precisamos saber se existe 1 ou mais
        ],
        as: "activeSubscriptionsCheck", // Usamos um nome diferente para esta verificação
      },
    });

    // 7. Adicionar o filtro de status da assinatura (se fornecido)
    if (subscriptionStatus === "with-plan") {
      pipeline.push({
        $match: {
          // Garante que o array activeSubscriptionsCheck não está vazio
          activeSubscriptionsCheck: { $ne: [] },
        },
      });
    } else if (subscriptionStatus === "without-plan") {
      pipeline.push({
        $match: {
          // Garante que o array activeSubscriptionsCheck está vazio
          activeSubscriptionsCheck: { $eq: [] },
        },
      });
    }
    // Se subscriptionStatus não for fornecido, nenhum $match é adicionado e todos os clientes são retornados.

    // --- Continua com os estágios restantes da pipeline ---
    pipeline.push(
      // 8. Ordenar os clientes (filtrados ou não) pelo último agendamento
      {
        $sort: { lastBookingTime: -1 },
      },
      // 9. Facet para Paginação e Contagem Total
      {
        $facet: {
          metadata: [{ $count: "totalCustomers" }], // Conta o total APÓS os filtros de busca e assinatura
          data: [
            { $skip: skip },
            { $limit: limit },
            // Lookup das assinaturas (agora para popular os dados)
            {
              $lookup: {
                from: "subscriptions",
                let: { customerId: "$_id" }, // Usa _id que veio do $group original (é o customer ID)
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$customer", "$$customerId"] },
                      status: "active",
                      barbershop: new mongoose.Types.ObjectId(barbershopId),
                      endDate: { $gte: new Date() },
                    },
                  },
                  { $lookup: { from: "plans", localField: "plan", foreignField: "_id", as: "planDetails" } },
                  { $unwind: { path: "$planDetails", preserveNullAndEmptyArrays: true } },
                ],
                as: "activeSubscriptions", // Nome original para popular os dados
              },
            },
            // Project final
            {
              $project: {
                _id: "$customerDetails._id",
                name: "$customerDetails.name",
                phone: "$customerDetails.phone",
                imageUrl: "$customerDetails.imageUrl",
                createdAt: "$customerDetails.createdAt",
                lastBookingTime: "$lastBookingTime",
                loyaltyData: "$customerDetails.loyaltyData",
                subscriptions: {
                  // Formata as assinaturas
                  $map: {
                    input: "$activeSubscriptions",
                    as: "sub",
                    in: {
                      _id: "$$sub._id",
                      startDate: "$$sub.startDate",
                      endDate: "$$sub.endDate",
                      status: "$$sub.status",
                      plan: {
                        _id: "$$sub.planDetails._id",
                        name: "$$sub.planDetails.name",
                        price: "$$sub.planDetails.price",
                        durationInDays: "$$sub.planDetails.durationInDays",
                      },
                    },
                  },
                },
              },
            },
          ], // Fim do sub-pipeline 'data'
        }, // Fim do $facet
      } // Fim do objeto $facet
    ); // Fim do push

    // Executa a pipeline completa
    const results = await Booking.aggregate(pipeline);

    const customers = results[0]?.data || [];
    const totalCustomers = results[0]?.metadata[0]?.totalCustomers || 0;
    const totalPages = Math.ceil(totalCustomers / limit);

    res.status(200).json({
      customers,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCustomers: totalCustomers,
        limit: limit,
        searchTerm: searchTerm, // Retorna o termo de busca usado
        subscriptionStatus: subscriptionStatus, // Retorna o filtro de assinatura usado
      },
    });
  } catch (error) {
    console.error("💥 Erro ao listar clientes com paginação/busca:", error);
    res.status(500).json({
      error: "Erro ao listar clientes.",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// --- As outras rotas (GET /:customerId, POST /:customerId/subscribe, GET /:customerId/bookings) ---
// ... (coloque o código das suas outras rotas aqui) ...
// GET /:customerId
router.get("/:customerId", protectAdmin, requireRole("admin", "barber"), async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ error: "ID do cliente inválido." });
    }

    const customer = await Customer.findById(customerId).populate({
      path: "subscriptions",
      match: { status: "active", endDate: { $gte: new Date() } },
      populate: {
        path: "plan",
        select: "name description price durationInDays",
      },
    });

    if (!customer) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    res.status(200).json(customer);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ error: "ID do cliente inválido." });
    }
    res.status(500).json({ error: "Erro ao buscar cliente." });
  }
});

// POST /:customerId/subscribe
router.post("/:customerId/subscribe", protectAdmin, requireRole("admin"), async (req, res) => {
  try {
    const { barbershopId, customerId } = req.params;
    const { planId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ error: "ID do cliente ou plano inválido." });
    }

    // Busca o plano para pegar 'durationInDays' E 'totalCredits'
    const [customer, plan] = await Promise.all([
      Customer.findById(customerId),
      Plan.findById(planId), // Buscamos o plano completo
    ]);

    if (!customer || !plan) {
      return res.status(404).json({ error: "Cliente ou plano não encontrado." });
    }
    if (plan.barbershop.toString() !== barbershopId) {
      return res.status(400).json({ error: "Este plano não pertence a esta barbearia." });
    }

    // Validação da Duração
    if (!plan.durationInDays || typeof plan.durationInDays !== "number" || plan.durationInDays <= 0) {
      return res.status(400).json({
        error: `O plano "${plan.name}" não possui uma duração válida definida.`,
      });
    }

    // --- VALIDAÇÃO DOS CRÉDITOS ---
    if (!plan.totalCredits || typeof plan.totalCredits !== "number" || plan.totalCredits <= 0) {
      return res.status(400).json({
        error: `O plano "${plan.name}" não possui um número de créditos válido.`,
      });
    }
    // -----------------------------

    const startDate = new Date();
    const endDate = addDays(startDate, plan.durationInDays);

    if (isNaN(endDate.getTime())) {
      console.error("endDate resultou em Data Inválida. startDate:", startDate, "durationInDays:", plan.durationInDays);
      return res.status(500).json({ error: "Falha ao calcular a data final da assinatura." });
    }

    // (Opcional) Verificar se já existe assinatura *ativa*
    const existingActiveSubscriptionForPlan = await Subscription.findOne({
      customer: customerId,
      plan: planId,
      barbershop: barbershopId,
      status: "active",
      endDate: { $gte: new Date() },
    });
    if (existingActiveSubscriptionForPlan) {
      return res.status(409).json({
        error: `O cliente já possui uma assinatura ativa para o plano "${plan.name}".`,
      });
    }

    const newSubscription = await Subscription.create({
      customer: customerId,
      plan: planId,
      barbershop: barbershopId,
      startDate,
      endDate,
      status: "active",
      creditsRemaining: plan.totalCredits, // <-- DEFININDO OS CRÉDITOS
    });

    customer.subscriptions.push(newSubscription._id);
    await customer.save();

    const populatedSubscription = await Subscription.findById(newSubscription._id)
      .populate("plan", "name price durationInDays totalCredits") // Adiciona totalCredits
      .populate("customer", "name phone");

    res.status(201).json(populatedSubscription || newSubscription);
  } catch (error) {
    console.error("Erro ao inscrever cliente no plano:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: "Dados inválidos para a assinatura.", details: error.errors });
    }
    res.status(500).json({ error: "Falha ao atrelar o plano." });
  }
});

// GET /:customerId/bookings
router.get("/:customerId/bookings", protectAdmin, requireRole("admin", "barber"), async (req, res) => {
  try {
    const { barbershopId, customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ error: "ID do cliente inválido." });
    }

    const bookings = await Booking.find({
      customer: customerId,
      barbershop: barbershopId,
    })
      .sort({ time: -1 })
      .populate("service", "name price duration")
      .populate("barber", "name image")
      .populate("barbershop", "name");

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Erro ao buscar agendamentos do cliente:", error);
    res.status(500).json({ error: "Erro ao buscar agendamentos do cliente." });
  }
});

router.get("/:customerId", async (req, res) => {
  try {
    const { barbershopId, customerId } = req.params;

    const customer = await Customer.findById(customerId).populate({
      path: "subscriptions",
      match: { status: "active" },
      populate: {
        path: "plan",
        select: "name description price durationInDays",
      },
    });

    if (!customer) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    res.status(200).json(customer);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    res.status(500).json({ error: "Erro ao buscar cliente." });
  }
});

// ROTA PARA ATRELAR UM PLANO A UM CLIENTE
// POST /api/barbershops/:barbershopId/admin/customers/:customerId/subscribe
router.post(
  "/:customerId/subscribe",
  protectAdmin, // Mova protectAdmin para cá se ainda não estiver
  requireRole("admin"),
  async (req, res) => {
    try {
      const { barbershopId, customerId } = req.params;
      const { planId } = req.body;

      // Validação básica dos IDs
      if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(planId)) {
        return res.status(400).json({ error: "ID do cliente ou plano inválido." });
      }

      const [customer, plan] = await Promise.all([Customer.findById(customerId), Plan.findById(planId)]);

      if (!customer || !plan) {
        return res.status(404).json({ error: "Cliente ou plano não encontrado." });
      }

      // --- VERIFICAÇÃO ADICIONADA ---
      // Verifica se durationInDays existe, é um número e é maior que zero
      if (!plan.durationInDays || typeof plan.durationInDays !== "number" || plan.durationInDays <= 0) {
        return res.status(400).json({
          error: `O plano "${plan.name}" não possui uma duração válida definida. Verifique a configuração do plano.`,
        });
      }
      // -----------------------------

      const startDate = new Date();
      // Agora é seguro usar plan.durationInDays
      const endDate = addDays(startDate, plan.durationInDays);

      // Verifica se endDate é uma data válida após o cálculo
      if (isNaN(endDate.getTime())) {
        console.error("endDate resultou em Data Inválida mesmo após a verificação. startDate:", startDate, "durationInDays:", plan.durationInDays);
        return res.status(500).json({ error: "Falha ao calcular a data final da assinatura." });
      }

      const newSubscription = await Subscription.create({
        customer: customerId,
        plan: planId,
        barbershop: barbershopId,
        startDate,
        endDate,
        status: "active",
      });

      // Adiciona a referência da nova assinatura ao cliente
      // É mais seguro usar $addToSet para evitar duplicatas, embora improvável aqui
      customer.subscriptions.push(newSubscription._id);
      await customer.save();

      // Opcional: Popular o plano na resposta para mais detalhes
      const populatedSubscription = await Subscription.findById(newSubscription._id).populate("plan", "name price durationInDays"); // Popula o plano

      res.status(201).json(populatedSubscription || newSubscription); // Retorna a versão populada se disponível
    } catch (error) {
      console.error("Erro ao inscrever cliente no plano:", error);
      // Tratamento de erro mais específico para validação do Mongoose
      if (error.name === "ValidationError") {
        return res.status(400).json({ error: "Dados inválidos para a assinatura.", details: error.errors });
      }
      res.status(500).json({ error: "Falha ao atrelar o plano." });
    }
  }
);

router.get("/:customerId/bookings", async (req, res) => {
  try {
    const { barbershopId, customerId } = req.params;

    // Buscar agendamentos do cliente nesta barbearia
    const bookings = await Booking.find({
      customer: customerId,
      barbershop: barbershopId,
    })
      .sort({ date: -1, time: -1 }) // Ordena do mais recente para o mais antigo
      .populate("service", "name price duration")
      .populate("barber", "name")
      .populate("barbershop", "name");

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Erro ao buscar agendamentos do cliente:", error);
    res.status(500).json({ error: "Erro ao buscar agendamentos do cliente." });
  }
});

export default router;
