import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useOutletContext } from "react-router-dom";

// Importações de componentes ShadCN/UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose, // Para fechar o Dialog programaticamente se necessário
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Edit2, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import apiClient from "@/services/api";
import { API_BASE_URL } from "@/config/BackendUrl";

// Contexto do AdminLayout (para obter barbershopId)
interface AdminOutletContext {
  barbershopId: string;
  barbershopName: string;
}

// Tipo para os dados do serviço (frontend)
interface Service {
  _id: string;
  name: string;
  price: number;
  duration: number; // em minutos
}

// Tipo para o formulário de serviço (sem _id ao criar)
type ServiceFormData = Omit<Service, "_id">;

const initialServiceFormState: ServiceFormData = {
  name: "",
  price: 0,
  duration: 30, // Duração padrão de 30 minutos
};

export function ServicesPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [currentServiceForm, setCurrentServiceForm] = useState<Partial<Service>>(initialServiceFormState);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  const fetchServices = async () => {
    if (!barbershopId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/services`);
      setServices(response.data);
    } catch (err) {
      console.error("Erro ao buscar serviços:", err);
      setError("Não foi possível carregar os serviços.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [barbershopId]);

  const handleFormInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentServiceForm((prev) => ({
      ...prev,
      [name]: name === "price" || name === "duration" ? parseFloat(value) || 0 : value,
    }));
  };

  const openAddDialog = () => {
    setDialogMode("add");
    setCurrentServiceForm(initialServiceFormState);
    setIsDialogOpen(true);
    setError(null);
  };

  const openEditDialog = (service: Service) => {
    setDialogMode("edit");
    setCurrentServiceForm(service); // Carrega o serviço existente no formulário
    setIsDialogOpen(true);
    setError(null);
  };

  const handleSaveService = async (e: FormEvent) => {
    e.preventDefault();
    if (!barbershopId) {
      setError("ID da barbearia não encontrado.");
      return;
    }
    setError(null); // Limpa erros anteriores

    const serviceDataPayload = {
      name: currentServiceForm.name,
      price: Number(currentServiceForm.price),
      duration: Number(currentServiceForm.duration),
    };

    try {
      if (dialogMode === "add") {
        await apiClient.post(`${API_BASE_URL}/barbershops/${barbershopId}/services`, serviceDataPayload);
      } else if (currentServiceForm._id) {
        // Certifique-se que seu backend espera o payload sem o barbershopId aqui, pois ele já está na URL
        await apiClient.put(`${API_BASE_URL}/barbershops/${barbershopId}/services/${currentServiceForm._id}`, serviceDataPayload);
      }
      setIsDialogOpen(false);
      fetchServices(); // Re-busca a lista de serviços para atualizar a tabela
    } catch (err: any) {
      console.error("Erro ao salvar serviço:", err);
      setError(err.response?.data?.error || "Falha ao salvar o serviço.");
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete || !barbershopId) return;
    setError(null);
    try {
      await apiClient.delete(`${API_BASE_URL}/barbershops/${barbershopId}/services/${serviceToDelete._id}`);
      setServiceToDelete(null); // Fecha o AlertDialog de confirmação
      fetchServices(); // Re-busca a lista
    } catch (err: any) {
      console.error("Erro ao deletar serviço:", err);
      setError(err.response?.data?.error || "Falha ao deletar o serviço.");
      setServiceToDelete(null);
    }
  };

  if (isLoading && services.length === 0) return <p className="text-center p-10">Carregando serviços...</p>;

  return (
    <Card>
      <CardHeader className="flex flex-col items-start md:items-center md:flex-row justify-between">
        <div className="mb-4">
          <CardTitle>Gerenciar Serviços</CardTitle>
          {/* <p className="text-sm text-muted-foreground">Adicione, edite ou remova os serviços oferecidos.</p> */}
        </div>
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
        <Table>
          <TableCaption>{services.length === 0 && !isLoading ? "Nenhum serviço cadastrado ainda." : "Lista dos seus serviços atuais."}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Preço (R$)</TableHead>
              <TableHead className="text-right">Duração (min)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service._id}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell className="text-right">{service.price.toFixed(2)}</TableCell>
                <TableCell className="text-right">{service.duration}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(service)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" onClick={() => setServiceToDelete(service)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Dialog para Adicionar/Editar Serviço */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveService}>
            <DialogHeader>
              <DialogTitle>{dialogMode === "add" ? "Adicionar Novo Serviço" : "Editar Serviço"}</DialogTitle>
              <DialogDescription>
                {dialogMode === "add" ? "Preencha os detalhes do novo serviço." : "Modifique os detalhes do serviço existente."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input id="name" name="name" value={currentServiceForm.name || ""} onChange={handleFormInputChange} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Preço (R$)
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={currentServiceForm.price || 0}
                  onChange={handleFormInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">
                  Duração (min)
                </Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  step="5"
                  value={currentServiceForm.duration || 30}
                  onChange={handleFormInputChange}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit">{dialogMode === "add" ? "Adicionar" : "Salvar Alterações"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para Confirmação de Deleção */}
      <AlertDialog open={!!serviceToDelete} onOpenChange={(open) => !open && setServiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Deleção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o serviço "{serviceToDelete?.name}
              "? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setServiceToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService} className="bg-red-600 hover:bg-red-700">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
