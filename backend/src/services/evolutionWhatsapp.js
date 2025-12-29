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
    return {
      success: false,
      error: "Variáveis de ambiente não configuradas"
    };
  }

  // Valida se a URL está bem formada
  try {
    new URL(EVOLUTION_API_URL);
  } catch (urlError) {
    console.error("ERRO DE CONFIGURAÇÃO: EVOLUTION_API_URL inválida:", EVOLUTION_API_URL);
    return {
      success: false,
      error: "URL da Evolution API inválida"
    };
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
    // Aumenta timeout para 30 segundos e adiciona retry
    const response = await axios.post(url, payload, {
      headers,
      timeout: 30000, // 30 segundos
      validateStatus: (status) => status < 500, // Não joga exceção para erros 4xx
    });

    // Se retornou erro 4xx
    if (response.status >= 400) {
      console.error(`[WhatsApp] Erro ${response.status} ao enviar mensagem:`, response.data);
      return {
        success: false,
        error: response.data?.message || response.data?.error || "Erro na API",
        status: response.status,
      };
    }

    console.log(`[WhatsApp] Mensagem enviada com sucesso via instância: ${INSTANCE_NAME}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error("FALHA AO ENVIAR MENSAGEM WHATSAPP:");

    // Verifica se o erro possui uma resposta da API
    if (error.response) {
      console.error(
        "Detalhes do Erro:",
        {
          status: error.response.status,
          error: error.response.data?.error || error.response.statusText,
          response: error.response.data
        }
      );

      if (error.response.status === 400) {
        console.error("🔍 Erro 400 - Verificar:");
        console.error("- Número do telefone:", `55${cleanPhone}`);
        console.error("- Tamanho da mensagem:", message.length);
        console.error("- Instância:", INSTANCE_NAME);
      }

      // Retorna erro para tratamento no nível superior
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.response?.statusText ||
          "Erro na API",
        status: error.response.status,
      };
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      // Erro de timeout
      console.error("⏱️ Timeout ao enviar mensagem. A Evolution API demorou mais de 30 segundos para responder.");
      console.error("- Instância:", INSTANCE_NAME);
      console.error("- URL:", url);
      return {
        success: false,
        error: "Timeout ao enviar mensagem (Evolution API não respondeu em 30s)",
        status: 408, // Request Timeout
        isTimeout: true,
      };
    } else {
      // Se não houver 'error.response', é um erro de conexão ou de configuração
      console.error("Erro de Conexão ou Configuração:", error.message);
      console.error("Código do erro:", error.code);
      return {
        success: false,
        error: error.message,
        status: 0,
      };
    }
  }
}

/**
 * Envia mensagem WhatsApp usando a instância da barbearia (se conectada) ou fallback para "teste"
 * @param {string} barbershopId - ID da barbearia
 * @param {string} customerPhone - Telefone do cliente
 * @param {string} message - Mensagem a ser enviada
 * @returns {Promise<{success: boolean, error?: string, usedFallback?: boolean}>}
 */
export async function sendWhatsAppForBarbershop(barbershopId, customerPhone, message) {
  try {
    const barbershop = await Barbershop.findById(barbershopId);

    // Verifica se a barbearia tem WhatsApp próprio conectado
    const hasOwnWhatsApp =
      barbershop?.whatsappConfig?.enabled &&
      barbershop?.whatsappConfig?.connectionStatus === "connected" &&
      barbershop?.whatsappConfig?.instanceName;

    let instanceName = hasOwnWhatsApp ? barbershop.whatsappConfig.instanceName : "teste";
    let result;

    if (hasOwnWhatsApp) {
      console.log(`[WhatsApp] Tentando enviar via instância própria: ${instanceName}`);
      result = await sendWhatsAppConfirmation(customerPhone, message, instanceName);

      // Se falhou por instância não existir (404), erro de conexão (0) ou timeout (408), faz fallback
      if (!result.success && (result.status === 404 || result.status === 0 || result.status === 408 || result.isTimeout)) {
        console.log(`[WhatsApp] Instância própria falhou (${result.error}), usando fallback para instância padrão`);

        // Atualiza status da barbearia para disconnected
        if (barbershop && barbershop.whatsappConfig) {
          barbershop.whatsappConfig.connectionStatus = "disconnected";
          await barbershop.save();
        }

        // Tenta com instância padrão
        result = await sendWhatsAppConfirmation(customerPhone, message, "teste");
        if (result.success) {
          result.usedFallback = true;
        }
      }
    } else {
      console.log(`[WhatsApp] Enviando via instância padrão: teste (barbearia sem WhatsApp conectado)`);
      result = await sendWhatsAppConfirmation(customerPhone, message, "teste");
    }

    return result;
  } catch (error) {
    console.error("[WhatsApp] Erro ao buscar configuração da barbearia, usando instância padrão:", error.message);
    // Em caso de erro, usa instância padrão como fallback
    const result = await sendWhatsAppConfirmation(customerPhone, message, "teste");
    if (result.success) {
      result.usedFallback = true;
    }
    return result;
  }
}
