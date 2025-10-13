// backend/src/services/whatsappService.js

import axios from "axios";
import "dotenv/config";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const accessToken = process.env.META_WA_ACCESS_TOKEN;
const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
const apiVersion = "v19.0"; // Default para v19.0

const apiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

const isConfigured = accessToken && phoneNumberId;

if (!isConfigured) {
  console.warn(
    "‼️  Credenciais da API Cloud do WhatsApp não configuradas. As mensagens não serão enviadas."
  );
}

/**
 * Envia uma mensagem de confirmação de agendamento via API Cloud do WhatsApp.
 * @param {object} booking - O objeto completo do agendamento, populado com detalhes.
 */
export async function sendWhatsAppConfirmation(booking) {
  if (!isConfigured) {
    return;
  }

  try {
    const { customer, time, service, barber, barbershop } = booking;

    // Formata o número do cliente para o padrão E.164 SEM o "+"
    const customerPhone = `55${customer.phone.replace(/\D/g, "")}`;
    const formattedDate = format(new Date(time), "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    });
    const formattedTime = format(new Date(time), "HH:mm");

    const templateName = "confirmacao_agendamento"; // O nome EXATO do seu modelo aprovado

    const data = {
      messaging_product: "whatsapp",
      to: customerPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "pt_BR",
        },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: customer.name }, // {{1}}
              { type: "text", text: barbershop.name }, // {{2}}
              { type: "text", text: service.name }, // {{3}}
              { type: "text", text: barber.name }, // {{4}}
              { type: "text", text: formattedDate }, // {{5}}
              { type: "text", text: formattedTime }, // {{6}}
            ],
          },
        ],
      },
    };

    await axios.post(apiUrl, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(
      `❌ Erro ao enviar mensagem de WhatsApp para ${booking.customer?.name}:`
    );
    // A API da Meta retorna erros detalhados no response.data
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}
