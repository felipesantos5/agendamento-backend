import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Loja } from './pages/Loja'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/loja/:slug" element={<Loja />} />
        {/* Outras rotas... */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
