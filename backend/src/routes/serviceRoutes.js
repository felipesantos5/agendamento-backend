import express from "express";
import mongoose from "mongoose";
import Service from "../models/Service.js";
import { serviceSchema as ServiceValidationSchema } from "../validations/serviceValidation.js";
import { z } from "zod";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";
import { requireRole } from "../middleware/authAdminMiddleware.js";

const router = express.Router({ mergeParams: true });

// Adicionar Serviço a uma Barbearia
// Rota: POST /barbershops/:barbershopId/services
router.post("/", requireRole("admin"), async (req, res) => {
  try {
    // O schema de validação não deve incluir 'barbershop', pois será pego dos params.
    const serviceData = req.body;
    const data = ServiceValidationSchema.parse(serviceData);

    const created = await Service.create({
      ...data,
      barbershop: req.params.barbershopId,
    });
    res.status(201).json(created);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos para o serviço.", details: e.errors });
    }
    console.error("Erro ao criar serviço:", e);
    res.status(400).json({ error: e.message || "Erro ao criar serviço." });
  }
});

// Listar Serviços de uma Barbearia
// Rota: GET /barbershops/:barbershopId/services
router.get("/", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido." });
    }
    const services = await Service.find({
      barbershop: req.params.barbershopId,
    });
    res.json(services);
  } catch (e) {
    console.error("Erro ao buscar serviços:", e);
    res.status(500).json({ error: "Erro ao buscar serviços." });
  }
});

// ✅ NOVA ROTA: Atualizar um Serviço existente
// Rota: PUT /barbershops/:barbershopId/services/:serviceId
router.put("/:serviceId", requireRole("admin"), protectAdmin, async (req, res) => {
  try {
    const { barbershopId, serviceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(barbershopId) || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ error: "ID da barbearia ou do serviço inválido." });
    }

    const serviceData = req.body;
    const data = ServiceValidationSchema.parse(serviceData); // Valida os dados recebidos

    const updatedService = await Service.findOneAndUpdate(
      { _id: serviceId, barbershop: barbershopId }, // Condição para encontrar: ID do serviço E ID da barbearia
      data, // Novos dados para atualizar
      { new: true, runValidators: true } // Opções: retornar o documento atualizado e rodar validadores do Mongoose
    );

    if (!updatedService) {
      return res.status(404).json({ error: "Serviço não encontrado ou não pertence a esta barbearia." });
    }

    res.json(updatedService);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos para atualização do serviço.", details: e.errors });
    }
    console.error("Erro ao atualizar serviço:", e);
    res.status(500).json({ error: "Erro interno ao atualizar o serviço." });
  }
});

// Rota: DELETE /barbershops/:barbershopId/services/:serviceId
router.delete("/:serviceId", requireRole("admin"), protectAdmin, async (req, res) => {
  try {
    const { barbershopId, serviceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(barbershopId) || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ error: "ID da barbearia ou do serviço inválido." });
    }

    const deletedService = await Service.findOneAndDelete({
      _id: serviceId,
      barbershop: barbershopId, // Condição para encontrar: ID do serviço E ID da barbearia
    });

    if (!deletedService) {
      return res.status(404).json({ error: "Serviço não encontrado ou não pertence a esta barbearia." });
    }

    res.json({ message: "Serviço deletado com sucesso.", serviceId: deletedService._id });
  } catch (e) {
    console.error("Erro ao deletar serviço:", e);
    res.status(500).json({ error: "Erro interno ao deletar o serviço." });
  }
});

export default router;
