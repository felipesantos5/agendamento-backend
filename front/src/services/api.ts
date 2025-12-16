import axios from "axios";
import { API_BASE_URL } from "@/config/BackendUrl"; // Importando a URL base que você já tem

// Cria uma instância do Axios com configurações padrão
const apiClient = axios.create({
  baseURL: API_BASE_URL, // Define a URL base para todas as requisições
  headers: {
    "Content-Type": "application/json",
  },
});

// Isso é um "Interceptor". Ele executa um código ANTES de cada requisição ser enviada.
// É perfeito para adicionar o token de autenticação.
apiClient.interceptors.request.use(
  (config) => {
    // Pega o token do cliente do localStorage
    const token = localStorage.getItem("customerToken");

    // Se o token existir, adiciona ao cabeçalho 'Authorization'
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Faz alguma coisa com o erro da requisição
    return Promise.reject(error);
  }
);

export default apiClient;
