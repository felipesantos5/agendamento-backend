import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { API_BASE_URL } from "@/config/BackendUrl";
import apiClient from "@/services/api";

interface Service {
  _id: string;
  name: string;
  price: number;
  duration: number;
}

interface StepServicesProps {
  barbershopId: string;
  services: Service[];
  onServicesChange: (services: Service[]) => void;
}

export function StepServices({ barbershopId, services, onServicesChange }: StepServicesProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("30");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  const handleAddService = async () => {
    if (!name.trim()) {
      setError("Digite o nome do serviço");
      return;
    }

    setIsAdding(true);
    setError("");

    try {
      const response = await apiClient.post(`${API_BASE_URL}/barbershops/${barbershopId}/services`, {
        name: name.trim(),
        price: parseFloat(price) || 0,
        duration: parseInt(duration) || 30,
        isPlanService: false,
        plan: null,
      });

      onServicesChange([...services, response.data]);
      setName("");
      setPrice("");
      setDuration("30");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao adicionar serviço");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Cadastre seus serviços</h2>
      </div>

      {/* Formulário */}
      <div className="bspace-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <Label htmlFor="name" className="text-gray-700 text-sm font-medium">
              Nome do serviço *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Corte de cabelo"
              className="bg-white border-gray-200 text-gray-900 mt-1 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <Label htmlFor="price" className="text-gray-700 text-sm font-medium">
              Preço (R$)
            </Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="bg-white border-gray-200 text-gray-900 mt-1 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <Label htmlFor="duration" className="text-gray-700 text-sm font-medium">
              Duração (min)
            </Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
              min="5"
              step="5"
              className="bg-white border-gray-200 text-gray-900 mt-1 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button
          onClick={handleAddService}
          disabled={isAdding || !name.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isAdding ? "Adicionando..." : "Adicionar serviço"}
        </Button>
      </div>

      {/* Lista de serviços */}
      {/* <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Serviços cadastrados</span>
          <span
            className={`text-sm font-medium ${services.length >= 1 ? "text-emerald-600" : "text-amber-500"}`}
          >
            {services.length}/1 mínimo
          </span>
        </div>

        {services.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
            <Scissors className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhum serviço cadastrado ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service._id}
                className="bg-white rounded-xl p-4 flex items-center justify-between border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">{service.name}</p>
                    <p className="text-gray-500 text-sm">
                      {formatPrice(service.price)} • {service.duration} min
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteService(service._id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div> */}
    </div>
  );
}
