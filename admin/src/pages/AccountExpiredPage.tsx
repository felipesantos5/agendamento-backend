import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail, Phone } from "lucide-react";

export function AccountExpiredPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Limpa o indicador de conta expirada após 30 segundos
    const timer = setTimeout(() => {
      localStorage.removeItem("accountExpired");
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  const handleBackToLogin = () => {
    localStorage.removeItem("accountExpired");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/login");
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <img
        src="https://res.cloudinary.com/de1f7lccc/image/upload/v1750783948/logo-barbearia_hiymjm.png"
        alt="logo BarbeariAgendamento"
        className="w-72 mb-6"
      />
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <div>
              <CardTitle className="text-2xl">Período de Teste Expirado</CardTitle>
              <CardDescription>Sua conta de teste de 7 dias chegou ao fim</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Sua conta foi temporariamente desativada. Todos os seus dados estão seguros e serão restaurados assim
              que você assinar um plano.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">O que aconteceu?</h3>
            <p className="text-sm text-gray-600">
              Seu período de teste gratuito de 7 dias expirou. Durante o teste, você pôde experimentar todas as
              funcionalidades do sistema sem compromisso.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Como reativar minha conta?</h3>
            <p className="text-sm text-gray-600">
              Entre em contato conosco para contratar um plano e reativar sua conta. Todos os seus dados, agendamentos
              e configurações serão restaurados automaticamente.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold">Entre em contato:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-600" />
                <a href="mailto:contato@barbeariagendamento.com.br" className="text-primary hover:underline">
                  contato@barbeariagendamento.com.br
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-600" />
                <a href="tel:+5511999999999" className="text-primary hover:underline">
                  (11) 99999-9999
                </a>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleBackToLogin} variant="outline" className="w-full">
            Voltar para o Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
