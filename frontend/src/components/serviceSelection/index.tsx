import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { PriceFormater } from "@/helper/priceFormater";

interface Service {
  _id: string;
  name: string;
  price: number;
  duration: number;
}

interface Barber {
  _id: string;
  name: string;
  image?: string;
}

interface ServiceSelectionProps {
  selectedService: string;
  selectedBarber: string;
  onSelectService: (id: string) => void;
  onSelectBarber: (id: string) => void;
  services: Service[];
  barbers: Barber[];
}

export default function ServiceSelection({
  selectedService,
  selectedBarber,
  onSelectService,
  onSelectBarber,
  services,
  barbers,
}: ServiceSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Selecione o serviço</h2>
        <p className="mt-1 text-sm md:text-base text-gray-500">Escolha qual serviço você deseja agendar</p>
      </div>
      <div className="space-y-4">
        <Label className="block text-sm font-medium text-gray-700 md:text-base">Serviço</Label>
        <Select value={selectedService} onValueChange={onSelectService}>
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="Selecione um serviço" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service._id} value={service._id} className="cursor-pointer">
                <div className="flex justify-between items-center w-full gap-4">
                  <span className="text-left">{service.name}</span>
                  <span className="text-right min-w-[70px] text-zinc-800">{PriceFormater(service.price)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label className="block text-sm font-medium text-gray-700 md:text-base">Barbeiro</Label>
        <Select value={selectedBarber} onValueChange={onSelectBarber}>
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="Selecione um barbeiro" />
          </SelectTrigger>
          <SelectContent>
            {barbers.map((barber) => (
              <SelectItem key={barber._id} value={barber._id} className="cursor-pointer flex gap-3">
                <Avatar>
                  <AvatarImage src={barber.image} />
                  <AvatarFallback className="uppercase">{barber.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                {barber.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
