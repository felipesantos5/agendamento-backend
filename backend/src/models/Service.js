import mongoose, { Schema } from "mongoose";

const ServiceSchema = new Schema({
  name: String,
  price: Number,
  duration: Number,
  barbershop: { type: Schema.Types.ObjectId, ref: "Barbershop", required: true },
  isPlanService: {
    type: Boolean,
    default: false,
  },
  plan: {
    type: Schema.Types.ObjectId,
    ref: "Plan",
    required: function () {
      // O campo 'plan' só é obrigatório se 'isPlanService' for true
      return this.isPlanService;
    },
  },
});

ServiceSchema.index({ barbershop: 1 });

export default mongoose.model("Service", ServiceSchema);
