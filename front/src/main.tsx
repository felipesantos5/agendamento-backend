import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { CustomerAuthProvider } from "./contexts/CustomerAuthContext.tsx";
import { Toaster } from "./components/ui/sonner.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomerAuthProvider>
      <App />
      <Toaster />
    </CustomerAuthProvider>
  </StrictMode>
);
