import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceFormater } from "@/helper/priceFormater";
import { Spinner } from "@/components/ui/spinnerLoading";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { Loader2 } from "lucide-react";

interface Plan {
  _id: string;
  name: string;
  description?: string;
  price: number;
}

interface PlansListProps {
  barbershopId: string;
  barbershopSlug: string;
}

export function PlansList({ barbershopId, barbershopSlug }: PlansListProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null);

  const { isAuthenticated } = useCustomerAuth();
  const navigate = useNavigate();

  const handleSubscribe = async (planId: string) => {
    // Se não está logado, salvar planId e redirecionar para login
    if (!isAuthenticated) {
      sessionStorage.setItem(
        "pendingSubscription",
        JSON.stringify({
          planId,
          barbershopId,
          barbershopSlug,
        })
      );
      navigate("/entrar", { state: { from: `/${barbershopSlug}` } });
      return;
    }

    // Se está logado, criar assinatura
    setIsSubscribing(planId);
    try {
      const response = await apiClient.post(`/api/barbershops/${barbershopId}/subscriptions/create-preapproval`, {
        planId,
      });

      // Redirecionar para o checkout do Mercado Pago
      window.location.href = response.data.init_point;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao iniciar assinatura.";
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError.response?.data?.error || errorMessage);
    } finally {
      setIsSubscribing(null);
    }
  };

  useEffect(() => {
    if (!barbershopId) return;

    const fetchPlans = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/api/barbershops/${barbershopId}/plans`);
        setPlans(response.data);
      } catch (error) {
        console.error("Erro ao carregar planos:", error);
        toast.error("Não foi possível carregar os planos.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [barbershopId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (plans.length === 0) {
    return <p className="text-center text-muted-foreground pb-8">Nenhum plano disponível no momento.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan, index) => (
        <Card key={plan._id} className={`justify-between py-8 ${index === 1 ? "border-2 border-[var(--loja-theme-color)] shadow-lg" : ""}`}>
          <CardHeader>
            <CardTitle className="text-xl text-center">{plan.name}</CardTitle>
            {plan.description && <CardDescription className="text-center">{plan.description}</CardDescription>}
          </CardHeader>
          <CardFooter className="flex-col gap-3">
            <div className="text-4xl font-bold">
              {PriceFormater(plan.price)}
              <span className="text-lg font-normal text-muted-foreground">/mês</span>
            </div>
            <Button
              onClick={() => handleSubscribe(plan._id)}
              disabled={isSubscribing === plan._id}
              className="w-full bg-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/90"
            >
              {isSubscribing === plan._id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assinar Plano
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
