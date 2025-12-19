import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SubscriptionSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 md:p-4 text-white selection:bg-teal-800 selection:text-teal-100">
      <Card className="w-full h-full max-w-md bg-white/95 text-slate-800 shadow-2xl rounded-xl overflow-hidden animate-fadeInUp border-0">
        <CardHeader className="items-center text-center p-6 bg-green-500">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 52 52">
              <circle
                className="stroke-current text-green-100/50"
                cx="26"
                cy="26"
                r="25"
                fill="none"
                strokeWidth="2"
              />
              <path
                className="stroke-current text-white animate-drawCheck"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
                style={{ strokeDasharray: 50, strokeDashoffset: 50 }}
              />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold text-white">Assinatura Confirmada!</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-lg text-gray-700">
            Seu plano foi ativado com sucesso. Agora você pode aproveitar todos os benefícios!
          </p>
          <p className="text-sm text-gray-500">
            Você pode gerenciar sua assinatura na página "Meus Agendamentos".
          </p>
        </CardContent>
        <CardFooter className="p-6 pt-0">
          <Button asChild className="w-full bg-green-500 hover:bg-green-600">
            <Link to="/meus-agendamentos">Ver Minhas Assinaturas</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
