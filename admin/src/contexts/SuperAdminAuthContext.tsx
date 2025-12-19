import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { API_BASE_URL } from "../config/BackendUrl";

interface SuperAdminAuthContextType {
  token: string | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

export const SuperAdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("superAdminToken"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, [token]);

  const login = async (password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/superadmin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao fazer login");
    }

    const data = await response.json();
    localStorage.setItem("superAdminToken", data.token);
    setToken(data.token);
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/superadmin/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignora erros de logout
    }
    localStorage.removeItem("superAdminToken");
    setToken(null);
  };

  return (
    <SuperAdminAuthContext.Provider
      value={{
        token,
        isSuperAdmin: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </SuperAdminAuthContext.Provider>
  );
};

export const useSuperAdminAuth = () => {
  const context = useContext(SuperAdminAuthContext);
  if (context === undefined) {
    throw new Error("useSuperAdminAuth must be used within a SuperAdminAuthProvider");
  }
  return context;
};
