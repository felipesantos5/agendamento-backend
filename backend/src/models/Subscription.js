import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    barbershop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barbershop",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "canceled"],
      default: "active",
    },
    creditsRemaining: {
      type: Number,
      required: true,
    },
    barber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barber",
      required: false,
    },
    // Campos para integração com Mercado Pago
    mercadoPagoPreapprovalId: {
      type: String,
      index: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    lastPaymentDate: {
      type: Date,
    },
    nextPaymentDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
