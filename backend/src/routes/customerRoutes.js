import express from "express";
import Booking from "../models/Booking.js";
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

export default router;
