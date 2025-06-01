import mongoose, { Schema } from "mongoose";

const BarberSchema = new Schema({
  name: String,
  barbershop: { type: Schema.Types.ObjectId, ref: "Barbershop" },
  availability: [{ day: String, start: String, end: String }],
});

export default mongoose.model("Barber", BarberSchema);
