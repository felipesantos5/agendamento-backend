import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign, Users, Scissors } from "lucide-react";
import apiClient from "@/services/api";
import { API_BASE_URL } from "@/config/BackendUrl";
import { PriceFormater } from "@/helper/priceFormater";

interface AdminOutletContext {
  barbershopId: string;
}

// Nova interface para o tipo Barber
interface Barber {
  _id: string;
  name: string;
}

interface Commission {
  _id: string;
  barberName: string;
  barberImage?: string;
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  services: {
    serviceName: string;
    servicePrice: number;
    date: string;
  }[];
}

interface CommissionSummary {
  _id: {
    month: number;
    year: number;
  };
  totalRevenue: number;
  totalCommissions: number;
  totalServices: number;
}

export default function CommissionsPage() {
  const { barbershopId } = useOutletContext<AdminOutletContext>();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Estados para os filtros ---
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  // --- NOVO: Estado para a lista de barbeiros e para o barbeiro selecionado ---
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>("all"); // "all" para todos

  useEffect(() => {
    if (!barbershopId) return;

    // --- NOVO: Função para buscar os barbeiros da barbearia ---
    const fetchBarbers = async () => {
      try {
        const response = await apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/barbers`);
        setBarbers(response.data);
      } catch (err) {
        console.error("Falha ao buscar barbeiros:", err);
        // Opcional: tratar o erro na UI
      }
    };

    const fetchCommissions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Modificado: Adiciona o barberId aos parâmetros se um for selecionado
        const params: { month: string; year: string; barberId?: string } = {
          month: selectedMonth,
          year: selectedYear,
        };

        if (selectedBarber !== "all") {
          params.barberId = selectedBarber;
        }

        const response = await apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/commissions`, { params });
        setCommissions(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to fetch commissions.");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSummary = async () => {
      try {
        const response = await apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/commissions/summary`, {
          params: { year: selectedYear },
        });
        setSummary(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to fetch commissions summary.");
      }
    };

    fetchCommissions();
    fetchSummary();
    fetchBarbers(); // Chama a nova função ao carregar

    // Modificado: Adicionado `selectedBarber` ao array de dependências
  }, [barbershopId, selectedMonth, selectedYear, selectedBarber]);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Calcula os totais com base nos dados de comissão filtrados
  const totalRevenueFiltered = commissions.reduce((acc, c) => acc + c.totalRevenue, 0);
  const totalCommissionFiltered = commissions.reduce((acc, c) => acc + c.totalCommission, 0);
  const totalServicesFiltered = commissions.reduce((acc, c) => acc + c.totalServices, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Comissões</h1>
        <div className="flex flex-wrap gap-2">
          {/* --- NOVO: Select para filtrar por barbeiro --- */}
          <Select value={selectedBarber} onValueChange={setSelectedBarber}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por barbeiro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Barbeiros</SelectItem>
              {barbers.map((barber) => (
                <SelectItem key={barber._id} value={barber._id}>
                  {barber.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((month, index) => (
                <SelectItem key={month} value={(index + 1).toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {[...Array(5)].map((_, i) => (
                <SelectItem key={i} value={(new Date().getFullYear() - i).toString()}>
                  {new Date().getFullYear() - i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <p>Carregando...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!isLoading && !error && (
        <>
          {/* Modificado: Os cards agora mostram os totais do período e filtro selecionados */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita no Período</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{PriceFormater(totalRevenueFiltered)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comissões no Período</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{PriceFormater(totalCommissionFiltered)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Serviços no Período</CardTitle>
                <Scissors className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalServicesFiltered}</div>
              </CardContent>
            </Card>
          </div>
          {/* Oculta o resumo anual se um barbeiro específico estiver selecionado para evitar confusão */}
          {selectedBarber === "all" && (
            <Card>
              <CardHeader>
                <CardTitle>Resumo Mensal de Comissões (Ano Inteiro)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.month" tickFormatter={(tick) => monthNames[tick - 1]} />
                    <YAxis tickFormatter={(value: any) => PriceFormater(value)} />
                    <Tooltip formatter={(value: any) => PriceFormater(value)} />
                    <Bar dataKey="totalCommissions" fill="#8884d8" name="Comissão" />
                    <Bar dataKey="totalRevenue" fill="#82ca9d" name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Comissões por Barbeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barbeiro</TableHead>
                    <TableHead className="text-center">Total de Serviços</TableHead>
                    <TableHead className="text-right">Receita Gerada</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission._id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-9 w-9 mr-4">
                            <AvatarImage src={commission.barberImage} alt="Avatar" />
                            <AvatarFallback>{commission.barberName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{commission.barberName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{commission.totalServices}</TableCell>
                      <TableCell className="text-right">{PriceFormater(commission.totalRevenue)}</TableCell>
                      <TableCell className="text-right font-semibold">{PriceFormater(commission.totalCommission)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableCaption>
                  {commissions.length === 0 ? "Nenhuma comissão encontrada para este período." : "Detalhes das comissões para o período selecionado."}
                </TableCaption>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
