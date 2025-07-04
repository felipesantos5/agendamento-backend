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
    // Essencial para ligar o plano à barbearia correta
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
