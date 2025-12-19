import { MapPin, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Barbershop, Availability } from "@/types/barberShop"; // Importando suas tipagens

// Função auxiliar para formatar o link do Instagram
const formatInstagramLink = (instagram?: string | null): string | null => {
  if (!instagram || !instagram.trim()) return null;

  const value = instagram.trim();

  // Se já é um link completo, retorna como está
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  // Remove @ do início se existir e monta o link
  const username = value.startsWith("@") ? value.slice(1) : value;

  // Remove qualquer parte de URL que possa ter sido colada parcialmente
  const cleanUsername = username.replace(/^(instagram\.com\/|www\.instagram\.com\/)/, "");

  return `https://instagram.com/${cleanUsername}`;
};

// A interface de props agora espera o objeto barbershop e a disponibilidade
interface ShopInfoProps {
  barbershop: Barbershop;
  availability: Availability[];
}

export function ShopInfo({ barbershop, availability }: ShopInfoProps) {
  // Verifica se o endereço está preenchido (não vazio)
  const hasAddress = barbershop.address &&
    barbershop.address.rua &&
    barbershop.address.cidade &&
    barbershop.address.estado;

  // Monta o endereço completo e o link para o Google Maps
  const fullAddress = hasAddress
    ? `${barbershop.address.rua}, ${barbershop.address.numero} - ${barbershop.address.bairro}, ${barbershop.address.cidade}/${barbershop.address.estado}`
    : "";

  const googleMapsUrl = hasAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : "#";

  // Formata os links de redes sociais (verifica se não está vazio)
  const whatsappLink = barbershop.contact && barbershop.contact.trim()
    ? `https://wa.me/55${barbershop.contact.replace(/\D/g, "")}`
    : null;

  // Descobre o nome do dia da semana atual para destacar
  const todayName = new Date().toLocaleDateString("pt-BR", { weekday: "long" });

  return (
    <div className="space-y-5 px-4 text-gray-600 mt-6 pb-8">
      <h2 className="text-gray-800 text-lg font-semibold text-center">
        Sobre nós
      </h2>

      {barbershop.description && (
        <section className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm leading-relaxed">{barbershop.description}</p>
        </section>
      )}

      {hasAddress && (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ver no mapa"
          className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 active:bg-gray-100 transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--loja-theme-color)]/10 rounded-full flex items-center justify-center">
            <MapPin className="h-5 w-5 text-[var(--loja-theme-color)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">Localização</p>
            <p className="text-sm font-medium text-gray-900 truncate">{fullAddress}</p>
          </div>
        </a>
      )}

      {/* Seção de Horário de Atendimento */}
      <section className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Horário de atendimento</h3>
        <div className="space-y-2">
          {availability.map((wh) => (
            <div key={wh.day} className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                {wh.day}
                {wh.day.toLowerCase() === todayName.toLowerCase() && (
                  <Badge className="bg-[var(--loja-theme-color)] text-white px-1.5 py-0.5 text-[10px]">
                    Hoje
                  </Badge>
                )}
              </span>
              <span className="font-medium text-gray-900">{`${wh.start} - ${wh.end}`}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Seção de Redes Sociais */}
      {(whatsappLink || formatInstagramLink(barbershop.instagram)) && (
        <section className="flex flex-col sm:flex-row gap-3">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white rounded-xl py-3 px-4 font-medium text-sm active:scale-[0.98] transition-transform"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="fill-current"
                width="20px"
                height="20px"
                viewBox="-1.66 0 740.824 740.824"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M630.056 107.658C560.727 38.271 468.525.039 370.294 0 167.891 0 3.16 164.668 3.079 367.072c-.027 64.699 16.883 127.855 49.016 183.523L0 740.824l194.666-51.047c53.634 29.244 114.022 44.656 175.481 44.682h.151c202.382 0 367.128-164.689 367.21-367.094.039-98.088-38.121-190.32-107.452-259.707m-259.758 564.8h-.125c-54.766-.021-108.483-14.729-155.343-42.529l-11.146-6.613-115.516 30.293 30.834-112.592-7.258-11.543c-30.552-48.58-46.689-104.729-46.665-162.379C65.146 198.865 202.065 62 370.419 62c81.521.031 158.154 31.81 215.779 89.482s89.342 134.332 89.311 215.859c-.07 168.242-136.987 305.117-305.211 305.117m167.415-228.514c-9.176-4.591-54.286-26.782-62.697-29.843-8.41-3.061-14.526-4.591-20.644 4.592-6.116 9.182-23.7 29.843-29.054 35.964-5.351 6.122-10.703 6.888-19.879 2.296-9.175-4.591-38.739-14.276-73.786-45.526-27.275-24.32-45.691-54.36-51.043-63.542-5.352-9.183-.569-14.148 4.024-18.72 4.127-4.11 9.175-10.713 13.763-16.07 4.587-5.356 6.116-9.182 9.174-15.303 3.059-6.122 1.53-11.479-.764-16.07-2.294-4.591-20.643-49.739-28.29-68.104-7.447-17.886-15.012-15.466-20.644-15.746-5.346-.266-11.469-.323-17.585-.323-6.117 0-16.057 2.296-24.468 11.478-8.41 9.183-32.112 31.374-32.112 76.521s32.877 88.763 37.465 94.885c4.587 6.122 64.699 98.771 156.741 138.502 21.891 9.45 38.982 15.093 52.307 19.323 21.981 6.979 41.983 5.994 57.793 3.633 17.628-2.633 54.285-22.19 61.932-43.616 7.646-21.426 7.646-39.791 5.352-43.617-2.293-3.826-8.41-6.122-17.585-10.714"
                />
              </svg>
              WhatsApp
            </a>
          )}
          {formatInstagramLink(barbershop.instagram) && (
            <a
              href={formatInstagramLink(barbershop.instagram)!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white rounded-xl py-3 px-4 font-medium text-sm active:scale-[0.98] transition-transform"
            >
              <Instagram className="w-5 h-5" />
              Instagram
            </a>
          )}
        </section>
      )}
    </div>
  );
}
