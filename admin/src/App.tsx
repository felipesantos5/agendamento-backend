// admin-frontend/src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout";

// Importe as páginas do seu admin aqui
// Por exemplo:
// import LoginPage from './pages/LoginPage'; // Se você tiver uma página de login separada
// import { DashboardPage } from "./pages/admin/DashboardPage"; // Exemplo de página
import { BarbeariaConfigPage } from "./pages/BarbeariaPage";
import { ServicesPage } from "./pages/ServicesPage";
import { BarberPage } from "./pages/BarberPage";
import { AgendamentosPage } from "./pages/AgendamentosPage";
// Importe outras páginas: FuncionariosPage, ServicosPage, AgendamentosPage

// Simulação de autenticação e contexto da barbearia
// Em um app real, isso viria de um AuthContext ou similar após o login.
// Por agora, vamos simular que o AdminLayout lidará com a busca do slug.

function App() {
  const isAuthenticated = true;

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota de Login - Exemplo, você pode ter outra estrutura
        <Route path="/login" element={<LoginPage />} />
        */}

        {/* Rota principal para o painel admin de uma barbearia específica */}
        {/* O AdminLayout será renderizado se houver um :barbershopSlug */}
        <Route
          path="/:barbershopSlug"
          element={
            // isAuthenticated ? <AdminLayout /> : <Navigate to="/login" replace />
            <AdminLayout /> // Removendo a verificação de auth por enquanto para simplificar
          }
        >
          {/* Rotas aninhadas que serão renderizadas dentro do AdminLayout */}
          {/* <Route index element={<Navigate to="dashboard" replace />} />{" "} */}
          {/* Redireciona /:slug para /:slug/dashboard */}
          {/* <Route path="dashboard" element={<DashboardPage />} /> */}
          <Route path="configuracoes" element={<BarbeariaConfigPage />} />
          <Route path="servicos" element={<ServicesPage />} />
          <Route path="funcionarios" element={<BarberPage />} />
          <Route path="agendamentos" element={<AgendamentosPage />} />
          {/* Adicione outras páginas aqui:
          <Route path="funcionarios" element={<FuncionariosPage />} />
          <Route path="servicos" element={<ServicosPage />} />
          <Route path="agendamentos" element={<AgendamentosPage />} />
          */}
        </Route>

        {/* Fallback para slugs não encontrados ou página inicial do admin.seudominio.com */}
        {/* Você pode querer uma página que lista barbearias ou um login geral aqui */}
        <Route path="/" element={<div>Página inicial do Admin (ou redirecionar para login/seleção de barbearia)</div>} />

        <Route path="*" element={<div>Erro 404 - Página Admin Não Encontrada</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
