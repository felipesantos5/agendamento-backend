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
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Your Details</h2>
        <p className="mt-1 text-sm text-gray-500">Please provide your contact information</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name
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
            Email Address
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
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => updateFormData({ phone: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
            placeholder="(123) 456-7890"
            required
          />
        </div>
      </div>

      <div className="rounded-md bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-900">Appointment Summary</h3>
        <div className="mt-2 space-y-2 text-sm text-gray-600">
          {formData.service && (
            <div className="flex justify-between">
              <span>Service:</span>
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
              <span>Date:</span>
              <span className="font-medium">
                {new Date(formData.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}

          {formData.time && (
            <div className="flex justify-between">
              <span>Time:</span>
              <span className="font-medium">{formData.time}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
