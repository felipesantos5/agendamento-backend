import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
  // Você pode adicionar props se precisar de verificações de role específicas no futuro
}

export const ProtectedRoute = ({}: ProtectedRouteProps) => {
  const auth = useAuth();
  const { barbershopSlug } = useParams<{ barbershopSlug?: string }>();

  if (auth.isLoading) {
    return <div>Verificando autenticação...</div>; // Ou um spinner
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verifica se o slug da URL corresponde ao barbershopSlug do usuário autenticado
  // Isso garante que o admin só acesse o painel da sua própria barbearia através da URL correta
  if (barbershopSlug && auth.user?.barbershopSlug !== barbershopSlug) {
    // Redireciona para o slug correto ou para uma página de erro/seleção
    console.warn("Tentativa de acesso a slug de barbearia incorreto.");
    return <Navigate to={`/${auth.user?.barbershopSlug}/configuracoes`} replace />;
  }

  // Se o slug não estiver na URL, mas o usuário estiver autenticado,
  // redireciona para o slug da barbearia dele.
  // Isso acontece se ele tentar acessar /admin (ou uma rota sem slug) após o login.
  if (!barbershopSlug && auth.user?.barbershopSlug) {
    return <Navigate to={`/${auth.user.barbershopSlug}/configuracoes`} replace />;
  }

  return <Outlet />; // Outlet renderizará o AdminLayout se o slug corresponder
};
