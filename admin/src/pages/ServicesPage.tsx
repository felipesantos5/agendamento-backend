import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useOutletContext } from "react-router-dom";

// Importações de componentes ShadCN/UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { PlusCircle, Edit2, Trash2, Package } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import apiClient from "@/services/api";
import { API_BASE_URL } from "@/config/BackendUrl";
import { useResponsive } from "@/hooks/useResponsive";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PriceFormater } from "@/helper/priceFormater";

// Contexto do AdminLayout (para obter barbershopId)
interface AdminOutletContext {
  barbershopId: string;
  barbershopName: string;
}

interface Plan {
  _id: string;
  name: string;
}

// Tipo para os dados do serviço (frontend) - ATUALIZADO
interface Service {
  _id: string;
  name: string;
  price: number;
  duration: number; // em minutos
  isPlanService?: boolean; // <-- NOVO
  plan?: Plan | null; // <-- NOVO (pode vir populado)
}

// Tipo para o formulário de serviço (sem _id ao criar) - ATUALIZADO
type ServiceFormData = {
  _id?: string;
  name: string;
  price: number;
  duration: number;
  isPlanService?: boolean; // <-- NOVO
  plan?: string | null; // <-- NOVO (para armazenar o ID)
};

// ATUALIZADO
const initialServiceFormState: ServiceFormData = {
  name: "",
  price: 0,
  duration: 30,
  isPlanService: false,
  plan: null,
};

