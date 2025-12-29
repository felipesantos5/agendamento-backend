// src/services/whatsappInstanceService.js
import axios from "axios";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BACKEND_URL = process.env.BACKEND_URL || "https://api.barbeariagendamento.com.br";

const api = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    "Content-Type": "application/json",
    apikey: EVOLUTION_API_KEY,
  },
});

/**
 * Formata o QR code base64 para exibição
 * @param {string} base64 - String base64 do QR code
 * @returns {string} - Base64 formatado com prefixo data:image
 */
function formatQRCodeBase64(base64) {
  if (!base64) return null;

  // Se já tem o prefixo data:image, retorna como está
  if (base64.startsWith("data:image")) {
    return base64;
  }

  // Adiciona o prefixo para imagem PNG
  return `data:image/png;base64,${base64}`;
}

/**
 * Cria uma nova instância do WhatsApp na Evolution API
 * @param {string} barbershopId - ID da barbearia
 * @returns {Promise<{instanceName: string, status: string}>}
 */
export async function createInstance(barbershopId) {
  try {
    const instanceName = `barbershop_${barbershopId}`;

    console.log(`[WhatsApp] Criando instância: ${instanceName}`);
    console.log(`[WhatsApp] URL da API: ${EVOLUTION_API_URL}`);

    // Primeiro, tenta deletar a instância se já existir
    try {
      await api.delete(`/instance/delete/${instanceName}`);
      console.log(`[WhatsApp] Instância anterior deletada: ${instanceName}`);
      // Aguarda um pouco para garantir que foi deletada
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (deleteError) {
      // Ignora erro se a instância não existir
      console.log(`[WhatsApp] Nenhuma instância anterior para deletar`);
    }

    // URL do webhook para receber eventos da instância
    const webhookUrl = `${BACKEND_URL}/api/whatsapp/webhook/${instanceName}`;
    console.log(`[WhatsApp] Webhook URL: ${webhookUrl}`);

    // Cria a nova instância com configuração de webhook
    const createResponse = await api.post("/instance/create", {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      rejectCall: false,
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
      // Configuração de webhook para receber eventos em tempo real
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: true,
        headers: {
          "x-api-key": EVOLUTION_API_KEY,
        },
        events: [
          "CONNECTION_UPDATE",
          "QRCODE_UPDATED",
          "MESSAGES_UPSERT",
        ],
      },
    });

    console.log(`[WhatsApp] Resposta da criação:`, JSON.stringify(createResponse.data, null, 2));

    // Verifica se o QR code veio na resposta de criação
    let qrcode = null;
    let pairingCode = null;

    if (createResponse.data?.qrcode) {
      const qrcodeData = createResponse.data.qrcode;
      qrcode = formatQRCodeBase64(qrcodeData.base64 || qrcodeData);
      pairingCode = qrcodeData.pairingCode || qrcodeData.code || null;
    }

    // Se não veio QR code na criação, busca via endpoint connect
    if (!qrcode) {
      console.log(`[WhatsApp] QR code não veio na criação, buscando via connect...`);

      // Aguarda um pouco antes de conectar
      await new Promise(resolve => setTimeout(resolve, 2000));

      const connectResult = await getQRCode(instanceName);
      qrcode = connectResult.qrcode;
      pairingCode = connectResult.pairingCode;
    }

    console.log(`[WhatsApp] Instância criada com sucesso: ${instanceName}`);
    console.log(`[WhatsApp] QR code obtido: ${qrcode ? "SIM" : "NÃO"}`);

    return {
      instanceName,
      instanceId: createResponse.data?.instance?.instanceId,
      status: createResponse.data?.instance?.status || "created",
      qrcode,
      pairingCode,
      data: createResponse.data,
    };
  } catch (error) {
    console.error("[WhatsApp] Erro ao criar instância:", error.response?.data || error.message);
    throw new Error(`Falha ao criar instância: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Obtém o QR Code para conectar o WhatsApp
 * @param {string} instanceName - Nome da instância
 * @returns {Promise<{qrcode: string, pairingCode?: string}>}
 */
export async function getQRCode(instanceName) {
  try {
    console.log(`[WhatsApp] Obtendo QR Code para: ${instanceName}`);

    const response = await api.get(`/instance/connect/${instanceName}`);

    console.log(`[WhatsApp] Resposta do connect:`, JSON.stringify(response.data, null, 2));

    // Na Evolution API v2, o QR code pode vir em diferentes formatos:
    // 1. { base64: "...", code: "...", pairingCode: "..." }
    // 2. { qrcode: { base64: "...", code: "..." } }
    const data = response.data;

    let base64 = null;
    let pairingCode = null;

    // Tenta extrair de diferentes estruturas possíveis
    if (data?.base64) {
      base64 = data.base64;
      pairingCode = data.pairingCode || data.code;
    } else if (data?.qrcode?.base64) {
      base64 = data.qrcode.base64;
      pairingCode = data.qrcode.pairingCode || data.qrcode.code;
    } else if (typeof data === "string") {
      base64 = data;
    }

    if (!base64) {
      console.error("[WhatsApp] QR Code não encontrado na resposta:", data);
      throw new Error("QR Code não disponível na resposta da API");
    }

    const qrcode = formatQRCodeBase64(base64);

    console.log(`[WhatsApp] QR Code extraído com sucesso`);

    return {
      qrcode,
      pairingCode,
    };
  } catch (error) {
    console.error("[WhatsApp] Erro ao obter QR Code:", error.response?.data || error.message);

    // Se a instância não está em estado de espera de QR, pode ser que já esteja conectada
    if (error.response?.status === 400 || error.response?.status === 404) {
      throw new Error("Instância não está aguardando QR Code. Verifique o status da conexão.");
    }

    throw new Error(`Falha ao obter QR Code: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Verifica o status da conexão da instância
 * @param {string} instanceName - Nome da instância
 * @returns {Promise<{status: string, connectedNumber?: string, instance?: object}>}
 */
export async function getConnectionStatus(instanceName) {
  try {
    console.log(`[WhatsApp] Verificando status da instância: ${instanceName}`);

    // Tenta primeiro o endpoint fetchInstances que retorna informações mais completas
    let data = null;
    let state = null;
    let connectedNumber = null;

    try {
      const fetchResponse = await api.get(`/instance/fetchInstances`, {
        params: { instanceName },
      });
      console.log(`[WhatsApp] Resposta fetchInstances:`, JSON.stringify(fetchResponse.data, null, 2));

      // fetchInstances retorna um array, pegamos a instância correspondente
      const instances = Array.isArray(fetchResponse.data) ? fetchResponse.data : [fetchResponse.data];
      const instance = instances.find((i) => i.name === instanceName || i.instanceName === instanceName) || instances[0];

      if (instance) {
        state = instance.connectionStatus || instance.state || instance.status;
        connectedNumber = instance.ownerJid || instance.owner || instance.number;
        data = instance;
      }
    } catch (fetchError) {
      console.log(`[WhatsApp] fetchInstances falhou, tentando connectionState...`);
    }

    // Se não conseguiu com fetchInstances, tenta connectionState
    if (!state) {
      const response = await api.get(`/instance/connectionState/${instanceName}`);
      console.log(`[WhatsApp] Resposta connectionState:`, JSON.stringify(response.data, null, 2));

      data = response.data;
      state = data?.state || data?.instance?.state || data?.connectionState;
      connectedNumber = data?.instance?.owner || data?.instance?.wuid || data?.owner || data?.wuid;
    }

    let status = "disconnected";

    // Mapeia os estados da Evolution API para nosso formato
    // Estados possíveis: open, close, connecting, qr, connected
    if (state === "open" || state === "connected") {
      status = "connected";
    } else if (state === "connecting" || state === "qr") {
      status = "connecting";
    } else if (state === "close" || state === "disconnected") {
      status = "disconnected";
    }

    // Remove o sufixo @s.whatsapp.net se existir
    if (connectedNumber && connectedNumber.includes("@")) {
      connectedNumber = connectedNumber.split("@")[0];
    }

    console.log(`[WhatsApp] Status mapeado: ${status}, Número: ${connectedNumber}`);

    return {
      status,
      connectedNumber,
      instance: data,
    };
  } catch (error) {
    // Se o erro for 404, a instância não existe - apenas loga em nível de info
    if (error.response?.status === 404) {
      console.log(`[WhatsApp] Instância ${instanceName} não existe (404)`);
      return {
        status: "disconnected",
        connectedNumber: null,
      };
    }

    // Para outros erros, loga como erro
    console.error("[WhatsApp] Erro ao verificar status:", {
      status: error.response?.status,
      error: error.response?.data?.error || error.message,
      response: error.response?.data
    });

    throw new Error(`Falha ao verificar status: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Desconecta a instância do WhatsApp (logout)
 * @param {string} instanceName - Nome da instância
 * @returns {Promise<{message: string}>}
 */
export async function disconnectInstance(instanceName) {
  try {
    console.log(`[WhatsApp] Desconectando instância: ${instanceName}`);

    await api.delete(`/instance/logout/${instanceName}`);

    console.log(`[WhatsApp] Instância desconectada: ${instanceName}`);

    return {
      message: "Desconectado com sucesso",
    };
  } catch (error) {
    console.error("[WhatsApp] Erro ao desconectar:", error.response?.data || error.message);

    // Não lançar erro se a instância já estiver desconectada
    if (error.response?.status === 404 || error.response?.status === 400) {
      return {
        message: "Instância já estava desconectada",
      };
    }

    throw new Error(`Falha ao desconectar: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Configura ou atualiza o webhook de uma instância existente
 * @param {string} instanceName - Nome da instância
 * @returns {Promise<{message: string}>}
 */
export async function setWebhook(instanceName) {
  try {
    const webhookUrl = `${BACKEND_URL}/api/whatsapp/webhook/${instanceName}`;
    console.log(`[WhatsApp] Configurando webhook para: ${instanceName}`);
    console.log(`[WhatsApp] Webhook URL: ${webhookUrl}`);

    const response = await api.post(`/webhook/set/${instanceName}`, {
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      webhookBase64: true,
      events: [
        "CONNECTION_UPDATE",
        "QRCODE_UPDATED",
        "MESSAGES_UPSERT",
      ],
    });

    console.log(`[WhatsApp] Webhook configurado:`, JSON.stringify(response.data, null, 2));

    return {
      message: "Webhook configurado com sucesso",
      data: response.data,
    };
  } catch (error) {
    console.error("[WhatsApp] Erro ao configurar webhook:", error.response?.data || error.message);
    throw new Error(`Falha ao configurar webhook: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Reinicia uma instância (útil para reconexão)
 * @param {string} instanceName - Nome da instância
 * @returns {Promise<{message: string}>}
 */
export async function restartInstance(instanceName) {
  try {
    console.log(`[WhatsApp] Reiniciando instância: ${instanceName}`);

    const response = await api.post(`/instance/restart/${instanceName}`);

    console.log(`[WhatsApp] Instância reiniciada:`, JSON.stringify(response.data, null, 2));

    return {
      message: "Instância reiniciada com sucesso",
      data: response.data,
    };
  } catch (error) {
    console.error("[WhatsApp] Erro ao reiniciar instância:", error.response?.data || error.message);

    // Se erro 404, a instância não existe
    if (error.response?.status === 404) {
      throw new Error("Instância não encontrada");
    }

    throw new Error(`Falha ao reiniciar: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Deleta completamente a instância
 * @param {string} instanceName - Nome da instância
 * @returns {Promise<{message: string}>}
 */
export async function deleteInstance(instanceName) {
  try {
    console.log(`[WhatsApp] Deletando instância: ${instanceName}`);

    await api.delete(`/instance/delete/${instanceName}`);

    console.log(`[WhatsApp] Instância deletada: ${instanceName}`);

    return {
      message: "Instância deletada com sucesso",
    };
  } catch (error) {
    console.error("[WhatsApp] Erro ao deletar instância:", error.response?.data || error.message);

    // Não lançar erro se a instância não existir
    if (error.response?.status === 404) {
      return {
        message: "Instância não encontrada (já deletada)",
      };
    }

    throw new Error(`Falha ao deletar instância: ${error.response?.data?.message || error.message}`);
  }
}
