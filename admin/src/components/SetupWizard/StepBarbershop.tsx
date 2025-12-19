import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ImageUploader";
import { Check, Scissors, Users, Store, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/config/BackendUrl";
import apiClient from "@/services/api";

interface StepBarbershopProps {
  barbershopId: string;
  barbershopName: string;
  servicesCount: number;
  barbersCount: number;
  onComplete: () => void;
  isCompleting: boolean;
  setIsCompleting: (value: boolean) => void;
}

export function StepBarbershop({
  barbershopId,
  barbershopName: initialName,
  servicesCount,
  barbersCount,
  onComplete,
  isCompleting,
  setIsCompleting,
}: StepBarbershopProps) {
  const [name, setName] = useState(initialName);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const handleComplete = async () => {
    if (!name.trim()) {
      setError("Digite o nome da barbearia");
      return;
    }

    setIsCompleting(true);
    setError("");

    try {
      let logoUrl = "";

      // Upload da logo se selecionada
      if (logoFile) {
        const formData = new FormData();
        formData.append("logoFile", logoFile);

        const uploadResponse = await apiClient.post(`${API_BASE_URL}/api/upload/logo`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        logoUrl = uploadResponse.data.logoUrl;
      }

      // Atualiza a barbearia
      const updateData: { name: string; logoUrl?: string } = { name: name.trim() };
      if (logoUrl) {
        updateData.logoUrl = logoUrl;
      }

      await apiClient.put(`${API_BASE_URL}/barbershops/${barbershopId}`, updateData);

      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao salvar configurações");
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Finalize sua barbearia</h2>
        <p className="text-gray-500 text-sm">
          Confirme o nome e adicione uma logo (opcional)
        </p>
      </div>

      {/* Resumo do que foi configurado */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <h3 className="text-emerald-700 font-medium mb-3 flex items-center gap-2">
          <Check className="w-4 h-4" />
          Configuração concluída
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 flex items-center gap-3 border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">{servicesCount}</p>
              <p className="text-gray-500 text-xs">
                {servicesCount === 1 ? "serviço" : "serviços"}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 flex items-center gap-3 border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">{barbersCount}</p>
              <p className="text-gray-500 text-xs">
                {barbersCount === 1 ? "barbeiro" : "barbeiros"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="shopName" className="text-gray-700 text-sm font-medium">
            Nome da barbearia *
          </Label>
          <Input
            id="shopName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Barbearia do João"
            className="bg-white border-gray-200 text-gray-900 mt-1 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <Label className="text-gray-700 text-sm font-medium mt-6 block">
            Logo da barbearia (opcional)
          </Label>
          <div className="mt-2">
            <ImageUploader
              onFileSelect={(file) => setLogoFile(file)}
              initialImageUrl=""
            />
            <p className="text-xs text-gray-400 mt-2 text-center">
              Recomendado: imagem quadrada, mínimo 200x200px
            </p>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-xs text-gray-400 mb-3 font-medium">Preview da sua barbearia</p>
        <div className="flex items-center gap-4 bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
            {logoFile ? (
              <img
                src={URL.createObjectURL(logoFile)}
                alt="Logo preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <Store className="w-7 h-7 text-gray-400" />
            )}
          </div>
          <div>
            <p className="text-gray-900 font-semibold">{name || "Sua Barbearia"}</p>
            <p className="text-gray-500 text-sm">
              {servicesCount} {servicesCount === 1 ? "serviço" : "serviços"} •{" "}
              {barbersCount} {barbersCount === 1 ? "barbeiro" : "barbeiros"}
            </p>
          </div>
        </div>
      </div>

      {/* Botão de concluir */}
      <Button
        onClick={handleComplete}
        disabled={isCompleting || !name.trim()}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 mt-4 h-12 text-base font-medium"
      >
        {isCompleting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Check className="w-5 h-5 mr-2" />
            Concluir configuração
          </>
        )}
      </Button>
    </div>
  );
}
