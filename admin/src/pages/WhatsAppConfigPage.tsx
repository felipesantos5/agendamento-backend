import { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, MessageSquare, X, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { AdminOutletContext } from "@/types/AdminOutletContext";

interface WhatsAppStatus {
  status: "disconnected" | "connecting" | "connected";
  enabled: boolean;
  connectedNumber: string | null;
  instanceName: string | null;
  connectedAt?: string;
  lastCheckedAt?: string;
}

export const WhatsAppConfigPage = () => {
  const { barbershopId } = useOutletContext<AdminOutletContext>();
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);
  const MAX_POLLING_TIME = 120000; // 2 minutos

  // Busca o status inicial
  const fetchWhatsAppStatus = async () => {
    try {
      const response = await apiClient.get(`/api/barbershops/${barbershopId}/whatsapp/status`);
      setWhatsappStatus(response.data);
    } catch (error: any) {
      console.error("Erro ao buscar status do WhatsApp:", error);
      toast.error(error.response?.data?.error || "Erro ao buscar status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (barbershopId) {
      fetchWhatsAppStatus();
    }
  }, [barbershopId]);

  // Polling de status (usado após conectar)
  const startPolling = () => {
    pollingStartTimeRef.current = Date.now();

    pollingIntervalRef.current = setInterval(async () => {
      const elapsedTime = Date.now() - pollingStartTimeRef.current;

      // Timeout após 2 minutos
      if (elapsedTime >= MAX_POLLING_TIME) {
        stopPolling();
        setShowQRModal(false);
        toast.error("Tempo esgotado. Tente conectar novamente.");
        return;
      }

      try {
        const response = await apiClient.get(`/api/barbershops/${barbershopId}/whatsapp/status`);
        const status = response.data;

        setWhatsappStatus(status);

        // Se conectou, para o polling e fecha o modal
        if (status.status === "connected") {
          stopPolling();
          setShowQRModal(false);
          toast.success(`WhatsApp conectado com sucesso! Número: ${status.connectedNumber}`);
        }
      } catch (error) {
        console.error("Erro ao verificar status:", error);
      }
    }, 3000); // Verifica a cada 3 segundos
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Limpa o polling quando o componente desmonta
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      // Chama o endpoint para criar instância e obter QR code
      const response = await apiClient.post(`/api/barbershops/${barbershopId}/whatsapp/connect`);

      setQrCode(response.data.qrcode);
      setShowQRModal(true);

      toast.success("QR Code gerado! Escaneie com seu WhatsApp.");

      // Inicia o polling para verificar quando conectar
      startPolling();
    } catch (error: any) {
      console.error("Erro ao conectar WhatsApp:", error);
      toast.error(error.response?.data?.error || "Erro ao conectar WhatsApp");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);

    try {
      await apiClient.delete(`/api/barbershops/${barbershopId}/whatsapp/disconnect`);

      toast.success("WhatsApp desconectado com sucesso!");

      // Atualiza o status
      await fetchWhatsAppStatus();
    } catch (error: any) {
      console.error("Erro ao desconectar:", error);
      toast.error(error.response?.data?.error || "Erro ao desconectar");
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectDialog(false);
    }
  };

  const handleCloseQRModal = () => {
    stopPolling();
    setShowQRModal(false);
    setQrCode(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Configurações de WhatsApp</CardTitle>
          <CardDescription>
            Conecte seu WhatsApp para enviar mensagens automáticas aos seus clientes através do seu próprio número.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Atual */}
          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/50">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Status da Conexão</Label>
              <div className="flex items-center gap-2">
                {whatsappStatus?.status === "connected" && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      Conectado
                    </Badge>
                  </>
                )}
                {whatsappStatus?.status === "connecting" && (
                  <>
                    <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />
                    <Badge variant="default" className="bg-yellow-600 hover:bg-yellow-700">
                      Conectando...
                    </Badge>
                  </>
                )}
                {whatsappStatus?.status === "disconnected" && (
                  <>
                    <AlertCircle className="h-4 w-4 text-gray-500" />
                    <Badge variant="outline" className="text-gray-600">
                      Desconectado
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {whatsappStatus?.status === "connected" && whatsappStatus.connectedNumber && (
              <div className="text-right space-y-1">
                <Label className="text-sm text-muted-foreground">Número Conectado</Label>
                <p className="font-mono font-semibold text-lg">{whatsappStatus.connectedNumber}</p>
              </div>
            )}
          </div>

          {/* Instruções */}
          <fieldset className="border p-4 rounded-md bg-blue-50/50 dark:bg-blue-950/20">
            <legend className="text-lg font-semibold px-2 text-blue-900 dark:text-blue-100">Como Funciona</legend>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200 mt-2">
              <li>Clique em "Conectar WhatsApp" abaixo</li>
              <li>Escaneie o QR Code que aparecerá com seu WhatsApp</li>
              <li>Aguarde a confirmação da conexão (leva alguns segundos)</li>
              <li>Pronto! As mensagens automáticas serão enviadas pelo seu número</li>
            </ol>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-3 italic">
              💡 Dica: Use um número exclusivo para o WhatsApp Business da sua barbearia.
            </p>
          </fieldset>

          {/* Informações adicionais quando desconectado */}
          {whatsappStatus?.status === "disconnected" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Atenção:</strong> Enquanto seu WhatsApp não estiver conectado, as mensagens automáticas serão
                enviadas através do nosso número padrão de demonstração.
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3">
            {whatsappStatus?.status !== "connected" ? (
              <Button onClick={handleConnect} disabled={isConnecting} size="lg" className="w-full sm:w-auto">
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button onClick={fetchWhatsAppStatus} variant="outline" size="lg">
                  Verificar Status
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={() => setShowDisconnectDialog(true)}
                  disabled={isDisconnecting}
                >
                  <X className="mr-2 h-4 w-4" />
                  Desconectar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal QR Code */}
      <Dialog open={showQRModal} onOpenChange={handleCloseQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>Abra o WhatsApp no seu celular e escaneie este código QR</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-6">
            {qrCode ? (
              <>
                <div className="p-4 bg-white rounded-lg border-4 border-gray-200">
                  <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Aguardando conexão...</span>
                </div>
                <div className="text-xs text-center text-muted-foreground max-w-sm">
                  <p>
                    <strong>Como escanear:</strong>
                  </p>
                  <ol className="list-decimal list-inside text-left mt-2 space-y-1">
                    <li>Abra o WhatsApp no celular</li>
                    <li>Toque em Mais opções ou Configurações</li>
                    <li>Toque em Aparelhos conectados</li>
                    <li>Toque em Conectar um aparelho</li>
                    <li>Aponte o celular para esta tela</li>
                  </ol>
                </div>
              </>
            ) : (
              <Loader2 className="animate-spin h-16 w-16 text-primary" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de desconexão */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao desconectar, as mensagens automáticas voltarão a ser enviadas pelo nosso número padrão até que você
              conecte novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desconectando...
                </>
              ) : (
                "Sim, desconectar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
