import express from "express";
import Barbershop from "../models/Barbershop.js"; // Ajuste o caminho
import { BarbershopSchema as BarbershopValidationSchema, BarbershopUpdateSchema } from "../validations/barbershopValidation.js"; // Renomeado para evitar conflito com o modelo Mongoose

const router = express.Router();

// CRIAÇÃO
router.post("/", async (req, res) => {
  try {
    const data = BarbershopValidationSchema.parse(req.body);
    const created = await Barbershop.create(data);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

// LISTAR TODAS
router.get("/", async (_req, res) => {
  res.json(await Barbershop.find());
});

// ROTA POR SLUG
router.get("/slug/:slug", async (req, res) => {
  try {
    const barbershop = await Barbershop.findOne({ slug: req.params.slug });
    if (!barbershop) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }
    res.json(barbershop);
  } catch (e) {
    res.status(400).json({ error: "Erro na busca pela barbearia" });
  }
});

// LISTAR POR ID
router.get("/:id", async (req, res) => {
  try {
    const barbershop = await Barbershop.findById(req.params.id);
    if (!barbershop) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }
    res.json(barbershop);
  } catch (e) {
    res.status(400).json({ error: "ID inválido" });
  }
});

// EDITAR (PUT)
router.put("/:id", async (req, res) => {
  try {
    const data = BarbershopUpdateSchema.parse(req.body);
    const updated = await Barbershop.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.errors || e.message });
  }
});

// DELETAR POR ID
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Barbershop.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }
    res.json({ message: "Barbearia removida com sucesso" });
  } catch (e) {
    res.status(400).json({ error: "ID inválido" });
  }
});

export default router;
