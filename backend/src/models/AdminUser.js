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
      required: [true, "Senha é obrigatória"],
      minlength: [6, "Senha deve ter no mínimo 6 caracteres"],
    },
    barbershop: {
      // A barbearia que este usuário admin gerencia
      type: Schema.Types.ObjectId,
      ref: "Barbershop",
      required: true,
    },
    // Você pode adicionar outros campos como nome, role, etc.
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

export default mongoose.model("AdminUser", AdminUserSchema);
