import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useOutletContext } from "react-router-dom";

// Importações de componentes ShadCN/UI que usaremos
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Trash2, PlusCircle } from "lucide-react"; // Ícones
import { PhoneFormat } from "@/helper/phoneFormater";
import { CepFormat } from "@/helper/cepFormarter";
import { ImageUploader } from "./ImageUploader";
import apiClient from "@/services/api";

// Tipos para os dados da barbearia (espelhando seus schemas do backend)
interface Address {
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  complemento?: string;
}

interface WorkingHour {
  _id?: string; // Mongoose pode adicionar _id a subdocumentos
  day: string;
  start: string;
  end: string;
}

interface BarbershopData {
  _id: string;
  name: string;
  description: string;
  address: Address;
  logoUrl?: string;
  contact: string;
  slug: string;
  workingHours: WorkingHour[];
}

// Estado inicial para o formulário (parcial, pois será preenchido após o fetch)
const initialBarbershopState: Partial<BarbershopData> = {
  name: "",
  description: "",
  address: {
    cep: "",
    estado: "",
    cidade: "",
    bairro: "",
    rua: "",
    numero: "",
    complemento: "",
  },
  logoUrl: "",
  contact: "",
  slug: "",
  workingHours: [],
};

const daysOfWeek = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

interface AdminOutletContext {
  barbershopId: string;
  barbershopName: string;
}

