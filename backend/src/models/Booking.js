import mongoose, { Schema } from "mongoose";

const BookingSchema = new Schema(
  {
    barbershop: { type: Schema.Types.ObjectId, ref: "Barbershop" },
    barber: { type: Schema.Types.ObjectId, ref: "Barber" },
    service: { type: Schema.Types.ObjectId, ref: "Service" },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    time: Date,
    status: { type: String, default: "booked" },
    paymentStatus: { type: String, default: "pending" },
    paymentId: { type: String },
  },
  {
    timestamps: true,
  }
);

BookingSchema.index({ barber: 1, time: 1 });
BookingSchema.index({ barbershop: 1, time: -1 });

export default mongoose.model("Booking", BookingSchema);
