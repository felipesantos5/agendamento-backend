import { Navigate, useLocation } from "react-router-dom";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext"; // Usando o contexto do cliente

interface ProtectedRouteCustomerProps {
  children: React.ReactNode;
}

export function ProtectedRouteCustomer({ children }: ProtectedRouteCustomerProps) {
  const { isAuthenticated, isLoading } = useCustomerAuth();
  const location = useLocation();

  // Enquanto verifica a autenticação, pode mostrar um loader
  if (isLoading) {
    return <div>Carregando...</div>;
  }

  // Se não estiver autenticado, redireciona para a página de login
  if (!isAuthenticated) {
    return <Navigate to="/entrar" state={{ from: location }} replace />;
  }

  // Se estiver autenticado, renderiza a página solicitada
  return <>{children}</>;
}
