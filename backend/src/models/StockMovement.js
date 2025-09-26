import mongoose from "mongoose";
const { Schema } = mongoose;

const StockMovementSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["entrada", "saida", "ajuste", "perda", "venda"],
    },
    quantity: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    unitCost: {
      type: Number,
      min: 0,
    },
    totalCost: {
      type: Number,
      min: 0,
    },
    barbershop: {
      type: Schema.Types.ObjectId,
      ref: "Barbershop",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
StockMovementSchema.index({ barbershop: 1, createdAt: -1 });
StockMovementSchema.index({ product: 1, createdAt: -1 });

export default mongoose.model("StockMovement", StockMovementSchema);
