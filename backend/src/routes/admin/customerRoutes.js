import express from "express";
import Customer from "../../models/Customer.js";
import Plan from "../../models/Plan.js";
import Booking from "../../models/Booking.js";
import Subscription from "../../models/Subscription.js";
import {
  protectAdmin,
  requireRole,
} from "../../middleware/authAdminMiddleware.js";
import { addDays } from "date-fns";
import mongoose from "mongoose";

const router = express.Router({ mergeParams: true });
router.use(protectAdmin, requireRole("admin"));

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
    const validCustomerIds = customerData
      .map((item) => item.customerId)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    // Buscar clientes
    const customers = await Customer.find({
      _id: { $in: validCustomerIds },
    });

    // Buscar subscriptions para cada cliente
    const customersWithSubscriptions = await Promise.all(
      customers.map(async (customer) => {
        const activeSubscriptions = await Subscription.find({
          customer: customer._id,
          status: "active",
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
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
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
router.post("/:customerId/subscribe", async (req, res) => {
  try {
    const { barbershopId, customerId } = req.params;
    const { planId } = req.body;

    const [customer, plan] = await Promise.all([
      Customer.findById(customerId),
      Plan.findById(planId),
    ]);

    if (!customer || !plan) {
      return res
        .status(404)
        .json({ error: "Cliente ou plano não encontrado." });
    }

    const startDate = new Date();
    const endDate = addDays(startDate, plan.durationInDays);

    const newSubscription = await Subscription.create({
      customer: customerId,
      plan: planId,
      barbershop: barbershopId,
      startDate,
      endDate,
      status: "active",
    });

    // Adiciona a referência da nova assinatura ao cliente
    customer.subscriptions.push(newSubscription._id);
    await customer.save();

    res.status(201).json(newSubscription);
  } catch (error) {
    console.error("Erro ao inscrever cliente no plano:", error);
    res.status(500).json({ error: "Falha ao atrelar o plano." });
  }
});

export default router;
