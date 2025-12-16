import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loja } from "./pages/loja/index.tsx";
import { BookingSuccessPage } from "./components/BookingSuccessPage";
import { CustomerLoginPage } from "./pages/CustomerLoginPage";
import { ProtectedRouteCustomer } from "./components/ProtectedRouteCustomer.tsx";
import { MyBookingsPage } from "./pages/MyBookingsPage.tsx";
import { PaymentSucessPage } from "./pages/PayedSucess.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:slug" element={<Loja />} />
        <Route
          path="/:slug/agendamento-sucesso"
          element={<BookingSuccessPage />}
        />
        <Route
          path="/:slug/pagamento-sucesso"
          element={<PaymentSucessPage />}
        />

        <Route path="/entrar" element={<CustomerLoginPage />} />

        <Route
          path="/meus-agendamentos"
          element={
            <ProtectedRouteCustomer>
              <MyBookingsPage />
            </ProtectedRouteCustomer>
          }
        />

        {/* <Route path="/minha-conta" element={<ProtectedRouteCustomer><MyAccountPage /></ProtectedRouteCustomer>} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
