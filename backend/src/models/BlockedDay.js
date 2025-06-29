import mongoose from "mongoose";

const blockedDaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    barbershop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barbershop",
      required: true,
    },
    // Opcional: para bloquear um barbeiro específico em vez da loja toda
    barber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barber",
    },
  },
  { timestamps: true }
);

// Garante que não haja dias duplicados para a mesma barbearia/barbeiro
blockedDaySchema.index({ date: 1, barbershop: 1, barber: 1 }, { unique: true });

const BlockedDay = mongoose.model("BlockedDay", blockedDaySchema);

export default BlockedDay;
