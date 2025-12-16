import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiClient from "@/services/api";
import { API_BASE_URL } from "@/config/BackendUrl";
import { toast } from "sonner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { Loader2 } from "lucide-react";
import { PhoneFormat } from "@/helper/phoneFormater";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [step, setStep] = useState<"enterPhone" | "enterOtp">("enterPhone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useCustomerAuth();
  const navigate = useNavigate();

  const handleRequestOtp = async () => {
    if (phone.length < 10) {
      toast.error("Por favor, insira um número de telefone válido com DDD.");
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post(`${API_BASE_URL}/api/auth/customer/request-otp`, {
        phone,
      });
      toast.success("Código enviado!", {
        description: "Verifique seu WhatsApp e insira o código abaixo.",
      });
      setStep("enterOtp");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Falha ao enviar o código.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast.error("O código deve ter 6 dígitos.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post(
        `${API_BASE_URL}/api/auth/customer/verify-otp`,
        { phone, otp }
      );
      const { token, customer } = response.data;

      login(token, customer); // Salva o token e dados no contexto
      toast.success(`Bem-vindo de volta, ${customer.name}!`);

      // Redireciona para a página de "Minha Conta" ou para o início
      navigate("/meus-agendamentos");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Falha ao verificar o código."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Impede o recarregamento da página
    if (isLoading) return; // Impede submissões duplas

    if (step === "enterPhone") {
      handleRequestOtp();
    } else {
      handleVerifyOtp();
    }
  };

  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOtp();
    }
    // A dependência 'handleVerifyOtp' pode causar re-renderizações se não for memoizada,
    // mas para este caso, é seguro adicionar. Se usar `useCallback` na função, adicione-a.
  }, [otp]);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center mb-6">
        <h1 className="text-3xl font-bold">Entre na sua conta</h1>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          {step === "enterPhone" && (
            <div className="space-y-2">
              <Label htmlFor="phone">Nº de WhatsApp com DDD</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(XX) XXXXX-XXXX"
                maxLength={15}
                value={PhoneFormat(phone)}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                disabled={isLoading}
              />
            </div>
          )}

          {step === "enterOtp" && (
            <div className="space-y-4 flex flex-col items-center">
              <Label htmlFor="otp">Digite o código de 6 dígitos</Label>
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="p-0 h-auto"
                onClick={() => setStep("enterPhone")}
              >
                Usar outro número?
              </Button>
            </div>
          )}
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          // onClick={step === "enterPhone" ? handleRequestOtp : handleVerifyOtp}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {step === "enterPhone" ? "Enviar Código" : "Confirmar e Entrar"}
        </Button>
      </div>
    </form>
  );
}
