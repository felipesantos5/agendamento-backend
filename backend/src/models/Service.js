import mongoose, { Schema } from "mongoose";

const ServiceSchema = new Schema({
  name: String,
  description: String,
  price: Number,
  duration: Number, // minutos
  barbershop: { type: Schema.Types.ObjectId, ref: "Barbershop" },
});

export default mongoose.model("Service", ServiceSchema);
