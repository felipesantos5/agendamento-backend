import mongoose, { Schema } from "mongoose";

const ServiceSchema = new Schema({
  name: String,
  price: Number,
  duration: Number, // minutos
  barbershop: { type: Schema.Types.ObjectId, ref: "Barbershop", required: true },
});

serviceSchema.index({ barbershop: 1 });

export default mongoose.model("Service", ServiceSchema);
