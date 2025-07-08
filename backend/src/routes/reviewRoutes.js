import express from "express";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import { protectCustomer } from "../middleware/authCustomerMiddleware.js";

const router = express.Router({ mergeParams: true });

// ROTA PÚBLICA: Lista as avaliações de uma barbearia
router.get("/", async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const reviews = await Review.find({ barbershop: barbershopId }).sort({ createdAt: -1 }).populate("customer", "name imageUrl"); // Busca os dados do cliente

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Erro ao buscar avaliações:", error);
    res.status(500).json({ error: "Erro ao buscar avaliações." });
  }
});

// ROTA PROTEGIDA: Cliente logado cria uma nova avaliação
router.post("/", protectCustomer, async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const { rating, comment } = req.body;
    const customerId = req.customer.id; // Vindo do middleware de autenticação

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "A nota da avaliação (de 1 a 5) é obrigatória." });
    }

    const newReview = await Review.create({
      rating,
      comment,
      customer: customerId,
      barbershop: barbershopId,
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error("Erro ao criar avaliação:", error);
    res.status(500).json({ error: "Erro ao criar avaliação." });
  }
});

export default router;