export function ServicesPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();

  const [services, setServices] = useState<Service[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]); // <-- NOVO ESTADO
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [currentServiceForm, setCurrentServiceForm] = useState<Partial<ServiceFormData>>(initialServiceFormState);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  const { isMobile } = useResponsive();

  // ATUALIZADO: Busca serviços e planos
  const fetchPageData = async () => {
    if (!barbershopId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [servicesRes, plansRes] = await Promise.all([
        apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/services`),
        apiClient.get(`${API_BASE_URL}/api/barbershops/${barbershopId}/plans`), // <-- NOVO
      ]);
      setServices(servicesRes.data);
      setPlans(plansRes.data); // <-- NOVO
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setError("Não foi possível carregar os dados.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
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

  // ATUALIZADO: para lidar com o campo 'plan'
  const openEditDialog = (service: Service) => {
    setDialogMode("edit");
    setCurrentServiceForm({
      ...service,
      plan: service.plan ? service.plan._id : null, // Armazena apenas o ID no formulário
    });
    setIsDialogOpen(true);
    setError(null);
  };

  // ATUALIZADO: Lógica de salvar
  const handleSaveService = async (e: FormEvent) => {
    e.preventDefault();
    if (!barbershopId) {
      setError("ID da barbearia não encontrado.");
      return;
    }
    setError(null);

    // Validação
    if (currentServiceForm.isPlanService && !currentServiceForm.plan) {
      setError("Para um serviço de plano, você deve selecionar o plano correspondente.");
      return;
    }
    if (currentServiceForm.isPlanService && Number(currentServiceForm.price) > 0) {
      setError("Serviços de plano devem ter o preço R$ 0,00.");
      return;
    }

    const serviceDataPayload = {
      name: currentServiceForm.name,
      price: Number(currentServiceForm.price),
      duration: Number(currentServiceForm.duration),
      isPlanService: currentServiceForm.isPlanService, // <-- NOVO
      plan: currentServiceForm.isPlanService ? currentServiceForm.plan : null, // <-- NOVO
    };

    try {
      if (dialogMode === "add") {
        await apiClient.post(`${API_BASE_URL}/barbershops/${barbershopId}/services`, serviceDataPayload);
      } else if (currentServiceForm._id) {
        await apiClient.put(`${API_BASE_URL}/barbershops/${barbershopId}/services/${currentServiceForm._id}`, serviceDataPayload);
      }
      setIsDialogOpen(false);
      fetchPageData(); // Re-busca a lista de serviços para atualizar a tabela
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
      setServiceToDelete(null);
      fetchPageData();
    } catch (err: any) {
      console.error("Erro ao deletar serviço:", err);
      setError(err.response?.data?.error || "Falha ao deletar o serviço.");
      setServiceToDelete(null);
    }
  };

  // Handler para o Switch de Serviço de Plano
  const handlePlanServiceToggle = (isChecked: boolean) => {
    setCurrentServiceForm((prev) => ({
      ...prev,
      isPlanService: isChecked,
      price: isChecked ? 0 : prev.price, // Força preço 0 se for de plano
      plan: isChecked ? prev.plan : null, // Limpa plano se não for de plano
    }));
  };

  if (isLoading && services.length === 0) return <p className="text-center p-10">Carregando serviços...</p>;

  return (
    <Card>
      <CardHeader className="flex flex-col items-start md:items-center md:flex-row justify-between">
        <div className="mb-4">
          <CardTitle>Gerenciar Serviços</CardTitle>
        </div>
        {!isMobile && (
          <Button onClick={openAddDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
        {/* TABELA ATUALIZADA */}
        <Table className="mb-0">
          <TableCaption>{services.length === 0 && "Nenhum serviço cadastrado ainda."}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Preço (R$)</TableHead>
              <TableHead className="text-center">Duração (min)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service._id}>
                <TableCell className="font-medium">{service.name}</TableCell>
                {/* CÉLULA DE PREÇO ATUALIZADA */}
                <TableCell className="text-right">
                  {service.isPlanService && service.plan ? (
                    <Badge variant="outline" className="flex items-center gap-1.5">
                      <Package className="h-3 w-3" />
                      {/* @ts-ignore */}
                      {service.plan.name}
                    </Badge>
                  ) : (
                    PriceFormater(service.price)
                  )}
                </TableCell>
                <TableCell className="text-center">{service.duration}</TableCell>
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
                    {/* ... (AlertDialogContent permanece o mesmo) ... */}
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Deleção</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja deletar o serviço "{serviceToDelete?.name}"? Esta ação não pode ser desfeita.
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
                </TableCell>
              </TableRow>
            ))}
            {isMobile && (
              <TableRow>
                <TableCell colSpan={4} className="text-center pt-4 pb-0">
                  <Button onClick={openAddDialog}>Adicionar</Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* MODAL ATUALIZADO */}
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
              <div className="flex items-center gap-4">
                <Label htmlFor="name" className="text-center min-w-[55px] max-w-[55px] ">
                  Nome
                </Label>
                <Input id="name" name="name" value={currentServiceForm.name || ""} onChange={handleFormInputChange} className="col-span-3" required />
              </div>

              {/* NOVO SWITCH: SERVIÇO DE PLANO */}
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="isPlanService">Serviço de Plano?</Label>
                  <p className="text-xs text-muted-foreground">Marque se este serviço consome um crédito de um plano.</p>
                </div>
                <Switch id="isPlanService" checked={currentServiceForm.isPlanService} onCheckedChange={handlePlanServiceToggle} />
              </div>

              {/* NOVO SELECT: VINCULAR PLANO (CONDICIONAL) */}
              {currentServiceForm.isPlanService && (
                <div className="flex items-center gap-4">
                  <Label htmlFor="plan" className="text-center min-w-[55px] max-w-[55px]">
                    Plano
                  </Label>
                  <Select
                    value={currentServiceForm.plan || ""}
                    onValueChange={(value) => setCurrentServiceForm((prev) => ({ ...prev, plan: value }))}
                  >
                    <SelectTrigger id="plan" className="col-span-3">
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.length > 0 ? (
                        plans.map((plan) => (
                          <SelectItem key={plan._id} value={plan._id}>
                            {plan.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">Nenhum plano cadastrado.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* INPUT DE PREÇO ATUALIZADO (DISABLED) */}
              <div className="flex items-center gap-4">
                <Label htmlFor="price" className="text-center min-w-[55px] max-w-[55px]">
                  Preço (R$)
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={currentServiceForm.price}
                  onChange={handleFormInputChange}
                  className="col-span-3"
                  required
                  disabled={currentServiceForm.isPlanService}
                  readOnly={currentServiceForm.isPlanService}
                />
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="duration" className="text-center min-w-[55px] max-w-[55px]">
                  Duração (minutos)
                </Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  step="5"
                  value={currentServiceForm.duration}
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

      {/* AlertDialog (sem mudanças) */}
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
