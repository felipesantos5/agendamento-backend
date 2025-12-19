import { Navigate, Outlet } from "react-router-dom";
import { useSuperAdminAuth } from "../../contexts/SuperAdminAuthContext";

export const SuperAdminProtectedRoute = () => {
  const { isSuperAdmin, isLoading } = useSuperAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">Verificando autenticação...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/superadmin/login" replace />;
  }

  return <Outlet />;
};
