import axios from "axios"
import { useEffect, useState } from "react"
import { Card } from "../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";

interface services {
  _id: string;
  name: string;
  price: number;
  duration: number;
}

interface barbers {
  _id: string;
  name: string;
  availability: [
    {
      day: string,
      start: string,
      end: string,
      _id: string
    },
  ]
}

interface ServiceSelectionProps {
  selectedService: string;
  selectedBarber: string;
  onSelectService: (id: string) => void;
  onSelectBarber: (id: string) => void;
  id: string | undefined
}

export default function ServiceSelection({
  selectedService,
  selectedBarber,
  onSelectService,
  onSelectBarber,
  id
}: ServiceSelectionProps) {
  const [services, setServices] = useState<services[]>([])
  const [barbers, setBarbers] = useState<barbers[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const servicesResponse = await axios.get(`http://localhost:3001/barbershops/${id}/services`);
        setServices(servicesResponse.data);

        const barbersResponse = await axios.get(`http://localhost:3001/barbershops/${id}/barbers`);
        setBarbers(barbersResponse.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [id]);

  console.log(`services`, services)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Selecione o serviço</h2>
        <p className="mt-1 text-sm text-gray-500">Escolha qual serviço você deseja agendar</p>
      </div>
      <div className="space-y-4">
        <Label className="block text-sm font-medium text-gray-700">Serviço</Label>
        <Select value={selectedService} onValueChange={onSelectService}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um serviço" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service._id} value={service.name}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label className="block text-sm font-medium text-gray-700">Barbeiro</Label>
        <Select value={selectedBarber} onValueChange={onSelectBarber}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um barbeiro" />
          </SelectTrigger>
          <SelectContent>
            {barbers.map((barber) => (
              <SelectItem key={barber._id} value={barber._id}>
                {barber.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
