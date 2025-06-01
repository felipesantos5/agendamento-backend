import { PhoneFormat } from "@/helper/phoneFormater"

interface PersonalInfoProps {
  formData: {
    name: string
    email: string
    phone: string
    [key: string]: string
  }
  updateFormData: (data: Partial<{ name: string; email: string; phone: string }>) => void
}

export default function PersonalInfo({ formData, updateFormData }: PersonalInfoProps) {
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Pega o valor do input (que pode estar formatado).
    const inputValue = e.target.value;

    // 2. Remove todos os caracteres não numéricos.
    const digitsOnly = inputValue.replace(/\D/g, "");

    // 3. Atualiza o estado `formData.phone` apenas com os dígitos.
    updateFormData({ phone: digitsOnly });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Dados pessoais</h2>
        <p className="mt-1 text-sm text-gray-500">Por favor informe seus dados de contato</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nome Completo
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
            placeholder="John Doe"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => updateFormData({ email: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
            placeholder="john@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Celular
          </label>
          <input
            type="tel"
            id="phone"
            value={PhoneFormat(formData.phone)}
            onChange={handlePhoneChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
            placeholder="(123) 456-7890"
            required
          />
        </div>
      </div>

      <div className="rounded-md bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-900">Resumo do agendamento</h3>
        <div className="mt-2 space-y-2 text-sm text-gray-600">
          {formData.service && (
            <div className="flex justify-between">
              <span>Serviço:</span>
              <span className="font-medium">
                {formData.service === "haircut" && "Haircut"}
                {formData.service === "color" && "Hair Coloring"}
                {formData.service === "highlights" && "Highlights"}
                {formData.service === "blowout" && "Blowout"}
              </span>
            </div>
          )}

          {formData.attendant && (
            <div className="flex justify-between">
              <span>Stylist:</span>
              <span className="font-medium">
                {formData.attendant === "emma" && "Emma Wilson"}
                {formData.attendant === "james" && "James Taylor"}
                {formData.attendant === "sophia" && "Sophia Garcia"}
                {formData.attendant === "michael" && "Michael Chen"}
              </span>
            </div>
          )}

          {formData.date && (
            <div className="flex justify-between">
              <span>Data:</span>
              <span className="font-medium">
                {new Date(formData.date).toLocaleDateString("pt-br", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          )}

          {formData.time && (
            <div className="flex justify-between">
              <span>Horario:</span>
              <span className="font-medium">{formData.time} horas</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
