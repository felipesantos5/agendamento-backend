import express from "express";
import Booking from "../models/Booking.js";
import Subscription from "../models/Subscription.js";
import { protectCustomer } from "../middleware/authCustomerMiddleware.js";

const router = express.Router();

// ROTA: GET /api/customers/me/bookings
// Retorna o histórico de agendamentos do cliente logado
router.get("/me/bookings", protectCustomer, async (req, res) => {
  try {
    // req.customer.id viria do seu middleware de autenticação do cliente
    const customerId = req.customer.id;

    const bookings = await Booking.find({ customer: customerId })
      .sort({ time: -1 }) // Ordena do mais novo para o mais antigo
      // É aqui que a mágica acontece!
      .populate("service", "name price") // Substitui o ID do serviço pelo seu nome e preço
      .populate("barber", "name") // Substitui o ID do barbeiro pelo seu nome
      .populate("barbershop", "name slug logoUrl paymentsEnabled"); // Substitui o ID da barbearia pelo seu nome

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Erro ao buscar histórico de agendamentos:", error);
    res.status(500).json({ error: "Erro ao buscar histórico." });
  }
});

router.get("/me", protectCustomer, (req, res) => {
  // Apenas retorna os dados do cliente que já foram buscados pelo middleware
  res.status(200).json(req.customer);
});

// ROTA: GET /api/auth/customer/me/subscriptions
// Retorna as assinaturas do cliente logado
router.get("/me/subscriptions", protectCustomer, async (req, res) => {
  try {
    const customerId = req.customer.id;

    const subscriptions = await Subscription.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .populate("plan", "name description price durationInDays totalCredits")
      .populate("barbershop", "name slug logoUrl");

    res.status(200).json(subscriptions);
  } catch (error) {
    console.error("Erro ao buscar assinaturas:", error);
    res.status(500).json({ error: "Erro ao buscar assinaturas." });
  }
});

// ROTA: GET /api/auth/customer/me/credits/:barbershopId
// Retorna os créditos ativos do cliente em uma barbearia específica
router.get("/me/credits/:barbershopId", protectCustomer, async (req, res) => {
  try {
    const customerId = req.customer.id;
    const { barbershopId } = req.params;

    const activeSubscriptions = await Subscription.find({
      customer: customerId,
      barbershop: barbershopId,
      status: "active",
      endDate: { $gte: new Date() },
      creditsRemaining: { $gt: 0 },
    })
      .populate("plan", "name totalCredits")
      .lean();

    // Formata a resposta com os créditos por plano
    const credits = activeSubscriptions.map((sub) => ({
      planId: sub.plan._id,
      planName: sub.plan.name,
      creditsRemaining: sub.creditsRemaining,
      totalCredits: sub.plan.totalCredits,
      endDate: sub.endDate,
    }));

    res.status(200).json(credits);
  } catch (error) {
    console.error("Erro ao buscar créditos:", error);
    res.status(500).json({ error: "Erro ao buscar créditos." });
  }
});

export default router;
