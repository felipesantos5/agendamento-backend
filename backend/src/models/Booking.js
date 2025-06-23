import mongoose, { Schema } from "mongoose";

const BookingSchema = new Schema({
  barbershop: { type: Schema.Types.ObjectId, ref: "Barbershop" },
  barber: { type: Schema.Types.ObjectId, ref: "Barber" },
  service: { type: Schema.Types.ObjectId, ref: "Service" },
  customer: {
    name: String,
    phone: String,
  },
  time: Date,
  status: { type: String, default: "booked" },
});

bookingSchema.index({ barber: 1, time: 1 });
bookingSchema.index({ barbershop: 1, time: -1 });

export default mongoose.model("Booking", BookingSchema);
