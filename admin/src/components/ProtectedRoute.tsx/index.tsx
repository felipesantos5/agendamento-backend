import { Navigate, Outlet, useParams, useOutletContext } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
  allowedRoles?: ("admin" | "barber")[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const auth = useAuth();
  const parentContext = useOutletContext();
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

  if (auth.user) {
    // ✅ 3. NOVA VERIFICAÇÃO: O usuário tem a função (role) permitida para esta rota?
    if (allowedRoles && !allowedRoles.includes(auth.user.role)) {
      console.warn(`Acesso negado. Usuário com função '${auth.user.role}' tentou acessar uma rota para '${allowedRoles.join(", ")}'.`);

      // Redireciona para uma página padrão que todos os usuários logados podem ver.
      // Para um barbeiro, essa página seria a de agendamentos.
      return <Navigate to={`/${auth.user.barbershopSlug}/agendamentos`} replace />;
    }
  }

  // Se o slug não estiver na URL, mas o usuário estiver autenticado,
  // redireciona para o slug da barbearia dele.
  // Isso acontece se ele tentar acessar /admin (ou uma rota sem slug) após o login.
  if (!barbershopSlug && auth.user?.barbershopSlug) {
    return <Navigate to={`/${auth.user.barbershopSlug}/configuracoes`} replace />;
  }

  return <Outlet context={parentContext} />; // Outlet renderizará o AdminLayout se o slug corresponder
};
