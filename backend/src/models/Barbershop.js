// src/models/Barbershop.ts
import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema({
  cep: { type: String, required: true },
  estado: { type: String, required: true },
  cidade: { type: String, required: true },
  bairro: { type: String, required: true },
  rua: { type: String, required: true },
  numero: { type: String, required: true },
  complemento: { type: String },
});

const BarbershopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    address: { type: AddressSchema, required: true },
    logoUrl: { type: String },
    contact: { type: String, required: true },
    workingHours: [
      {
        day: { type: String, required: true },
        start: { type: String, required: true },
        end: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Barbershop", BarbershopSchema);
