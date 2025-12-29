import { useState, FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useSuperAdminAuth } from "@/contexts/SuperAdminAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export function SuperAdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { isSuperAdmin, login } = useSuperAdminAuth();
  const navigate = useNavigate();

  if (isSuperAdmin) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(password);
      navigate("/superadmin/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "Senha incorreta.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="p-4 bg-blue-600 rounded-full mb-4">
          <ShieldCheck className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Super Admin</h1>
        <p className="text-slate-400 text-sm">Acesso restrito</p>
      </div>

      <Card className="w-full max-w-sm bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Login</CardTitle>
          <CardDescription className="text-slate-400">
            Digite a senha de acesso root
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha root"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/30 p-2 rounded">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
