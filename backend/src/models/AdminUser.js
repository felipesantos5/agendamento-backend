import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const AdminUserSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email é obrigatório"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "Formato de email inválido"],
    },
    password: {
      type: String,
      minlength: [6, "Senha deve ter no mínimo 6 caracteres"],
    },
    barbershop: {
      type: Schema.Types.ObjectId,
      ref: "Barbershop",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "barber"],
      default: "barber",
      required: true,
    },
    barberProfile: {
      type: Schema.Types.ObjectId,
      ref: "Barber",
      required: function () {
        return this.role === "barber";
      },
    },

    accountSetupToken: { type: String },
    accountSetupTokenExpires: { type: Date },
    status: {
      type: String,
      enum: ["pending", "active"], // pending = esperando definir a senha
      default: "pending",
    },
  },
  { timestamps: true }
);

// Middleware para fazer o hash da senha ANTES de salvar
AdminUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

// Método para comparar senhas (para o login)
AdminUserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

adminUserSchema.index({ email: 1 });

export default mongoose.model("AdminUser", AdminUserSchema);
