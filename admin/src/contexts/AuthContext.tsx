import { createContext, useState, useContext, useEffect, ReactNode } from "react";

interface AuthUser {
  email: string;
  barbershopId: string;
  barbershopSlug: string;
  barbershopName: string;
  role: "admin" | "barber";
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("adminToken"));
  const [user, setUser] = useState<AuthUser | null>(JSON.parse(localStorage.getItem("adminUser") || "null"));
  const [isLoading, setIsLoading] = useState(true); // Para verificar o token inicial

  useEffect(() => {
    // Poderia adicionar uma verificação de validade do token aqui se quisesse
    setIsLoading(false);
  }, [token]);

  const login = (newToken: string, userData: AuthUser) => {
    localStorage.setItem("adminToken", newToken);
    localStorage.setItem("adminUser", JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, isLoading, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
