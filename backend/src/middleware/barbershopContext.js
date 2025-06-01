// src/middlewares/barbershopContext.js
import mongoose from "mongoose";
import Barbershop from "../models/Barbershop";

export async function setBarbershopContext(req, res, next) {
  const identifier =
    req.params.slugOuIdBarbearia || req.params.id || req.params.barbershopId; // Seja flexível com o nome do parâmetro

  if (!identifier) {
    return res
      .status(400)
      .json({ error: "Identificador da barbearia não fornecido na rota." });
  }
  try {
    let barbershopContext;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      barbershopContext = await Barbershop.findById(identifier)
        .select("_id name")
        .lean();
    } else {
      barbershopContext = await Barbershop.findOne({ slug: identifier })
        .select("_id name")
        .lean();
    }

    if (!barbershopContext) {
      return res.status(404).json({ error: "Barbearia não encontrada." });
    }
    req.barbershopIdContexto = barbershopContext._id.toString();
    req.barbershopNameContexto = barbershopContext.name;
    next();
  } catch (error) {
    console.error("Erro no middleware setBarbershopContext:", error);
    return res
      .status(500)
      .json({ error: "Erro interno ao definir o contexto da barbearia." });
  }
}
