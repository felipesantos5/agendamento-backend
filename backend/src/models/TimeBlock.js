import mongoose from "mongoose";

const timeBlockSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      // required: [true, "O motivo do bloqueio é obrigatório."],
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    barber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barber",
      required: true,
    },
    barbershop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barbershop",
      required: true,
    },
  },
  { timestamps: true }
);

const TimeBlock = mongoose.model("TimeBlock", timeBlockSchema);

export default TimeBlock;