export function BarbeariaConfigPage() {
  const { barbershopId, barbershopName } = useOutletContext<AdminOutletContext>();

  const [formData, setFormData] = useState<Partial<BarbershopData>>(initialBarbershopState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false); // Novo estado para upload

  useEffect(() => {
    if (!barbershopId) {
      setError("ID da barbearia não fornecido.");
      setIsLoading(false);
      return;
    }

    const fetchBarbershopData = async () => {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const response = await apiClient.get(`http://localhost:3001/barbershops/${barbershopId}`);
        setFormData(response.data);
      } catch (err) {
        console.error("Erro ao buscar dados da barbearia:", err);
        setError("Falha ao carregar os dados da barbearia. Verifique o console.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBarbershopData();
  }, [barbershopId]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const digitsOnly = inputValue.replace(/\D/g, ""); // Remove todos os não dígitos
    setFormData((prev) => ({
      ...prev,
      contact: digitsOnly.slice(0, 11), // Salva apenas os dígitos e limita a 11
    }));
  };

  const handleCepChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const digitsOnly = inputValue.replace(/\D/g, "");
    setFormData((prev) => ({
      ...prev,
      address: {
        ...(prev?.address as Address), // Assume que address já foi inicializado
        cep: digitsOnly.slice(0, 8), // Salva apenas os dígitos e limita a 8
      },
    }));
  };

  const handleAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      address: { ...prev?.address, [name]: value } as Address,
    }));
  };

  const handleWorkingHourChange = (index: number, field: keyof WorkingHour, value: string) => {
    setFormData((prev) => {
      const updatedWorkingHours = [...(prev?.workingHours || [])];
      if (updatedWorkingHours[index]) {
        (updatedWorkingHours[index] as any)[field] = value;
      }
      return { ...prev, workingHours: updatedWorkingHours };
    });
  };

  const addWorkingHour = () => {
    setFormData((prev) => ({
      ...prev,
      workingHours: [...(prev?.workingHours || []), { day: "Segunda-feira", start: "09:00", end: "18:00" }],
    }));
  };

  const removeWorkingHour = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      workingHours: (prev?.workingHours || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true); // Usaremos isLoading para o processo geral de salvar
    setError(null);
    setSuccessMessage(null);

    if (!barbershopId) {
      setError("ID da barbearia não está definido.");
      setIsLoading(false);
      return;
    }

    let finalLogoUrl = formData.logoUrl; // Começa com a URL existente ou a que foi carregada

    // 1. Se um novo arquivo de logo foi selecionado, faça o upload primeiro
    if (logoFile) {
      setIsUploading(true); // Indica que o upload está em progresso
      const imageUploadData = new FormData();
      imageUploadData.append("logoFile", logoFile); // 'logoFile' deve corresponder ao esperado pelo multer no backend

      try {
        const uploadResponse = await apiClient.post(
          `http://localhost:3001/api/upload/logo`, // Rota de upload no backend
          imageUploadData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        finalLogoUrl = uploadResponse.data.logoUrl; // Pega a URL retornada pelo backend
        setLogoFile(null); // Limpa o arquivo do estado após o upload
      } catch (uploadError: any) {
        console.error("Erro no upload da logo:", uploadError);
        setError(uploadError.response?.data?.error || "Falha ao fazer upload da nova logo. As outras alterações não foram salvas.");
        setIsUploading(false);
        setIsLoading(false);
        return; // Interrompe o processo se o upload falhar
      } finally {
        setIsUploading(false);
      }
    }

    // 2. Agora, prepare os dados da barbearia para atualização, incluindo a finalLogoUrl
    // Remove _id e outros campos não editáveis do formData antes de enviar para o PUT
    const { _id, createdAt, updatedAt, ...dataToUpdateClean } = formData as any;

    const payload = {
      ...dataToUpdateClean,
      logoUrl: finalLogoUrl, // Usa a nova URL se um arquivo foi upado, senão a que já estava
    };

    try {
      // 3. Envie os dados atualizados da barbearia (incluindo a nova logoUrl se houver)
      const updateResponse = await apiClient.put(`http://localhost:3001/barbershops/${barbershopId}`, payload);
      setSuccessMessage("Dados da barbearia atualizados com sucesso!");
      setFormData(updateResponse.data); // Atualiza o formData com os dados retornados (incluindo a nova logoUrl)
    } catch (err: any) {
      console.error("Erro ao atualizar barbearia:", err);
      setError(err.response?.data?.error || "Falha ao atualizar dados da barbearia.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !formData?.name) return <p className="text-center p-10">Carregando configurações...</p>;
  if (error && !formData?.name) return <p className="text-center p-10 text-red-600">{error}</p>;
  if (!formData?.name && !isLoading) return <p className="text-center p-10">Nenhuma configuração encontrada para esta barbearia.</p>;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Configurações da Barbearia</CardTitle>
        <CardDescription>Edite os detalhes do seu estabelecimento.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Detalhes Básicos */}

          <div className="space-y-2">
            <Label htmlFor="name">Nome da Barbearia</Label>
            <Input id="name" name="name" value={formData.name || ""} onChange={handleInputChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" value={formData.description || ""} onChange={handleInputChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Contato (Telefone/WhatsApp)</Label>
              <Input
                id="contact"
                name="contact"
                type="tel" // Tipo semântico para telefone
                value={PhoneFormat(formData.contact || "")} // Mostra o valor formatado
                onChange={handleContactChange} // Usa o handler específico para salvar só os dígitos
                maxLength={15} // (XX) XXXXX-XXXX são 15 caracteres
                placeholder="(XX) XXXXX-XXXX"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input id="slug" name="slug" value={formData.slug || ""} onChange={handleInputChange} required />
              <p className="text-xs text-gray-500">Ex: nome-da-barbearia (usado na URL da sua página)</p>
            </div>
          </div>

          <div className="space-y-2">
            <ImageUploader
              label="Logo da Barbearia"
              initialImageUrl={formData.logoUrl || null}
              onFileSelect={(file) => {
                setLogoFile(file);
                // Se um novo arquivo é selecionado, você pode querer que o formData.logoUrl
                // seja limpo visualmente até que o novo upload seja feito,
                // ou pode deixar o ImageUploader mostrar o preview do novo arquivo.
                // A lógica atual do ImageUploader já mostra o preview do novo arquivo.
              }}
              aspectRatio="square"
            />
            {isUploading && <p className="text-sm text-blue-600 mt-2">Enviando logo...</p>}
          </div>

          {/* <div className="space-y-2">
            <Label htmlFor="logoUrl">URL da Logo</Label>
            <Input id="logoUrl" name="logoUrl" type="url" value={formData.logoUrl || ""} onChange={handleInputChange} />
          </div> */}

          {/* Endereço */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-lg font-semibold px-1">Endereço</legend>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    name="cep"
                    type="text" // Ou "tel" se preferir o teclado numérico, mas "text" é comum para CEP com máscara
                    value={CepFormat(formData.address?.cep || "")} // Mostra o valor formatado
                    onChange={handleCepChange} // Usa o handler específico
                    maxLength={9} // XXXXX-XXX são 9 caracteres
                    minLength={9} // XXXXX-XXX são 9 caracteres
                    placeholder="00000-000"
                    required // Se o CEP for obrigatório
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rua">Rua</Label>
                  <Input id="rua" name="rua" value={formData.address?.rua || ""} onChange={handleAddressChange} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" name="numero" value={formData.address?.numero || ""} onChange={handleAddressChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input id="bairro" name="bairro" value={formData.address?.bairro || ""} onChange={handleAddressChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input id="complemento" name="complemento" value={formData.address?.complemento || ""} onChange={handleAddressChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" name="cidade" value={formData.address?.cidade || ""} onChange={handleAddressChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado (UF)</Label>
                  <Input id="estado" name="estado" maxLength={2} value={formData.address?.estado || ""} onChange={handleAddressChange} required />
                </div>
              </div>
            </div>
          </fieldset>

          {/* Horários de Funcionamento */}
          <fieldset className="border p-4 rounded-md">
            <legend className="text-lg font-semibold px-1">Horários de Funcionamento</legend>
            <div className="space-y-4 mt-2">
              {formData.workingHours?.map((wh, index) => (
                <div key={wh._id || index} className="flex items-end gap-2 p-2 border rounded-md">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`wh-day-${index}`}>Dia</Label>
                    <Select value={wh.day} onValueChange={(value) => handleWorkingHourChange(index, "day", value)}>
                      <SelectTrigger id={`wh-day-${index}`}>
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`wh-start-${index}`}>Início</Label>
                    <Input
                      id={`wh-start-${index}`}
                      type="time"
                      value={wh.start}
                      onChange={(e) => handleWorkingHourChange(index, "start", e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`wh-end-${index}`}>Fim</Label>
                    <Input
                      id={`wh-end-${index}`}
                      type="time"
                      value={wh.end}
                      onChange={(e) => handleWorkingHourChange(index, "end", e.target.value)}
                    />
                  </div>
                  <Button type="button" variant="destructive" size="icon" onClick={() => removeWorkingHour(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addWorkingHour} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Horário
              </Button>
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading || isUploading}>
            {isLoading ? (isUploading ? "Enviando Imagem..." : "Salvando...") : "Salvar Configurações"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
