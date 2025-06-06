// admin-frontend/src/pages/admin/DashboardPage.tsx

import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Scissors, CalendarDays, DollarSign, TrendingUp } from "lucide-react"; // Adicionei TrendingUp
import { Badge } from "@/components/ui/badge";
import apiClient from "@/services/api";
import { API_BASE_URL } from "@/config/BackendUrl";

// Contexto e Tipos (como antes)
interface AdminOutletContext {
  barbershopId: string;
  barbershopName: string;
}
interface MonthlyBookingStat {
  month: string;
  totalBookings: number;
}
interface BookingsByBarberStat {
  barberId: string;
  barberName: string;
  count: number;
}
interface PopularServiceStat {
  serviceId: string;
  serviceName: string;
  count: number;
}
interface OverviewStats {
  currentMonthBookings: number;
  totalRevenueCurrentMonth: number;
}

interface DashboardData {
  overview?: OverviewStats;
  monthlyBookings?: MonthlyBookingStat[];
  bookingsByBarber?: BookingsByBarberStat[];
  popularServices?: PopularServiceStat[];
}

export function DashboardPage() {
  const { barbershopId, barbershopName } = useOutletContext<AdminOutletContext>();

  const [dashboardData, setDashboardData] = useState<DashboardData>({}); // Inicializa como objeto vazio
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedPeriodBarber, setSelectedPeriodBarber] = useState<string>("currentMonth");
  const [selectedPeriodService, setSelectedPeriodService] = useState<string>("currentMonth");

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2];
  }, []);

  useEffect(() => {
    if (!barbershopId) {
      setIsLoading(false);
      setError("ID da barbearia não disponível.");
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // ✅ CHAMADAS REAIS PARA OS ENDPOINTS DO BACKEND ✅
        const overviewPromise = apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/analytics/overview`);
        const monthlyBookingsPromise = apiClient.get(`${API_BASE_URL}/barbershops/${barbershopId}/analytics/monthly-bookings?year=${selectedYear}`);
        const bookingsByBarberPromise = apiClient.get(
          `${API_BASE_URL}/barbershops/${barbershopId}/analytics/bookings-by-barber?period=${selectedPeriodBarber}`
        );
        const popularServicesPromise = apiClient.get(
          `${API_BASE_URL}/barbershops/${barbershopId}/analytics/popular-services?period=${selectedPeriodService}&limit=5`
        );

        const [overviewRes, monthlyRes, byBarberRes, popularServicesRes] = await Promise.all([
          overviewPromise,
          monthlyBookingsPromise,
          bookingsByBarberPromise,
          popularServicesPromise,
        ]);

        setDashboardData({
          overview: overviewRes.data,
          monthlyBookings: monthlyRes.data,
          bookingsByBarber: byBarberRes.data,
          popularServices: popularServicesRes.data,
        });
      } catch (err: any) {
        console.error("Erro ao buscar dados do dashboard:", err);
        setError(err.response?.data?.error || "Não foi possível carregar os dados do dashboard.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [barbershopId, selectedYear, selectedPeriodBarber, selectedPeriodService]);

  if (isLoading) return <p className="text-center p-10">Carregando dashboard...</p>;
  // Não mostrar erro se alguns dados já foram carregados, talvez apenas para a seção específica
  // if (error && !dashboardData.overview) return <p className="text-center p-10 text-red-500">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard: {barbershopName}</h1>
        {/* Adicionar DateRangePicker global aqui se desejar */}
      </div>
      {error && <p className="text-center p-3 text-red-600 bg-red-50 rounded-md">{error}</p>}

      {/* Cards de Visão Geral */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos (Mês Atual)</CardTitle>
            <CalendarDays className="h-5 w-5 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboardData.overview?.currentMonthBookings ?? <span className="text-muted-foreground text-lg">--</span>}
            </div>
            {/* <p className="text-xs text-muted-foreground">+20.1% do mês passado</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita (Mês Atual)</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R${" "}
              {dashboardData.overview?.totalRevenueCurrentMonth?.toFixed(2).replace(".", ",") ?? (
                <span className="text-muted-foreground text-lg">--,--</span>
              )}
            </div>
            {/* <p className="text-xs text-muted-foreground">+10% do mês passado</p> */}
          </CardContent>
        </Card>
        {/* Você pode adicionar mais cards, por exemplo, total de clientes, média de avaliação etc. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profissionais Ativos</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboardData.bookingsByBarber?.length ?? <span className="text-muted-foreground text-lg">--</span>}
            </div>
            {/* <p className="text-xs text-muted-foreground">Total de profissionais</p> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Populares (Top)</CardTitle>
            <Scissors className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {dashboardData.popularServices && dashboardData.popularServices.length > 0 ? (
                dashboardData.popularServices[0].serviceName
              ) : (
                <span className="text-muted-foreground text-base">--</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.popularServices && dashboardData.popularServices.length > 0
                ? `${dashboardData.popularServices[0].count} agendamentos`
                : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Agendamentos por Mês</CardTitle>
            <div className="w-36">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="yearFilterMonthly">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] w-full pl-2">
            {dashboardData.monthlyBookings && dashboardData.monthlyBookings.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.monthlyBookings}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "white", borderRadius: "0.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}
                    labelStyle={{ fontWeight: "bold", color: "#333" }}
                  />
                  <Bar dataKey="totalBookings" fill="var(--theme-primary, #ef4444)" name="Agendamentos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground h-full flex items-center justify-center">
                Sem dados de agendamentos para o ano selecionado.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Atendimentos por Profissional</CardTitle>
            <Select value={selectedPeriodBarber} onValueChange={setSelectedPeriodBarber}>
              <SelectTrigger id="periodBarberFilter" className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="currentMonth">Este Mês</SelectItem>
                <SelectItem value="lastMonth">Mês Passado</SelectItem>
                <SelectItem value="last3Months">Últimos 3 Meses</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-[350px] w-full pr-2">
            {dashboardData.bookingsByBarber && dashboardData.bookingsByBarber.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.bookingsByBarber} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="barberName" type="category" fontSize={12} width={100} tickLine={false} axisLine={false} className="truncate" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "white", borderRadius: "0.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}
                    labelStyle={{ fontWeight: "bold", color: "#333" }}
                  />
                  <Bar dataKey="count" fill="var(--theme-secondary, #3b82f6)" name="Agendamentos" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground h-full flex items-center justify-center">
                Sem dados de atendimentos para o período selecionado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Serviços Mais Populares</CardTitle>
          <Select value={selectedPeriodService} onValueChange={setSelectedPeriodService}>
            <SelectTrigger id="periodServiceFilter" className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="currentMonth">Este Mês</SelectItem>
              <SelectItem value="lastMonth">Mês Passado</SelectItem>
              <SelectItem value="last3Months">Últimos 3 Meses</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {dashboardData.popularServices && dashboardData.popularServices.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.popularServices.map((service, index) => (
                <div key={service.serviceId || index} className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-muted-foreground mr-3" />
                  <span className="text-sm font-medium flex-1">{service.serviceName}</span>
                  <Badge variant="outline" className="font-semibold">
                    {service.count} agendamentos
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados de serviços populares para o período selecionado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
