import express from "express";
import Service from "../models/Service.js"; // Ajuste o caminho
import { serviceSchema as ServiceValidationSchema } from "../validations/serviceValidation.js"; // Renomeado

const router = express.Router({ mergeParams: true });

// Adicionar Serviço a uma Barbearia
// Rota esperada: POST /barbershops/:barbershopId/services
router.post("/", async (req, res) => {
  try {
    const data = ServiceValidationSchema.parse(req.body);
    const created = await Service.create({
      ...data,
      barbershop: req.params.barbershopId,
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

// Listar Serviços de uma Barbearia
// Rota esperada: GET /barbershops/:barbershopId/services
router.get("/", async (req, res) => {
  try {
    const services = await Service.find({
      barbershop: req.params.barbershopId,
    });
    res.json(services);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar serviços." });
  }
});

export default router;
