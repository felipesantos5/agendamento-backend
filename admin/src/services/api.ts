import { API_BASE_URL } from "@/config/BackendUrl";
import axios from "axios";

const apiClient = axios.create({
  baseURL: API_BASE_URL, // Sua URL base da API do backend
});

// Interceptor para adicionar o token JWT a todas as requisições
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Se a resposta for um erro...

    // Verifica se o erro é uma resposta da API com status 401
    if (error.response && error.response.status === 401) {
      console.log("Token expirado ou inválido. Deslogando o usuário.");

      // Limpa os dados de autenticação do armazenamento local
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");

      // Redireciona o usuário para a página de login.
      // Usar window.location.assign() força um refresh da página, o que é bom
      // para garantir que todo o estado da aplicação React seja limpo.
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    // É importante retornar a promessa rejeitada para que o erro ainda possa
    // ser tratado no componente que fez a chamada (ex: para parar um spinner de loading).
    return Promise.reject(error);
  }
);

export default apiClient;
