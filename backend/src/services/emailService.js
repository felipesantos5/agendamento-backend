import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Envia um e-mail de redefinição de senha.
 * @param {string} to O e-mail do destinatário.
 * @param {string} token O token de redefinição.
 */
export const sendPasswordResetEmail = async (to, token) => {
  const resetUrl = `http://localhost:5173/resetar-senha/${token}`; // URL do seu frontend

  const mailOptions = {
    from: '"Nome da Sua Barbearia" <suporte@barbeariagendamento.com.br>',
    to: to,
    subject: "Redefinição de Senha",
    html: `
      <p>Você solicitou uma redefinição de senha.</p>
      <p>Clique neste <a href="${resetUrl}">link</a> para criar uma nova senha.</p>
      <p>Este link irá expirar em 1 hora.</p>
      <p>Se você não solicitou isso, por favor, ignore este e-mail.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("E-mail de redefinição de senha enviado para:", to);
  } catch (error) {
    console.error("Erro ao enviar e-mail de redefinição:", error);
    // Em produção, você pode querer lançar um erro mais específico
  }
};
