// // src/services/twilioService.js
// import twilio from "twilio";
// import "dotenv/config";

// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// // Inicialize o cliente Twilio apenas se as credenciais estiverem presentes
// let client;
// if (accountSid && authToken) {
//   client = twilio(accountSid, authToken);
// } else {
//   console.warn(
//     "Credenciais do Twilio não configuradas. As mensagens de WhatsApp não serão enviadas."
//   );
// }

// export async function sendWhatsAppConfirmation(
//   customerName,
//   customerPhone,
//   bookingDate
// ) {
//   if (!client || !twilioWhatsappNumber) {
//     console.warn(
//       "Twilio não configurado. Mensagem de confirmação não enviada."
//     );
//     return;
//   }
//   try {
//     const formattedDate = new Date(bookingDate).toLocaleDateString("pt-BR");
//     const formattedTime = new Date(bookingDate).toLocaleTimeString("pt-BR", {
//       hour: "2-digit",
//       minute: "2-digit",
//       timeZone: "America/Sao_Paulo",
//     });
//     const messageBody = `Olá, ${customerName}! Seu agendamento para o dia ${formattedDate} às ${formattedTime} foi confirmado com sucesso. ✅`;
//     await client.messages.create({
//       from: `whatsapp:${twilioWhatsappNumber}`,
//       to: `whatsapp:+55${customerPhone}`,
//       body: messageBody,
//     });
//     console.log(`Mensagem de confirmação enviada para ${customerName}`);
//   } catch (error) {
//     console.error("Erro ao enviar mensagem de WhatsApp:", error);
//   }
// }
