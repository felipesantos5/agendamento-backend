// admin-frontend/src/layouts/AdminLayout.tsx

import React, { useEffect, useState } from "react";
import { Outlet, Link, useParams, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings, Users, Scissors, CalendarDays, ShieldAlert, LogOut, X, Menu } from "lucide-react"; // Ícones de exemplo
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/services/api";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config/BackendUrl";

// Tipo para os dados básicos da barbearia que podem ser úteis no layout
interface BarbershopContextData {
  _id: string;
  name: string;
  slug: string;
}

// Contexto para compartilhar dados da barbearia com as páginas filhas (opcional, mas útil)
// Você pode preferir passar props via Outlet context.
export const BarbershopAdminContext = React.createContext<BarbershopContextData | null>(null);

export function AdminLayout() {
  const { barbershopSlug } = useParams<{ barbershopSlug: string }>();
  const { user, logout } = useAuth();
  const location = useLocation(); // Para destacar o link ativo

  const [barbershop, setBarbershop] = useState<BarbershopContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!barbershopSlug) {
      setError("Slug da barbearia não fornecido na URL.");
      setIsLoading(false);
      return;
    }

    const fetchBarbershopForLayout = async () => {
      setIsLoading(true);
      try {
        // Esta rota já existe no seu backend para buscar por slug
        const response = await apiClient.get(`${API_BASE_URL}/barbershops/slug/${barbershopSlug}`);
        if (response.data) {
          setBarbershop({
            _id: response.data._id,
            name: response.data.name,
            slug: response.data.slug,
          });
          setError(null);
        } else {
          setError("Barbearia não encontrada.");
        }
      } catch (err) {
        console.error("Erro ao buscar dados da barbearia para o layout:", err);
        setError("Não foi possível carregar os dados da barbearia.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBarbershopForLayout();
  }, [barbershopSlug]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando painel da barbearia...</div>;
  }

  if (error || !barbershop) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-600">
        <ShieldAlert size={48} className="mb-4" />
        <p className="text-xl">{error || "Barbearia não encontrada."}</p>
        <Link to="/" className="mt-4 text-blue-500 hover:underline">
          Voltar para o início
        </Link>
      </div>
    );
  }

  // Passando o _id da barbearia para as rotas filhas via Outlet context
  // As páginas filhas poderão acessar isso com useOutletContext()
  const outletContextData = {
    barbershopId: barbershop._id,
    barbershopName: barbershop.name,
  };

  const navItems = [
    {
      to: "configuracoes",
      label: "Minha Barbearia",
      icon: <Settings className="mr-2 h-4 w-4" />,
      roles: ["admin"],
    },
    {
      to: "metricas",
      label: "Metricas",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      roles: ["admin"],
    },
    {
      to: "funcionarios",
      label: "Funcionários",
      icon: <Users className="mr-2 h-4 w-4" />,
      roles: ["admin"],
    },
    {
      to: "servicos",
      label: "Serviços",
      icon: <Scissors className="mr-2 h-4 w-4" />,
      roles: ["admin"],
    },
    {
      to: "agendamentos",
      label: "Agendamentos",
      icon: <CalendarDays className="mr-2 h-4 w-4" />,
      roles: ["admin", "barber"],
    },
  ];

  const visibleNavItems = navItems.filter((item) => user?.role && item.roles.includes(user.role));

  const SidebarContent = () => (
    <>
      <div className="p-5">
        <h1 className="text-2xl font-bold text-white mb-1">Painel</h1>
        <h2 className="text-sm font-medium text-rose-400 truncate" title={barbershop!.name}>
          {barbershop!.name}
        </h2>
      </div>
      <nav className="flex flex-col space-y-1 mt-4 flex-grow px-3">
        {visibleNavItems.map((item) => {
          const pathToCheck = `/${barbershopSlug}/${item.to}`;
          const isActive = location.pathname === pathToCheck || (item.to === "dashboard" && location.pathname === `/${barbershopSlug}`);

          return (
            <Link
              key={item.label}
              to={item.to}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ease-in-out
                ${
                  isActive
                    ? "bg-rose-600 text-white shadow-lg transform scale-105"
                    : "text-gray-300 hover:bg-zinc-800 hover:text-white hover:shadow-md"
                }`}
              onClick={() => setIsMobileSidebarOpen(false)} // Fecha ao clicar no item em mobile
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 mt-auto">
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full flex items-center justify-start px-3 py-2.5 text-sm font-medium rounded-md text-gray-400 hover:bg-red-700 hover:text-white"
        >
          <LogOut size={18} className="mr-3" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <BarbershopAdminContext.Provider value={barbershop}>
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar para Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-neutral-950 text-gray-200 fixed h-full">
          <SidebarContent />
        </aside>

        {/* Sidebar para Mobile (Overlay) */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} aria-hidden="true" />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-neutral-950 text-gray-200 flex flex-col
                   transform transition-transform duration-300 ease-in-out lg:hidden 
                   ${isMobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
        >
          <div className="flex justify-end p-2">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(false)} className="text-gray-300">
              <X size={24} />
            </Button>
          </div>
          <SidebarContent />
        </aside>

        {/* Botão para Abrir Sidebar em Mobile */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          {!isMobileSidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="bg-white/80 backdrop-blur-sm shadow-md"
              aria-label="Abrir menu"
            >
              <Menu size={24} className="text-gray-700" />
            </Button>
          )}
        </div>

        {/* Conteúdo Principal */}
        <main className="flex-1 p-6 overflow-y-auto lg:ml-64">
          <div className="lg:hidden text-center mb-4 pt-10">
            <h1 className="text-xl font-bold text-gray-800">{barbershop!.name}</h1>
          </div>
          <Outlet context={outletContextData} />
        </main>
      </div>
    </BarbershopAdminContext.Provider>
  );
}
