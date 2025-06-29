import express from "express";
import mongoose from "mongoose";
import BlockedDay from "../models/BlockedDay.js";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";

const router = express.Router({ mergeParams: true });

// ROTA: GET /api/barbershops/:barbershopId/blocked-days
// Lista todos os dias bloqueados para a barbearia
router.get("/", protectAdmin, async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const today = startOfToday();

    const blockedDays = await BlockedDay.find({
      barbershop: barbershopId,
      date: { $gte: today },
    });
    res.status(200).json(blockedDays);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar dias bloqueados." });
  }
});

// ROTA: POST /api/barbershops/:barbershopId/blocked-days
// Bloqueia um novo dia
router.post("/", protectAdmin, async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const { date, reason, barberId } = req.body;

    if (!date) {
      return res.status(400).json({ error: "A data é obrigatória." });
    }

    const newBlockedDay = new BlockedDay({
      date,
      reason,
      barber: barberId, // Pode ser null para bloquear a loja toda
      barbershop: barbershopId,
    });

    await newBlockedDay.save();
    res.status(201).json(newBlockedDay);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Este dia já está bloqueado." });
    }
    res.status(500).json({ error: "Erro ao bloquear o dia." });
  }
});

// ROTA: DELETE /api/barbershops/:barbershopId/blocked-days/:id
// Remove um bloqueio (desbloqueia o dia)
router.delete("/:id", protectAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de bloqueio inválido." });
    }

    const result = await BlockedDay.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ error: "Bloqueio não encontrado." });
    }

    res.status(200).json({ success: true, message: "Dia desbloqueado com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro ao desbloquear o dia." });
  }
});

export default router;
