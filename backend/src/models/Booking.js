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

export default mongoose.model("Booking", BookingSchema);
