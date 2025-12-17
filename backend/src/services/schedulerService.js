import cron from "node-cron";
import Booking from "../models/Booking.js";
import Barbershop from "../models/Barbershop.js";
import { sendWhatsAppConfirmation } from "./evolutionWhatsapp.js";
import { startOfDay, endOfDay, getHours } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { sendAutomatedReturnReminders } from "./returnReminderService.js";

const BRAZIL_TZ = "America/Sao_Paulo";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendDailyReminders = async (triggerHour) => {
  console.log(`[${new Date().toLocaleTimeString()}] Iniciando envio de lembretes para triggerHour: ${triggerHour}`);
  const now = new Date();
  const nowInBrazil = toZonedTime(now, BRAZIL_TZ);

  const startOfDayBrazil = startOfDay(nowInBrazil);
  const endOfDayBrazil = endOfDay(nowInBrazil);

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
      console.log(`-> Nenhum agendamento encontrado para hoje.`);
      return;
    }

    let sentCount = 0;

    for (const booking of bookings) {
      if (!booking.customer || !booking.barbershop || !booking.barber) {
        console.warn(`Pulando agendamento ${booking._id} por falta de dados populados.`);
        continue;
      }

      // Converte o horário do agendamento (UTC) para o fuso horário do Brasil
      const appointmentDateInBrazil = toZonedTime(new Date(booking.time), BRAZIL_TZ);
      // Extrai a hora do agendamento no fuso do Brasil
      const appointmentHourInBrazil = getHours(appointmentDateInBrazil);

      // Se o trigger é 8h, só envia se o agendamento for ANTES das 13h
      if (triggerHour === 8 && appointmentHourInBrazil >= 13) {
        continue;
      }
      // Se o trigger é 13h, só envia se o agendamento for a partir das 13h
      if (triggerHour === 13 && appointmentHourInBrazil < 13) {
        continue;
      }
      // --------------------------

      const customerPhone = booking.customer.phone;
      const appointmentTimeFormatted = format(appointmentDateInBrazil, "HH:mm");

      const barberShopAdress = booking.barbershop.address
        ? `${booking.barbershop.address.rua}, ${booking.barbershop.address.numero} - ${booking.barbershop.address.bairro}`
        : "";

      const greeting = triggerHour === 8 ? "Bom dia" : "Olá";
      const message = `${greeting}, ${booking.customer.name}! Lembrete do seu agendamento hoje na ${booking.barbershop.name} às ${appointmentTimeFormatted} com ${booking.barber.name} ✅\n\nPara mais informações, entre em contato com a barbearia: ${booking.barbershop.contact} 📱\nEndereço: ${barberShopAdress}💈`;

      await sendWhatsAppConfirmation(customerPhone, message);
      sentCount++;

      // Pausa aleatória
      const MIN_DELAY = 5000;
      const MAX_DELAY = 15000;
      const randomDelay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
      await delay(randomDelay);
    }
  } catch (error) {
    console.error(`❌ Erro ao enviar lembretes de agendamento (trigger: ${triggerHour}):`, error);
  }
};

const updateExpiredBookings = async () => {
  const now = new Date();
  try {
    // 1. Define a condição de busca:
    //    - A data/hora do agendamento é anterior a agora.
    //    - O status ainda é 'booked' ou 'confirmed'.
    const filter = {
      time: { $lt: now },
      status: { $in: ["booked", "confirmed"] },
    };

    // 2. Define a atualização a ser aplicada
    const update = {
      $set: { status: "completed" },
    };

    // 3. Executa a atualização em massa no banco de dados
    const result = await Booking.updateMany(filter, update);
  } catch (error) {
    console.error("❌ Erro ao atualizar status de agendamentos expirados:", error);
  }
};

const cleanupPendingPayments = async () => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000); // 15 minutos atrás

  try {
    const result = await Booking.updateMany(
      {
        isPaymentMandatory: true, // Era obrigatório
        status: "pending_payment", // Ainda está reservado
        paymentStatus: "pending", // O pagamento está pendente
        createdAt: { $lt: fifteenMinutesAgo }, // E foi criado há mais de 15 min
      },
      {
        $set: {
          status: "canceled", // Cancela o agendamento
          paymentStatus: "canceled", // Marca o pagamento como cancelado
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[CRON] Limpeza: ${result.modifiedCount} agendamentos pendentes foram cancelados.`);
    }
  } catch (error) {
    console.error("❌ Erro ao limpar agendamentos pendentes:", error);
  }
};

cron.schedule(
  "*/5 * * * *",
  () => {
    cleanupPendingPayments();
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  }
);

cron.schedule(
  "0 8 * * *",
  () => {
    sendDailyReminders(8);
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  }
);

cron.schedule(
  "0 11 * * 2", // "Às 11:00, toda Terça-feira"
  () => {
    sendAutomatedReturnReminders();
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  }
);

cron.schedule(
  "0 13 * * *",
  () => {
    sendDailyReminders(13);
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  }
);

cron.schedule(
  "0 * * * *",
  () => {
    updateExpiredBookings();
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  }
);

// Função para desativar contas trial expiradas
const deactivateExpiredTrials = async () => {
  const now = new Date();
  try {
    // Busca barbearias com trial expirado que ainda estão com status "trial"
    const filter = {
      isTrial: true,
      accountStatus: "trial",
      trialEndsAt: { $lt: now },
    };

    const update = {
      $set: { accountStatus: "inactive" },
    };

    const result = await Barbershop.updateMany(filter, update);

    if (result.modifiedCount > 0) {
      console.log(`[CRON] ${result.modifiedCount} conta(s) trial expirada(s) foram desativadas.`);
    }
  } catch (error) {
    console.error("❌ Erro ao desativar contas trial expiradas:", error);
  }
};

// Cron job para desativar contas trial expiradas (roda diariamente às 00:00)
cron.schedule(
  "0 0 * * *",
  () => {
    deactivateExpiredTrials();
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  }
);

updateExpiredBookings();
deactivateExpiredTrials(); // Executa uma vez ao iniciar o servidor
