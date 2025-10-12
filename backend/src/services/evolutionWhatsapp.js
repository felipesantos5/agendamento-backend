import "dotenv/config";
import axios from "axios";

export async function sendWhatsAppConfirmation(customerPhone, message) {
  const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
  const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
  const INSTANCE_NAME = "teste";
  // --------------------

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error(
      "ERRO DE CONFIGURAÇÃO: As variáveis de ambiente EVOLUTION_API_URL e EVOLUTION_API_KEY são necessárias."
    );
    return;
  }

  const cleanPhone = customerPhone.replace(/\D/g, "");

  const url = `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`;

  const payload = {
    number: `55${cleanPhone}`,
    linkPreview: false,
    text: message,
  };

  const headers = {
    "Content-Type": "application/json",
    apikey: EVOLUTION_API_KEY,
  };

  try {
    await axios.post(url, payload, { headers });
  } catch (error) {
    console.error("FALHA AO ENVIAR MENSAGEM WHATSAPP:");

    if (error.response.status === 400) {
      console.error("🔍 Erro 400 - Verificar:");
      console.error("- Número do telefone:", `55${cleanPhone}`);
      console.error("- Tamanho da mensagem:", message.length);
      console.error("- Instância:", INSTANCE_NAME);
    }

    if ([400, 401, 403].includes(error.response.status)) {
      return {
        success: false,
        error:
          errorData?.response?.message || errorData?.error || "Erro na API",
        status: error.response.status,
        finalAttempt: attempt,
      };
    }

    if (error.response) {
      console.error(
        "Detalhes do Erro:",
        error.response.data,
        error.response.message
      );
    } else {
      console.error("Erro de Conexão:", error.message);
    }
  }
}
