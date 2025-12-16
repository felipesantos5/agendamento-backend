import { useEffect, useState } from "react";
import apiClient from "@/services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceFormater } from "@/helper/priceFormater";

interface Plan {
  _id: string;
  name: string;
  description?: string;
  price: number;
}

interface PlansListProps {
  barbershopId: string;
}

export function PlansList({ barbershopId }: PlansListProps) {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    if (!barbershopId) return;

    const fetchPlans = async () => {
      try {
        const response = await apiClient.get(`/api/barbershops/${barbershopId}/plans`);
        setPlans(response.data);
      } catch (error) {
        console.error("Erro ao carregar planos:", error);
        toast.error("Não foi possível carregar os planos.");
      } finally {
      }
    };

    fetchPlans();
  }, [barbershopId]);

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
            <Button className="w-full bg-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/90">Assinar Plano</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
