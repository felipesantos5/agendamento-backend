// src/routes/whatsappRoutes.js
import express from "express";
import {protectAdmin} from "../middleware/authAdminMiddleware.js";
import {
  createInstance,
  getQRCode,
  getConnectionStatus,
  disconnectInstance,
  deleteInstance,
} from "../services/whatsappInstanceService.js";
import Barbershop from "../models/Barbershop.js";

const router = express.Router();

/**
 * POST /api/barbershops/:id/whatsapp/connect
 * Conecta o WhatsApp da barbearia (cria instância e retorna QR code)
 */
router.post("/:id/whatsapp/connect", protectAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Busca a barbearia
    const barbershop = await Barbershop.findById(id);
    if (!barbershop) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }

    // Verifica se já tem uma instância conectada
    if (
      barbershop.whatsappConfig?.connectionStatus === "connected" &&
      barbershop.whatsappConfig?.instanceName
    ) {
      return res.status(400).json({
        error: "WhatsApp já está conectado. Desconecte primeiro para reconectar.",
      });
    }

    // Se já existe uma instância mas não conectada, deleta ela primeiro
    if (barbershop.whatsappConfig?.instanceName) {
      try {
        await deleteInstance(barbershop.whatsappConfig.instanceName);
      } catch (err) {
        console.log("[WhatsApp] Erro ao deletar instância anterior (ignorando):", err.message);
      }
    }

    // Cria nova instância (já retorna o QR code)
    const { instanceName, qrcode, pairingCode } = await createInstance(id);

    // Atualiza o banco de dados
    barbershop.whatsappConfig = {
      enabled: true,
      instanceName,
      connectionStatus: "connecting",
      connectedNumber: null,
      connectedAt: null,
      lastCheckedAt: new Date(),
    };

    await barbershop.save();

    res.json({
      qrcode,
      pairingCode,
      instanceName,
      message: "QR Code gerado. Escaneie com seu WhatsApp para conectar.",
    });
  } catch (error) {
    console.error("[WhatsApp] Erro ao conectar:", error);
    res.status(500).json({
      error: "Erro ao conectar WhatsApp",
      message: error.message,
    });
  }
});

/**
 * GET /api/barbershops/:id/whatsapp/status
 * Verifica o status da conexão do WhatsApp
 */
router.get("/:id/whatsapp/status", protectAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const barbershop = await Barbershop.findById(id);
    if (!barbershop) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }

    // Se não tem instanceName, retorna desconectado
    if (!barbershop.whatsappConfig?.instanceName) {
      return res.json({
        status: "disconnected",
        enabled: false,
        connectedNumber: null,
        instanceName: null,
      });
    }

    // Verifica o status na Evolution API
    const { status, connectedNumber } = await getConnectionStatus(
      barbershop.whatsappConfig.instanceName
    );

    // Atualiza o banco de dados
    barbershop.whatsappConfig.connectionStatus = status;
    barbershop.whatsappConfig.lastCheckedAt = new Date();

    if (status === "connected" && connectedNumber) {
      barbershop.whatsappConfig.connectedNumber = connectedNumber;
      if (!barbershop.whatsappConfig.connectedAt) {
        barbershop.whatsappConfig.connectedAt = new Date();
      }
    }

    await barbershop.save();

    res.json({
      status,
      enabled: barbershop.whatsappConfig.enabled,
      connectedNumber: barbershop.whatsappConfig.connectedNumber,
      instanceName: barbershop.whatsappConfig.instanceName,
      connectedAt: barbershop.whatsappConfig.connectedAt,
      lastCheckedAt: barbershop.whatsappConfig.lastCheckedAt,
    });
  } catch (error) {
    console.error("[WhatsApp] Erro ao verificar status:", error);
    res.status(500).json({
      error: "Erro ao verificar status",
      message: error.message,
    });
  }
});

/**
 * GET /api/barbershops/:id/whatsapp/qrcode
 * Obtém um novo QR Code (útil se o anterior expirou)
 */
router.get("/:id/whatsapp/qrcode", protectAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const barbershop = await Barbershop.findById(id);
    if (!barbershop) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }

    if (!barbershop.whatsappConfig?.instanceName) {
      return res.status(400).json({
        error: "Nenhuma instância criada. Use o endpoint /connect primeiro.",
      });
    }

    // Obtém novo QR Code
    const { qrcode, pairingCode } = await getQRCode(barbershop.whatsappConfig.instanceName);

    res.json({
      qrcode,
      pairingCode,
      instanceName: barbershop.whatsappConfig.instanceName,
    });
  } catch (error) {
    console.error("[WhatsApp] Erro ao obter QR Code:", error);
    res.status(500).json({
      error: "Erro ao obter QR Code",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/barbershops/:id/whatsapp/disconnect
 * Desconecta e deleta a instância do WhatsApp
 */
router.delete("/:id/whatsapp/disconnect", protectAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const barbershop = await Barbershop.findById(id);
    if (!barbershop) {
      return res.status(404).json({ error: "Barbearia não encontrada" });
    }

    if (!barbershop.whatsappConfig?.instanceName) {
      return res.status(400).json({
        error: "Nenhuma instância conectada.",
      });
    }

    const instanceName = barbershop.whatsappConfig.instanceName;

    // Desconecta a instância
    try {
      await disconnectInstance(instanceName);
    } catch (err) {
      console.log("[WhatsApp] Erro ao desconectar (ignorando):", err.message);
    }

    // Deleta a instância
    try {
      await deleteInstance(instanceName);
    } catch (err) {
      console.log("[WhatsApp] Erro ao deletar (ignorando):", err.message);
    }

    // Limpa os dados no banco
    barbershop.whatsappConfig = {
      enabled: false,
      instanceName: null,
      connectionStatus: "disconnected",
      connectedNumber: null,
      connectedAt: null,
      lastCheckedAt: new Date(),
    };

    await barbershop.save();

    res.json({
      message: "WhatsApp desconectado com sucesso",
    });
  } catch (error) {
    console.error("[WhatsApp] Erro ao desconectar:", error);
    res.status(500).json({
      error: "Erro ao desconectar WhatsApp",
      message: error.message,
    });
  }
});

export default router;
