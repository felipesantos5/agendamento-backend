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
  const resetUrl = `https://admin.barbeariagendamento.com.br/resetar-senha/${token}`; // URL do seu frontend

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

/**
 * Envia um e-mail de configuração de conta para novos barbeiros.
 * @param {string} to O e-mail do destinatário (novo barbeiro).
 * @param {string} token O token de configuração de conta.
 * @param {string} barberName O nome do barbeiro.
 * @param {string} barbershopName O nome da barbearia.
 */
export const sendAccountSetupEmail = async (to, token, barberName, barbershopName) => {
  const setupUrl = `${process.env.ADMIN_FRONTEND_URL}/configurar-senha/${token}`;

  const mailOptions = {
    from: '"Barbearia Agendamento" <suporte@barbeariagendamento.com.br>',
    to: to,
    subject: `Bem-vindo à ${barbershopName}! Configure sua conta`,
    text: `Olá ${barberName}! Você foi adicionado como profissional na ${barbershopName}. Acesse o link a seguir para criar sua senha e começar a usar o sistema: ${setupUrl}. Este link expira em 72 horas.`,
    html: `
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: 20px 0 30px 0;" align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td align="center" style="padding: 40px 0 30px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <img src="https://res.cloudinary.com/de1f7lccc/image/upload/v1750783948/logo-barbearia_hiymjm.png" alt="Logo da Barbearia" width="150" style="display: block;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px 40px 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color: #333333; font-size: 28px; font-weight: bold; text-align: center; padding-bottom: 10px;">
                          🎉 Bem-vindo, ${barberName}!
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 0 30px 0; color: #555555; font-size: 16px; line-height: 1.6; text-align: center;">
                          Você foi adicionado como profissional na <strong>${barbershopName}</strong>. 
                          Estamos muito felizes em tê-lo em nossa equipe!
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 20px 0; color: #555555; font-size: 16px; line-height: 1.6; text-align: center;">
                          Para começar a usar o sistema de agendamentos e gerenciar seus horários, 
                          você precisa configurar sua senha de acesso.
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${setupUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            ✨ Configurar Minha Senha
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 0 0 0; color: #888888; font-size: 14px; text-align: center; line-height: 1.5;">
                          ⏰ <strong>Importante:</strong> Este link é válido por <strong>72 horas</strong> e pode ser usado apenas uma vez.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 30px 0 0 0; border-top: 1px solid #eeeeee; margin-top: 20px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding-top: 20px;">
                                <strong>📧 Seu email de acesso:</strong> ${to}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #666666; font-size: 14px; padding-top: 10px;">
                                Após configurar sua senha, você poderá acessar o painel administrativo e visualizar seus agendamentos.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 0 0 0; color: #999999; font-size: 12px; text-align: center; font-style: italic;">
                          Se você não esperava receber este e-mail, por favor ignore-o ou entre em contato com o administrador da barbearia.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 20px 30px; background-color: #f9f9f9; border-top: 1px solid #eeeeee; border-radius: 0 0 8px 8px;">
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
    console.log(`✅ Email de configuração de conta enviado para ${to}`);
  } catch (error) {
    console.error("❌ Erro ao enviar e-mail de configuração de conta:", error);
    throw new Error("Falha ao enviar e-mail de convite. Por favor, tente novamente.");
  }
};
