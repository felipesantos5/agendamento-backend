import { Card, CardHeader, CardTitle } from "@/components/ui/card"; //

export function PaymentSucessPage() {
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
          <CardTitle className="text-3xl font-bold text-white">
            Agendamento e Pagamento Confirmado com sucesso!
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
