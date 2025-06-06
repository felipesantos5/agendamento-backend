// admin-frontend/src/App.tsx

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout";

// Importe as páginas do seu admin aqui
// Por exemplo:
// import LoginPage from './pages/LoginPage'; // Se você tiver uma página de login separada
// import { DashboardPage } from "./pages/admin/DashboardPage"; // Exemplo de página
import { BarbeariaConfigPage } from "./pages/BarbeariaPage";
import { ServicesPage } from "./pages/ServicesPage";
import { BarberPage } from "./pages/BarberPage";
import { AgendamentosPage } from "./pages/AgendamentosPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { SetPasswordPage } from "./pages/SetPasswordPage.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/configurar-senha/:token" element={<SetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/:barbershopSlug" element={<AdminLayout />}>
            <Route path="metricas" element={<DashboardPage />} />
            <Route path="configuracoes" element={<BarbeariaConfigPage />} />
            <Route path="servicos" element={<ServicesPage />} />
            <Route path="funcionarios" element={<BarberPage />} />
            <Route path="agendamentos" element={<AgendamentosPage />} />
          </Route>
        </Route>

        <Route path="/" element={<div>Página inicial do Admin (ou redirecionar para login/seleção de barbearia)</div>} />
        <Route path="*" element={<div>Erro 404 - Página Admin Não Encontrada</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
