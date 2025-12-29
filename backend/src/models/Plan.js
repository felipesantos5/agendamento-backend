import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "O nome do plano é obrigatório."],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "O preço do plano é obrigatório."],
    },
    durationInDays: {
      type: Number,
      required: [true, "A duração do plano em dias é obrigatória (ex: 30 para mensal)."],
    },
    totalCredits: {
      type: Number,
      required: [true, "O número de créditos (usos) do plano é obrigatório (ex: 4)."],
      min: [1, "O plano deve ter pelo menos 1 crédito."],
      default: 1,
    },
    // Se true, totalCredits é o limite MENSAL (reseta todo mês)
    // Se false, totalCredits é o limite TOTAL do período do plano
    isMonthlyLimit: {
      type: Boolean,
      default: false,
    },
    barbershop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barbershop",
      required: true,
    },
  },
  { timestamps: true }
);

const Plan = mongoose.model("Plan", planSchema);

export default Plan;
