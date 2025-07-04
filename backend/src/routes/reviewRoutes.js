import express from "express";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import { protectCustomer } from "../middleware/authCustomerMiddleware.js";

const router = express.Router({ mergeParams: true });

router.get("/", async (req, res) => {
  try {
    const { barbershopId } = req.params;

    const reviews = await Review.find({ barbershop: barbershopId })
      .sort({ createdAt: -1 })
      // --- A MÁGICA ACONTECE AQUI ---
      // Pede para o Mongoose "popular" o campo 'customer',
      // mas trazendo apenas os campos 'name' e 'imageUrl'.
      .populate("customer", "name imageUrl");

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Erro ao buscar avaliações:", error);
    res.status(500).json({ error: "Erro ao buscar avaliações." });
  }
});

// ROTA PROTEGIDA: POST /api/barbershops/:barbershopId/reviews
router.post("/", protectCustomer, async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const { rating, comment } = req.body;
    const customerId = req.customer.id;

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
