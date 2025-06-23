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
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Edit2, Trash2, UserCircle, Copy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  email?: string;
  commission?: number;
}

type BarberFormData = {
  name: string;
  image?: string;
  availability: Availability[];
  email: string;
  password?: string;
  commission?: number;
};

const daysOfWeek = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const initialBarberFormState: BarberFormData = {
  name: "",
  image: "",
  email: "",
  password: "",
  commission: 0,
  availability: [
    { day: "Segunda-feira", start: "09:00", end: "18:00" }, // Exemplo inicial
  ],
};

export function BarberPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [currentBarberForm, setCurrentBarberForm] = useState<Partial<Barber>>(initialBarberFormState);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [barberToDelete, setBarberToDelete] = useState<Barber | null>(null);
  const [setupLink, setSetupLink] = useState("");

  const fetchBarbers = async () => {
    if (!barbershopId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/barbers`);
      setBarbers(response.data);
      console.log(`response.data`, response.data);
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
        const uploadResponse = await apiClient.post(`${API_BASE_URL}/api/upload/barber-profile`, imageUploadData, {
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
    const barberDataPayload: Partial<BarberFormData> = {
      name: currentBarberForm.name,
      image: finalImageUrl, // Usa a URL da imagem (nova ou existente)
      availability: validAvailability,
      commission: Number(currentBarberForm.commission),
    };

    if (dialogMode === "add") {
      if (!currentBarberForm.email) {
        setError("O email de login é obrigatório para novos funcionários.");
        return;
      }
      barberDataPayload.email = currentBarberForm.email;
    }

    // 3. Cria ou atualiza o barbeiro
    try {
      if (dialogMode === "add") {
        const response = await apiClient.post(`${API_BASE_URL}/barbershops/${barbershopId}/barbers`, barberDataPayload);
        setSetupLink(response.data.setupLink);
      } else if (currentBarberForm._id) {
        await apiClient.put(`${API_BASE_URL}/barbershops/${barbershopId}/barbers/${currentBarberForm._id}`, barberDataPayload);
        setIsDialogOpen(false);
      }
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(setupLink);
    toast("Link criado com sucesso", {
      description: "Envie para seu barbeiro criar uma senha e acessar os seus horários agendados. valido até 72 horas.",
    });
  };

  const closeDialogAndReset = () => {
    setIsDialogOpen(false);
    setSetupLink("");
  };

  if (isLoading && barbers.length === 0) return <p className="text-center p-10">Carregando funcionários...</p>;

  return (
    <Card>
      <CardHeader className="flex flex-col items-start md:items-center justify-between md:flex-row">
        <div className="mb-4">
          <CardTitle>Gerenciar Funcionários (Barbeiros)</CardTitle>
        </div>
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
        <Table>
          <TableCaption>{barbers.length === 0 && !isLoading ? "Nenhum funcionário cadastrado." : "Lista dos seus funcionários."}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Nome</TableHead>
              <TableHead>Email de Login</TableHead>
              <TableHead>Disponibilidade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {barbers.map((barber) => (
              <TableRow key={barber._id}>
                <TableCell className="font-medium flex items-center">
                  {barber.image ? (
                    <img src={barber.image} alt={barber.name} className="h-10 w-10 rounded-full object-cover mr-4" />
                  ) : (
                    <UserCircle className="h-10 w-10 text-gray-300 mr-4" />
                  )}
                  {barber.name}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{barber.email || "Não definido"}</TableCell>
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
        <DialogContent className=" max-h-[90vh] flex flex-col">
          {!setupLink ? (
            <>
              <DialogHeader>
                <DialogTitle>{dialogMode === "add" ? "Adicionar Novo Funcionário" : "Editar Funcionário"}</DialogTitle>
                <DialogDescription>
                  {" "}
                  {dialogMode === "add"
                    ? "Preencha os dados e crie as credenciais de login para o profissional."
                    : "Edite os dados de perfil e disponibilidade do profissional."}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSaveBarber} className="flex-grow overflow-y-auto pr-6 -mr-4 md:-mr-6">
                <div className="grid gap-6 py-4">
                  <div className="space-y-1.5">
                    <Label>Foto de Perfil</Label>
                    <ImageUploader
                      initialImageUrl={currentBarberForm.image || null}
                      onFileSelect={(file) => setProfileImageFile(file)}
                      aspectRatio="square"
                      label=""
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nome do Funcionário</Label>
                    <Input id="name" name="name" value={currentBarberForm.name || ""} onChange={handleFormInputChange} required />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="commission" className="text-right">
                      Comissão (%)
                    </Label>
                    <Input
                      id="commission"
                      name="commission"
                      type="number"
                      min="0"
                      max="100"
                      value={currentBarberForm.commission || ""} // Use o valor atual ou string vazia
                      onChange={handleFormInputChange}
                      placeholder="Ex: 40"
                      className="col-span-3"
                    />
                  </div>

                  {dialogMode === "add" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email de Login</Label>
                      <Input id="email" name="email" type="email" value={currentBarberForm.email || ""} onChange={handleFormInputChange} required />
                      <p className="text-xs text-muted-foreground">O convite para definir a senha será associado a este email.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Horários de Disponibilidade</Label>

                    {/* Container para a lista de horários */}
                    <div className="space-y-3">
                      {(currentBarberForm.availability || []).map((slot, index) => (
                        <div
                          key={index}
                          // ✅ LÓGICA DE RESPONSIVIDADE AQUI
                          className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] sm:items-end gap-2 p-3 border rounded-md"
                        >
                          {/* O Select do dia ocupará a primeira coluna */}
                          <div className="sm:col-span-1">
                            <Label htmlFor={`day-${index}`} className="text-xs text-muted-foreground">
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

                          {/* Container para os inputs de hora e o botão de deletar */}
                          <div className="col-span-1 sm:col-span-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                            <div>
                              <Label htmlFor={`start-${index}`} className="text-xs text-muted-foreground">
                                Início
                              </Label>
                              <Input
                                id={`start-${index}`}
                                type="time"
                                value={slot.start}
                                onChange={(e) => handleAvailabilityChange(index, "start", e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`end-${index}`} className="text-xs text-muted-foreground">
                                Fim
                              </Label>
                              <Input
                                id={`end-${index}`}
                                type="time"
                                value={slot.end}
                                onChange={(e) => handleAvailabilityChange(index, "end", e.target.value)}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAvailabilitySlot(index)}
                              aria-label="Remover horário"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button type="button" variant="outline" size="sm" onClick={addAvailabilitySlot} className="mt-2">
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Horário
                    </Button>
                  </div>
                </div>

                {/* Footer do Dialog fica fora da área de scroll */}
                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                  {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button type="submit">{dialogMode === "add" ? "Adicionar Funcionário" : "Salvar Alterações"}</Button>
                </DialogFooter>
              </form>
            </>
          ) : (
            <div>
              <DialogHeader>
                <DialogTitle>Funcionário Criado com Sucesso!</DialogTitle>
                <DialogDescription>
                  Copie e envie este link para o funcionário. Ele poderá definir sua própria senha e acessar o sistema. Este link é de uso único e
                  expira em 72 horas.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center space-x-2 my-4">
                <Input value={setupLink} readOnly />
                <Button type="button" size="icon" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button type="button" onClick={closeDialogAndReset}>
                  Concluído
                </Button>
              </DialogFooter>
            </div>
          )}
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
