import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { AdminOutletContext } from "@/types/AdminOutletContext";
import { API_BASE_URL } from "@/config/BackendUrl";

interface CheckoutSettings {
  mercadoPagoAccessToken?: string;
  paymentsEnabled?: boolean;
  requireOnlinePayment?: boolean;
}

export const CheckoutConfigPage = () => {
  const { barbershopId } = useOutletContext<AdminOutletContext>();

  const [formData, setFormData] = useState<CheckoutSettings>({
    mercadoPagoAccessToken: "",
    paymentsEnabled: false,
    requireOnlinePayment: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Busca as configurações de checkout
  const fetchCheckoutSettings = async () => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}`);
      setFormData({
        mercadoPagoAccessToken: response.data.mercadoPagoAccessToken || "",
        paymentsEnabled: response.data.paymentsEnabled || false,
        requireOnlinePayment: response.data.requireOnlinePayment || false,
      });
    } catch (error: any) {
      console.error("Erro ao buscar configurações de checkout:", error);
      toast.error(error.response?.data?.error || "Erro ao buscar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (barbershopId) {
      fetchCheckoutSettings();
    }
  }, [barbershopId]);

  // Handler para ativar/desativar pagamentos
  const handlePaymentEnabledChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      paymentsEnabled: checked,
      // Se desativar os pagamentos, desativa também a obrigatoriedade
      requireOnlinePayment: checked ? prev.requireOnlinePayment : false,
    }));
  };

  // Handler para tornar pagamento obrigatório
  const handlePaymentMandatoryChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      requireOnlinePayment: checked,
    }));
  };

  // Handler para mudanças no input do token
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Salva as configurações
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await apiClient.put(`${API_BASE_URL}/barbershops/${barbershopId}`, {
        mercadoPagoAccessToken: formData.mercadoPagoAccessToken,
        paymentsEnabled: formData.paymentsEnabled,
        requireOnlinePayment: formData.requireOnlinePayment,
      });

      toast.success("Configurações de checkout salvas com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error);
      toast.error(error.response?.data?.error || "Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSave}>
        <CardHeader>
          <CardTitle>Configurações de Checkout</CardTitle>
          <CardDescription>
            Configure os pagamentos online com Mercado Pago para permitir que seus clientes paguem pelos agendamentos diretamente no site.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Switch para ativar/desativar checkout */}
          <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="payments-enabled" className="text-base font-semibold">
                Ativar checkout online
              </Label>
              <CardDescription>
                Permitir que clientes paguem pelo agendamento diretamente no site.
              </CardDescription>
            </div>
            <Switch
              id="payments-enabled"
              checked={formData.paymentsEnabled || false}
              onCheckedChange={handlePaymentEnabledChange}
            />
          </div>

          {/* Bloco condicional que só aparece se os pagamentos estiverem ativos */}
          {formData.paymentsEnabled && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/50 pt-2 pb-2">
              {/* Switch para tornar pagamento obrigatório */}
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                <div className="space-y-0.5">
                  <Label htmlFor="requireOnlinePayment" className="font-medium">
                    Tornar pagamento OBRIGATÓRIO?
                  </Label>
                  <CardDescription className="text-xs">
                    Se ativo, o cliente DEVERÁ pagar online para concluir o agendamento.
                  </CardDescription>
                </div>
                <Switch
                  id="requireOnlinePayment"
                  checked={formData.requireOnlinePayment || false}
                  onCheckedChange={handlePaymentMandatoryChange}
                />
              </div>

              {/* Campo para o Access Token do Mercado Pago */}
              <div className="space-y-2 flex flex-col pt-4">
                <Label htmlFor="mercadoPagoAccessToken">Access Token do Mercado Pago</Label>
                <div className="relative">
                  <Input
                    id="mercadoPagoAccessToken"
                    name="mercadoPagoAccessToken"
                    type={showToken ? "text" : "password"}
                    value={formData.mercadoPagoAccessToken || ""}
                    onChange={handleInputChange}
                    placeholder="Cole seu Access Token aqui"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full px-3"
                    onClick={() => setShowToken(!showToken)}
                    aria-label={showToken ? "Esconder token" : "Mostrar token"}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Links úteis */}
                <div className="space-y-1 mt-2">
                  <a
                    className="text-xs text-gray-700 underline block"
                    href="https://www.mercadopago.com.br/settings/account/applications/create-app"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Clique aqui para criar sua conta no Mercado Pago
                  </a>
                  <a
                    className="text-xs text-gray-700 underline block"
                    href="https://youtu.be/341Dptvsov0"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Video de tutorial explicativo
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Instruções */}
          <fieldset className="border p-4 rounded-md bg-blue-50/50 dark:bg-blue-950/20">
            <legend className="text-lg font-semibold px-2 text-blue-900 dark:text-blue-100">
              Como Funciona
            </legend>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200 mt-2">
              <li>Crie ou acesse sua conta no Mercado Pago através do link acima</li>
              <li>Gere um Access Token nas configurações da sua conta</li>
              <li>Cole o token no campo acima e ative o checkout online</li>
              <li>Seus clientes poderão pagar pelos agendamentos diretamente no site</li>
            </ol>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-3 italic">
              💡 Dica: Mantenha seu Access Token seguro e não compartilhe com ninguém.
            </p>
          </fieldset>
        </CardContent>

        <CardFooter className="justify-end mt-4">
          <Button type="submit" disabled={isSaving} className="cursor-pointer">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Configurações"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
