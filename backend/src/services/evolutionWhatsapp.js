import "dotenv/config";
import axios from "axios";
import { formatBookingTime } from "../utils/formatBookingTime.js";

export async function sendWhatsAppConfirmation(customerName, customerPhone, bookingTime) {
  // ---- CONFIGURAÇÃO ----
  // É ALTAMENTE RECOMENDADO usar variáveis de ambiente para não expor suas chaves!
  const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL; // Ex: 'http://localhost:8080'
  const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY; // Sua chave da API
  const INSTANCE_NAME = "barbeariAgendamentoMensagens";
  // --------------------

  // Verifica se as configurações essenciais foram definidas
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error("ERRO DE CONFIGURAÇÃO: As variáveis de ambiente EVOLUTION_API_URL e EVOLUTION_API_KEY são necessárias.");
    return; // Interrompe a execução se a API não estiver configurada
  }

  // Formata a data e cria a mensagem personalizada
  const formattedTime = formatBookingTime(new Date(bookingTime));
  const message = `Olá, ${customerName}! ✅\n\nSeu agendamento na barbearia foi confirmado com sucesso para o dia ${formattedTime}.\n\nMal podemos esperar para te ver!`;

  const url = `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`;

  const payload = {
    number: customerPhone,
    options: {
      delay: 1200, // Um pequeno atraso para parecer mais humano
      presence: "composing",
    },
    text: message,
  };

  const headers = {
    "Content-Type": "application/json",
    apikey: EVOLUTION_API_KEY,
  };

  try {
    console.log(`Enviando confirmação via WhatsApp para o número: ${customerPhone}`);
    const response = await axios.post(url, payload, { headers });
    console.log("Mensagem de confirmação enviada com sucesso! ID:", response.data.key.id);
  } catch (error) {
    // Apenas registra o erro no console, mas não quebra a requisição principal do agendamento
    console.error("FALHA AO ENVIAR MENSAGEM WHATSAPP:");
    if (error.response) {
      // O erro veio da API (ex: número inválido, API Key errada)
      console.error("Detalhes do Erro:", error.response.data);
    } else {
      // O erro foi na conexão (ex: API offline, URL errada)
      console.error("Erro de Conexão:", error.message);
    }
  }
}
