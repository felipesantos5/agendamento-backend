import { useState, FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import apiClient from "@/services/api";
import { API_BASE_URL } from "@/config/BackendUrl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

export function TrialSignupPage() {
  const [barbershopName, setBarbershopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const auth = useAuth();
  const navigate = useNavigate();

  if (auth.isAuthenticated) {
    return <Navigate to={`/${auth.user?.barbershopSlug}/metricas`} replace />;
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validações básicas
    if (!barbershopName.trim() || !email.trim() || !password) {
      setError("Todos os campos são obrigatórios.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post(`${API_BASE_URL}/api/auth/admin/trial-signup`, {
        barbershopName: barbershopName.trim(),
        adminEmail: email.trim(),
        adminPassword: password,
      });

      setIsSuccess(true);

      // Fazer login automático
      auth.login(response.data.token, response.data.user);

      // Aguardar um momento para mostrar mensagem de sucesso
      setTimeout(() => {
        navigate(`/${response.data.user.barbershopSlug}/metricas`, {
          replace: true,
        });
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Erro ao criar conta de teste.";
      const errorDetails = err.response?.data?.details;

      if (errorDetails && Array.isArray(errorDetails)) {
        setError(`${errorMessage}: ${errorDetails.join(", ")}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 p-4 pb-32">
      <img
        src="https://res.cloudinary.com/de1f7lccc/image/upload/v1750783948/logo-barbearia_hiymjm.png"
        alt="logo BarbeariAgendamento"
        className="w-72 mb-6"
      />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Criar Conta de Teste</CardTitle>
          <CardDescription>
            Teste gratuitamente por 7 dias. Sem cartão de crédito necessário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Conta criada com sucesso! Redirecionando para o dashboard...
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barbershopName">Nome da Barbearia</Label>
                <Input
                  id="barbershopName"
                  type="text"
                  placeholder="Barbearia do João"
                  required
                  value={barbershopName}
                  onChange={(e) => setBarbershopName(e.target.value)}
                  autoComplete="organization"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <PasswordInput
                  id="password"
                  placeholder="Mínimo 6 caracteres"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Digite a senha novamente"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Criando conta..." : "Criar Conta de Teste"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-gray-600">
          {/* <p>
            Ao criar uma conta, você concorda com nossos Termos de Serviço e Política de Privacidade.
          </p> */}
          <div>
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Fazer login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
