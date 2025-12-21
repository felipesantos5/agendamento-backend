import "dotenv/config";
import axios from "axios";
import Barbershop from "../models/Barbershop.js";

export async function sendWhatsAppConfirmation(customerPhone, message, instanceName = "teste") {
  const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
  const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
  const INSTANCE_NAME = instanceName;
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

    // Verifica se o erro possui uma resposta da API
    if (error.response) {
      console.error(
        "Detalhes do Erro:",
        error.response.data,
        error.response.status
      );

      if (error.response.status === 400) {
        console.error("🔍 Erro 400 - Verificar:");
        console.error("- Número do telefone:", `55${cleanPhone}`);
        console.error("- Tamanho da mensagem:", message.length);
        console.error("- Instância:", INSTANCE_NAME);
      }

      // Corrigido: usando a variável 'error' em vez de 'errorData' e removendo 'attempt'
      if ([400, 401, 403].includes(error.response.status)) {
        return {
          success: false,
          error:
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Erro na API",
          status: error.response.status,
        };
      }
    } else {
      // Se não houver 'error.response', é um erro de conexão ou de configuração
      console.error("Erro de Conexão ou Configuração:", error.message);
    }
  }
}

/**
 * Envia mensagem WhatsApp usando a instância da barbearia (se conectada) ou fallback para "teste"
 * @param {string} barbershopId - ID da barbearia
 * @param {string} customerPhone - Telefone do cliente
 * @param {string} message - Mensagem a ser enviada
 * @returns {Promise<void>}
 */
export async function sendWhatsAppForBarbershop(barbershopId, customerPhone, message) {
  try {
    const barbershop = await Barbershop.findById(barbershopId);

    // Verifica se a barbearia tem WhatsApp próprio conectado
    const hasOwnWhatsApp =
      barbershop?.whatsappConfig?.enabled &&
      barbershop?.whatsappConfig?.connectionStatus === "connected" &&
      barbershop?.whatsappConfig?.instanceName;

    const instanceName = hasOwnWhatsApp ? barbershop.whatsappConfig.instanceName : "teste";

    if (hasOwnWhatsApp) {
      console.log(`[WhatsApp] Enviando via instância própria: ${instanceName}`);
    } else {
      console.log(`[WhatsApp] Enviando via instância padrão: teste (barbearia sem WhatsApp conectado)`);
    }

    return sendWhatsAppConfirmation(customerPhone, message, instanceName);
  } catch (error) {
    console.error("[WhatsApp] Erro ao buscar configuração da barbearia, usando instância padrão:", error.message);
    // Em caso de erro, usa instância padrão como fallback
    return sendWhatsAppConfirmation(customerPhone, message, "teste");
  }
}
