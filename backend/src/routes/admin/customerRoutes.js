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
router.get("/", async (req, res) => {
  try {
    const { barbershopId } = req.params;

    // Método alternativo: usar agregação
    const customerData = await Booking.aggregate([
      // 1. Filtrar bookings da barbearia
      { $match: { barbershop: new mongoose.Types.ObjectId(barbershopId) } },

      // 2. Agrupar por customer para obter IDs únicos
      {
        $group: {
          _id: "$customer",
          count: { $sum: 1 },
        },
      },

      // 3. Projetar apenas o ID do customer
      {
        $project: {
          customerId: "$_id",
          _id: 0,
        },
      },
    ]);
    if (customerData.length === 0) {
      return res.status(200).json([]);
    }

    // Extrair apenas os IDs válidos
    const validCustomerIds = customerData.map((item) => item.customerId).filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    // Buscar clientes
    const customers = await Customer.find({
      _id: { $in: validCustomerIds },
    });

    // Buscar subscriptions para cada cliente
    const customersWithSubscriptions = await Promise.all(
      customers.map(async (customer) => {
        // AQUI: Adicione o filtro barbershop
        const now = new Date(); // Pega a data/hora atual
        const activeSubscriptions = await Subscription.find({
          customer: customer._id,
          status: "active",
          barbershop: barbershopId,
          endDate: { $gte: now }, // <--- Adicione esta linha: Garante que a data final ainda não passou
        }).populate({
          path: "plan",
          select: "name description price durationInDays",
        });

        return {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          imageUrl: customer.imageUrl,
          createdAt: customer.createdAt,
          subscriptions: activeSubscriptions,
        };
      })
    );

    res.status(200).json(customersWithSubscriptions);
  } catch (error) {
    console.error("💥 Erro ao listar clientes:", error);
    res.status(500).json({
      error: "Erro ao listar clientes.",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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
