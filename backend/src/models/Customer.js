import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "O nome do cliente é obrigatório."],
      trim: true,
    },
    imageUrl: {
      type: String,
    },
    phone: {
      type: String,
      required: [true, "O telefone do cliente é obrigatório."],
      unique: true, // Garante que não haverá dois clientes com o mesmo telefone
      trim: true,
    },
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking", // Array de referências para os agendamentos deste cliente
      },
    ],
    otpCode: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adiciona campos createdAt e updatedAt automaticamente
  }
);

customerSchema.methods.getOtp = function () {
  // Gera um código de 6 dígitos
  const otp = Math.floor(1000 + Math.random() * 900000).toString();

  // Define a validade do código para 10 minutos a partir de agora
  this.otpExpires = Date.now() + 10 * 60 * 1000;

  // Hasheia o código antes de salvar no banco de dados
  this.otpCode = bcrypt.hashSync(otp, 10);

  // Retorna o código NÃO hasheado para ser enviado ao usuário
  return otp;
};

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
