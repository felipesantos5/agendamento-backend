// src/services/whatsappInstanceService.js
import axios from "axios";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

const api = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    "Content-Type": "application/json",
    apikey: EVOLUTION_API_KEY,
  },
});

/**
 * Cria uma nova instância do WhatsApp na Evolution API
 * @param {string} barbershopId - ID da barbearia
 * @returns {Promise<{instanceName: string, status: string}>}
 */
export async function createInstance(barbershopId) {
  try {
    const instanceName = `barbershop_${barbershopId}`;

    console.log(`[WhatsApp] Criando instância: ${instanceName}`);

    const response = await api.post("/instance/create", {
      instanceName,
      token: EVOLUTION_API_KEY,
      qrcode: true,
    });

    console.log(`[WhatsApp] Instância criada com sucesso: ${instanceName}`);

    return {
      instanceName,
      status: "created",
      data: response.data,
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

    if (!response.data?.qrcode && !response.data?.base64) {
      throw new Error("QR Code não disponível");
    }

    const qrcode = response.data.qrcode || response.data.base64;

    return {
      qrcode,
      pairingCode: response.data.pairingCode || response.data.code,
    };
  } catch (error) {
    console.error("[WhatsApp] Erro ao obter QR Code:", error.response?.data || error.message);
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

    const response = await api.get(`/instance/connectionState/${instanceName}`);

    const state = response.data?.state || response.data?.instance?.state;
    let status = "disconnected";

    // Mapeia os estados da Evolution API para nosso formato
    if (state === "open") {
      status = "connected";
    } else if (state === "connecting" || state === "qr") {
      status = "connecting";
    } else {
      status = "disconnected";
    }

    // Tenta extrair o número conectado
    const connectedNumber =
      response.data?.instance?.owner ||
      response.data?.instance?.profilePictureUrl?.split("@")[0] ||
      null;

    return {
      status,
      connectedNumber,
      instance: response.data?.instance || response.data,
    };
  } catch (error) {
    console.error("[WhatsApp] Erro ao verificar status:", error.response?.data || error.message);

    // Se o erro for 404, a instância não existe
    if (error.response?.status === 404) {
      return {
        status: "disconnected",
        connectedNumber: null,
      };
    }

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
