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
    from: '"Barbearia Agendamento" <suporte@barbeariagendamento.com.br>',
    to: to,
    subject: "Redefinição de Senha",
    text: `Você solicitou uma redefinição de senha. Copie e cole o seguinte link no seu navegador para criar uma nova senha: ${resetUrl}`,
    html: `
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: 20px 0 30px 0;" align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #f4f4f4; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td align="center" style="padding: 40px 0 30px 0; border-bottom: 1px solid #eeeeee;">
                    <img src="https://res.cloudinary.com/de1f7lccc/image/upload/v1750783948/logo-barbearia_hiymjm.png" alt="Logo da Barbearia" width="150" style="display: block;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px 40px 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color: #333333; font-size: 24px; font-weight: bold; text-align: center;">
                          Redefinição de Senha
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 0 30px 0; color: #555555; font-size: 16px; line-height: 1.5; text-align: center;">
                          Recebemos uma solicitação para redefinir a senha da sua conta. Se você não fez esta solicitação, pode ignorar este e-mail.
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="background-color: #ef4444; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            Criar Nova Senha
                          </a>
                        </td>
                      </tr>
                       <tr>
                        <td style="padding: 30px 0 0 0; color: #888888; font-size: 14px; text-align: center;">
                          O link acima irá expirar em 1 hora.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 20px 30px; background-color: #f9f9f9; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0; color: #888888; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} Barbearia Agendamento. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Erro ao enviar e-mail de redefinição:", error);
    // Em produção, você pode querer lançar um erro mais específico
  }
};
