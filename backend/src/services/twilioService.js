import twilio from "twilio";
import "dotenv/config";

const accountSid = "ACfbf9955ebbc98189a60eb71e3f5b007b";
const authToken = "48d997484cb70c6a082f98dbe43e1091";
// const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const twilioWhatsappNumber = "+14155238886";

// Inicialize o cliente Twilio apenas se as credenciais estiverem presentes
let client;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.warn("Credenciais do Twilio não configuradas. As mensagens de WhatsApp não serão enviadas.");
}

export async function sendWhatsAppConfirmation(customerName, customerPhone, bookingDate) {
  if (!client || !twilioWhatsappNumber) {
    console.warn("Twilio não configurado. Mensagem de confirmação não enviada.");
    return;
  }
  try {
    const formattedDate = new Date(bookingDate).toLocaleDateString("pt-BR");
    const formattedTime = new Date(bookingDate).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    const messageBody = `Olá, ${customerName}! Seu agendamento para o dia ${formattedDate} às ${formattedTime} foi confirmado com sucesso. ✅`;
    const teste = await client.messages.create({
      from: `whatsapp:${twilioWhatsappNumber}`,
      to: `whatsapp:+5548991319311`,
      body: messageBody,
    });
    console.log(`Mensagem de confirmação enviada para ${customerName}`);
  } catch (error) {
    console.error("Erro ao enviar mensagem de WhatsApp:", error);
  }
}
