import express from "express";
import mongoose from "mongoose";
import Plan from "../models/Plan.js";
import { protectAdmin, requireRole } from "../middleware/authAdminMiddleware.js";

// Usamos mergeParams para acessar o :barbershopId da rota pai
const router = express.Router({ mergeParams: true });

// Todas as rotas aqui são protegidas para admins
// router.use(protectAdmin, requireRole("admin"));

/**
 * ROTA PARA CRIAR UM NOVO PLANO
 * POST /api/barbershops/:barbershopId/plans
 */
router.post("/", protectAdmin, requireRole("admin"), async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const { name, description, price } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: "Nome e preço são obrigatórios." });
    }

    const newPlan = new Plan({
      name,
      description,
      price,
      barbershop: barbershopId,
    });

    await newPlan.save();
    res.status(201).json(newPlan);
  } catch (error) {
    console.error("Erro ao criar plano:", error);
    res.status(500).json({ error: "Falha ao criar o plano." });
  }
});

/**
 * ROTA PARA LISTAR TODOS OS PLANOS DE UMA BARBEARIA
 * GET /api/barbershops/:barbershopId/plans
 */
router.get("/", async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const plans = await Plan.find({ barbershop: barbershopId }).sort({ price: 1 });
    res.status(200).json(plans);
  } catch (error) {
    console.error("Erro ao listar planos:", error);
    res.status(500).json({ error: "Falha ao listar os planos." });
  }
});

/**
 * ROTA PARA ATUALIZAR UM PLANO
 * PUT /api/barbershops/:barbershopId/plans/:planId
 */
router.put("/:planId", protectAdmin, requireRole("admin"), async (req, res) => {
  try {
    const { barbershopId, planId } = req.params;
    const { name, description, price } = req.body;

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ error: "ID do plano inválido." });
    }

    const updatedPlan = await Plan.findOneAndUpdate(
      { _id: planId, barbershop: barbershopId }, // Garante que o admin só pode editar planos da sua própria barbearia
      { $set: { name, description, price } },
      { new: true, runValidators: true }
    );

    if (!updatedPlan) {
      return res.status(404).json({ error: "Plano não encontrado ou você não tem permissão para editá-lo." });
    }

    res.status(200).json(updatedPlan);
  } catch (error) {
    console.error("Erro ao atualizar plano:", error);
    res.status(500).json({ error: "Falha ao atualizar o plano." });
  }
});

/**
 * ROTA PARA DELETAR UM PLANO
 * DELETE /api/barbershops/:barbershopId/plans/:planId
 */
router.delete("/:planId", protectAdmin, requireRole("admin"), async (req, res) => {
  try {
    const { barbershopId, planId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ error: "ID do plano inválido." });
    }

    const deletedPlan = await Plan.findOneAndDelete({
      _id: planId,
      barbershop: barbershopId,
    });

    if (!deletedPlan) {
      return res.status(404).json({ error: "Plano não encontrado ou você não tem permissão para deletá-lo." });
    }

    res.status(200).json({ success: true, message: "Plano deletado com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar plano:", error);
    res.status(500).json({ error: "Falha ao deletar o plano." });
  }
});

export default router;
