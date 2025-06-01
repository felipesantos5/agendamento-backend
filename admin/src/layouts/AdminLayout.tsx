// admin-frontend/src/layouts/AdminLayout.tsx

import React, { useEffect, useState } from "react";
import { Outlet, Link, useParams, useLocation } from "react-router-dom";
import axios from "axios"; // Para buscar dados da barbearia
import { LayoutDashboard, Settings, Users, Scissors, CalendarDays, ShieldAlert } from "lucide-react"; // Ícones de exemplo

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
  const location = useLocation(); // Para destacar o link ativo

  const [barbershop, setBarbershop] = useState<BarbershopContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const response = await axios.get(`http://localhost:3001/barbershops/slug/${barbershopSlug}`);
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
      to: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      to: "configuracoes",
      label: "Minha Barbearia",
      icon: <Settings className="mr-2 h-4 w-4" />,
    },
    {
      to: "funcionarios",
      label: "Funcionários",
      icon: <Users className="mr-2 h-4 w-4" />,
    },
    {
      to: "servicos",
      label: "Serviços",
      icon: <Scissors className="mr-2 h-4 w-4" />,
    },
    {
      to: "agendamentos",
      label: "Agendamentos",
      icon: <CalendarDays className="mr-2 h-4 w-4" />,
    },
  ];

  return (
    <BarbershopAdminContext.Provider value={barbershop}>
      {" "}
      {/* Opcional: usar Context API */}
      <div className="flex min-h-screen bg-gray-100">
        <aside className="w-64 bg-gray-900 text-gray-200 p-5 space-y-4 flex flex-col">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Painel</h1>
            <h2 className="text-sm font-medium text-rose-400 truncate" title={barbershop.name}>
              {barbershop.name}
            </h2>
          </div>
          <nav className="flex flex-col space-y-1 mt-4 flex-grow">
            {navItems.map((item) => {
              const isActive = location.pathname === `/admin/${barbershopSlug}/${item.to}` || (item.to === "dashboard" && location.pathname === `/admin/${barbershopSlug}`);
              return (
                <Link
                  key={item.label}
                  to={item.to} // Rotas relativas ao path do AdminLayout
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors
                    ${isActive ? "bg-rose-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {/* Você pode adicionar um botão de logout aqui */}
        </aside>
        <main className="flex-1 p-6 overflow-auto">
          {/* O Outlet renderizará DashboardPage, BarbeariaConfigPage, etc. */}
          {/* Passando o ID da barbearia para as páginas filhas */}
          <Outlet context={outletContextData} />
        </main>
      </div>
    </BarbershopAdminContext.Provider>
  );
}
