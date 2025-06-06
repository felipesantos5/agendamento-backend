import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useOutletContext } from "react-router-dom";

// Importações de componentes ShadCN/UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Edit2, Trash2, UserCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import apiClient from "@/services/api";
import { API_BASE_URL } from "@/config/BackendUrl";
import { ImageUploader } from "./ImageUploader";

// Contexto do AdminLayout (para obter barbershopId)
interface AdminOutletContext {
  barbershopId: string;
  barbershopName: string;
}

// Tipos para os dados do funcionário/barbeiro
interface Availability {
  _id?: string; // Mongoose pode adicionar _id
  day: string;
  start: string;
  end: string;
}

interface Barber {
  _id: string;
  name: string;
  image?: string;
  availability: Availability[];
}

type BarberFormData = Omit<Barber, "_id">;

const daysOfWeek = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const initialBarberFormState: BarberFormData = {
  name: "",
  image: "",
  availability: [
    { day: "Segunda-feira", start: "09:00", end: "18:00" }, // Exemplo inicial
  ],
};

export function BarberPage() {
  const { barbershopId, barbershopName } = useOutletContext<AdminOutletContext>();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [currentBarberForm, setCurrentBarberForm] = useState<Partial<Barber>>(initialBarberFormState);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [barberToDelete, setBarberToDelete] = useState<Barber | null>(null);

  const fetchBarbers = async () => {
    if (!barbershopId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/barbers`);
      setBarbers(response.data);
    } catch (err) {
      console.error("Erro ao buscar funcionários:", err);
      setError("Não foi possível carregar os funcionários.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBarbers();
  }, [barbershopId]);

  const handleFormInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentBarberForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvailabilityChange = (index: number, field: keyof Availability, value: string) => {
    setCurrentBarberForm((prev) => {
      const newAvailability = [...(prev?.availability || [])];
      if (newAvailability[index]) {
        (newAvailability[index] as any)[field] = value;
      }
      return { ...prev, availability: newAvailability };
    });
  };

  const addAvailabilitySlot = () => {
    setCurrentBarberForm((prev) => ({
      ...prev,
      availability: [...(prev?.availability || []), { day: "Segunda-feira", start: "09:00", end: "18:00" }],
    }));
  };

  const removeAvailabilitySlot = (index: number) => {
    setCurrentBarberForm((prev) => ({
      ...prev,
      availability: (prev?.availability || []).filter((_, i) => i !== index),
    }));
  };

  const openAddDialog = () => {
    setDialogMode("add");
    setCurrentBarberForm(initialBarberFormState);
    setIsDialogOpen(true);
    setError(null);
  };

  const openEditDialog = (barber: Barber) => {
    setDialogMode("edit");
    // Garante que availability seja um array para o formulário
    setCurrentBarberForm({
      ...barber,
      availability: barber.availability || [],
    });
    setIsDialogOpen(true);
    setError(null);
  };

  const handleSaveBarber = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!barbershopId || !currentBarberForm.name) {
      setError("Nome do funcionário é obrigatório.");
      return;
    }

    let finalImageUrl = currentBarberForm.image || "";

    // 1. Se um novo arquivo de imagem foi selecionado, faz o upload primeiro
    if (profileImageFile) {
      const imageUploadData = new FormData();
      imageUploadData.append("profileImage", profileImageFile); // O nome do campo esperado pelo backend

      try {
        // Assumindo que você criou uma rota /api/upload/barber-profile que salva em public/uploads/barbers
        const uploadResponse = await apiClient.post(`http://localhost:3001/api/upload/barber-profile`, imageUploadData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalImageUrl = uploadResponse.data.imageUrl; // O backend retorna a URL da imagem salva
      } catch (uploadError: any) {
        console.error("Erro no upload da imagem:", uploadError);
        setError(uploadError.response?.data?.error || "Falha ao fazer upload da imagem.");
        return;
      }
    }

    // 2. Prepara o payload com os dados do barbeiro
    const validAvailability = (currentBarberForm.availability || []).filter((slot) => slot.day && slot.start && slot.end);
    const barberDataPayload = {
      name: currentBarberForm.name,
      image: finalImageUrl, // Usa a URL da imagem (nova ou existente)
      availability: validAvailability,
    };

    // 3. Cria ou atualiza o barbeiro
    try {
      if (dialogMode === "add") {
        await apiClient.post(`${API_BASE_URL}/barbershops/${barbershopId}/barbers`, barberDataPayload);
      } else if (currentBarberForm._id) {
        await apiClient.put(`${API_BASE_URL}/barbershops/${barbershopId}/barbers/${currentBarberForm._id}`, barberDataPayload);
      }
      setIsDialogOpen(false);
      fetchBarbers();
    } catch (err: any) {
      console.error("Erro ao salvar funcionário:", err);
      setError(err.response?.data?.error || "Falha ao salvar o funcionário.");
    }
  };

  const handleDeleteBarber = async () => {
    if (!barberToDelete || !barbershopId) return;
    setError(null);
    try {
      await apiClient.delete(`${API_BASE_URL}/barbershops/${barbershopId}/barbers/${barberToDelete._id}`);
      setBarberToDelete(null);
      fetchBarbers();
    } catch (err: any) {
      console.error("Erro ao deletar funcionário:", err);
      setError(err.response?.data?.error || "Falha ao deletar o funcionário.");
      setBarberToDelete(null);
    }
  };

  if (isLoading && barbers.length === 0) return <p className="text-center p-10">Carregando funcionários...</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciar Funcionários (Barbeiros) - {barbershopName}</CardTitle>
          <CardDescription>Adicione, edite ou remova os profissionais da sua equipe.</CardDescription>
        </div>
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Funcionário
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
        <Table>
          <TableCaption>{barbers.length === 0 && !isLoading ? "Nenhum funcionário cadastrado." : "Lista dos seus funcionários."}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Disponibilidade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {barbers.map((barber) => (
              <TableRow key={barber._id}>
                <TableCell className="font-medium flex items-center">
                  {" "}
                  {barber.image ? (
                    <img src={barber.image} alt={barber.name} className="h-10 w-10 rounded-full object-cover mr-4" />
                  ) : (
                    <UserCircle className="h-10 w-10 text-gray-300 mr-4" />
                  )}
                  {barber.name}
                </TableCell>
                <TableCell className="text-xs">
                  {barber.availability && barber.availability.length > 0 ? (
                    barber.availability.map((a, index) => <div key={index}>{`${a.day}: ${a.start} - ${a.end}`}</div>)
                  ) : (
                    <span className="text-muted-foreground">Não definida</span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(barber)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>

                  <Button variant="destructive" size="sm" onClick={() => setBarberToDelete(barber)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Dialog para Adicionar/Editar Funcionário */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {" "}
          {/* Aumentado um pouco o tamanho */}
          <form onSubmit={handleSaveBarber}>
            <DialogHeader>
              <DialogTitle>{dialogMode === "add" ? "Adicionar Novo Funcionário" : "Editar Funcionário"}</DialogTitle>
              <DialogDescription>Preencha os dados do profissional e seus horários de disponibilidade.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-1.5">
                <Label>Foto de Perfil</Label>
                <ImageUploader
                  initialImageUrl={currentBarberForm.image || null}
                  onFileSelect={(file) => setProfileImageFile(file)}
                  aspectRatio="square" // Fotos de perfil geralmente são quadradas
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Nome do Funcionário</Label>
                <Input id="name" name="name" value={currentBarberForm.name || ""} onChange={handleFormInputChange} required />
              </div>

              <div className="space-y-2">
                <Label>Horários de Disponibilidade</Label>
                {(currentBarberForm.availability || []).map((slot, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                    <div className="flex-1">
                      <Label htmlFor={`day-${index}`} className="sr-only">
                        Dia
                      </Label>
                      <Select value={slot.day} onValueChange={(value) => handleAvailabilityChange(index, "day", value)}>
                        <SelectTrigger id={`day-${index}`}>
                          <SelectValue placeholder="Dia" />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((dayName) => (
                            <SelectItem key={dayName} value={dayName}>
                              {dayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`start-${index}`} className="sr-only">
                        Início
                      </Label>
                      <Input
                        id={`start-${index}`}
                        type="time"
                        value={slot.start}
                        onChange={(e) => handleAvailabilityChange(index, "start", e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`end-${index}`} className="sr-only">
                        Fim
                      </Label>
                      <Input
                        id={`end-${index}`}
                        type="time"
                        value={slot.end}
                        onChange={(e) => handleAvailabilityChange(index, "end", e.target.value)}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAvailabilitySlot(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addAvailabilitySlot} className="mt-2">
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Horário
                </Button>
              </div>
            </div>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit">{dialogMode === "add" ? "Adicionar Funcionário" : "Salvar Alterações"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para Confirmação de Deleção */}
      <AlertDialog open={!!barberToDelete} onOpenChange={(open) => !open && setBarberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Deleção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o funcionário "{barberToDelete?.name}"? Os agendamentos existentes para este profissional não serão
              afetados, mas ele não estará mais disponível para novos agendamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBarberToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBarber} className="bg-red-600 hover:bg-red-700">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
