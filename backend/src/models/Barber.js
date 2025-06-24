import mongoose, { Schema } from "mongoose";

const BarberSchema = new Schema({
  name: String,
  barbershop: { type: Schema.Types.ObjectId, ref: "Barbershop", required: true },
  availability: [{ day: String, start: String, end: String }],
  image: { type: String },
  commission: {
    type: Number,
    required: [true, "O percentual de comissão é obrigatório."],
    min: [0, "Comissão não pode ser negativa."],
    max: [100, "Comissão não pode exceder 100%."],
    default: 0,
  },
});

BarberSchema.index({ barbershop: 1 });

export default mongoose.model("Barber", BarberSchema);
