import cron from "node-cron";
import Booking from "../models/Booking.js";
import { sendWhatsAppConfirmation } from "./evolutionWhatsapp.js";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { formatPhoneNumber } from "../utils/phoneFormater.js";
import { format } from "date-fns";

const BRAZIL_TZ = "America/Sao_Paulo";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Função para buscar agendamentos do dia e enviar lembretes
const sendDailyReminders = async () => {
  const now = new Date();
  const nowInBrazil = toZonedTime(now, BRAZIL_TZ);

  // Obter início e fim do dia no fuso horário do Brasil
  const startOfDayBrazil = startOfDay(nowInBrazil);
  const endOfDayBrazil = endOfDay(nowInBrazil);

  // Converter de volta para UTC para consulta no banco
  const start = fromZonedTime(startOfDayBrazil, BRAZIL_TZ);
  const end = fromZonedTime(endOfDayBrazil, BRAZIL_TZ);

  try {
    const bookings = await Booking.find({
      time: {
        $gte: start,
        $lt: end,
      },
      status: "booked",
    })
      .populate("customer")
      .populate("barber")
      .populate("barbershop");

    if (bookings.length === 0) {
      return;
    }

    for (const booking of bookings) {
      // Verifica se os dados necessários existem para evitar erros
      if (!booking.customer || !booking.barbershop || !booking.barber) {
        console.warn(
          `Pulando agendamento ${booking._id} por falta de dados populados.`
        );
        continue;
      }

      const customerPhone = booking.customer.phone;
      const appointmentTime = format(
        toZonedTime(new Date(booking.time), BRAZIL_TZ),
        "HH:mm"
      );

      const barberShopAdress = booking.barbershop.address
        ? `${booking.barbershop.address.rua}, ${booking.barbershop.address.numero} - ${booking.barbershop.address.bairro}`
        : "";

      const message = `Bom dia, ${booking.customer.name}! Lembrete do seu agendamento hoje na ${booking.barbershop.name} às ${appointmentTime} com ${booking.barber.name} ✅\n\nPara mais informações, entre em contato com a barbearia: ${booking.barbershop.contact} 📱\nEndereço: ${barberShopAdress}💈`;

      await sendWhatsAppConfirmation(customerPhone, message);

      // --- PASSO 3: ADICIONE A PAUSA ALEATÓRIA ---
      // Define um tempo de espera mínimo e máximo em milissegundos
      const MIN_DELAY = 5000; // 5 segundos
      const MAX_DELAY = 15000; // 15 segundos

      // Calcula um tempo de espera aleatório dentro do intervalo
      const randomDelay =
        Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;

      // Pausa a execução do loop pelo tempo calculado
      await delay(randomDelay);
    }
  } catch (error) {
    console.error("Erro ao enviar lembretes de agendamento:", error);
  }
};

// Agenda a tarefa para ser executada todos os dias às 8h da manhã
cron.schedule(
  "0 8 * * *",
  () => {
    sendDailyReminders();
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo", // Defina o fuso horário correto
  }
);
