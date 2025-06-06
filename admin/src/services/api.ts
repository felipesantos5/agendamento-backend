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

export default apiClient;
