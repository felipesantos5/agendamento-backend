import mongoose, { Schema } from "mongoose";

const BarberSchema = new Schema({
  name: String,
  barbershop: { type: Schema.Types.ObjectId, ref: "Barbershop", required: true },
  availability: [{ day: String, start: String, end: String }],
  image: { type: String },
});

BarberSchema.index({ barbershop: 1 });

export default mongoose.model("Barber", BarberSchema);
