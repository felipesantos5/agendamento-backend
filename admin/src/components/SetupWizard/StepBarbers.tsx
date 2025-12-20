import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { API_BASE_URL } from "@/config/BackendUrl";
import apiClient from "@/services/api";

interface Barber {
  _id: string;
  name: string;
}

interface StepBarbersProps {
  barbershopId: string;
  barbers: Barber[];
  onBarbersChange: (barbers: Barber[]) => void;
}

// Disponibilidade padrão: Segunda a Sexta, 09:00-18:00
const DEFAULT_AVAILABILITY = [
  { day: "Segunda-feira", start: "09:00", end: "18:00" },
  { day: "Terça-feira", start: "09:00", end: "18:00" },
  { day: "Quarta-feira", start: "09:00", end: "18:00" },
  { day: "Quinta-feira", start: "09:00", end: "18:00" },
  { day: "Sexta-feira", start: "09:00", end: "18:00" },
];

export function StepBarbers({ barbershopId, barbers, onBarbersChange }: StepBarbersProps) {
  const [name, setName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  const handleAddBarber = async () => {
    if (!name.trim()) {
      setError("Digite o nome do barbeiro");
      return;
    }

    setIsAdding(true);
    setError("");

    try {
      const response = await apiClient.post(`${API_BASE_URL}/barbershops/${barbershopId}/barbers`, {
        name: name.trim(),
        availability: DEFAULT_AVAILABILITY,
        image: "",
        break: {
          enabled: false,
          start: "12:00",
          end: "13:00",
          days: [],
        },
      });

      onBarbersChange([...barbers, response.data]);
      setName("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao adicionar barbeiro");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Cadastre seus barbeiros</h2>
        {/* <p className="text-gray-500 text-sm">
          Adicione pelo menos 1 barbeiro. Você pode ajustar os horários depois.
        </p> */}
      </div>

      {/* Formulário */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="barberName" className="text-gray-700 text-sm font-medium">
            Nome do barbeiro *
          </Label>
          <Input
            id="barberName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João Silva"
            className="bg-white border-gray-200 text-gray-900 mt-1 focus:border-blue-500 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddBarber();
              }
            }}
          />
        </div>

        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-sm text-amber-800 font-medium">
            Configure o e-mail de cada barbeiro em "Funcionários" para que ele possa ver seus agendamentos no app.
          </p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button
          onClick={handleAddBarber}
          disabled={isAdding || !name.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isAdding ? "Adicionando..." : "Adicionar barbeiro"}
        </Button>
      </div>

      {/* Lista de barbeiros */}
      {/* <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Barbeiros cadastrados</span>
          <span
            className={`text-sm font-medium ${barbers.length >= 1 ? "text-emerald-600" : "text-amber-500"}`}
          >
            {barbers.length}/1 mínimo
          </span>
        </div>

        {barbers.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhum barbeiro cadastrado ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {barbers.map((barber) => (
              <div
                key={barber._id}
                className="bg-white rounded-xl p-4 flex items-center justify-between border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">{barber.name}</p>
                    <p className="text-gray-500 text-sm">Seg-Sáb • 09:00-18:00</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteBarber(barber._id)}
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
