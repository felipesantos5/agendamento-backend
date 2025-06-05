import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loja } from "./pages/Loja";
import { BookingSuccessPage } from "./components/BookingSuccessPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:slug" element={<Loja />} />
        <Route path="/agendamento-sucesso" element={<BookingSuccessPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
