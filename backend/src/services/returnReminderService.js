// src/services/returnReminderService.js
import Booking from "../models/Booking.js";
import Barbershop from "../models/Barbershop.js";
import Customer from "../models/Customer.js";
import mongoose from "mongoose";
import { sendWhatsAppConfirmation } from "./evolutionWhatsapp.js";
import { subDays, startOfDay, startOfMonth } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const BRAZIL_TZ = "America/Sao_Paulo";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lógica principal para encontrar clientes elegíveis para lembrete de retorno,
 * respeitando todas as regras de negócio.
 */
async function findCustomersToRemind(barbershopId, cutoffDateUTC, startOfCurrentMonthUTC, todayUTC) {
  try {
    const customers = await Booking.aggregate([
      // 1. Achar todos agendamentos da barbearia
      { $match: { barbershop: new mongoose.Types.ObjectId(barbershopId) } },
      // 2. Ordenar por data para sabermos qual foi o último
      { $sort: { time: -1 } },
      // 3. Agrupar por cliente
      {
        $group: {
          _id: "$customer",
          allBookings: { $push: { status: "$status", time: "$time" } },
        },
      },
      // 4. Buscar os dados do cliente (para pegar o histórico de lembretes)
      {
        $lookup: {
          from: "customers", // nome da coleção no MongoDB
          localField: "_id",
          foreignField: "_id",
          as: "customerDetails",
        },
      },
      { $unwind: "$customerDetails" }, // Transforma o array de 1 elemento em objeto
      // 5. Analisar os dados e projetar o que precisamos
      {
        $project: {
          customerDetails: 1,
          // Encontra a data do ÚLTIMO agendamento COMPLETADO
          lastCompletedVisit: {
            $max: {
              $map: {
                input: { $filter: { input: "$allBookings", as: "b", cond: { $eq: ["$$b.status", "completed"] } } },
                as: "comp",
                in: "$$comp.time",
              },
            },
          },
          // Conta quantos agendamentos FUTUROS (agendados ou confirmados) o cliente já tem
          futureBookingsCount: {
            $size: {
              $filter: {
                input: "$allBookings",
                as: "b",
                cond: {
                  $and: [
                    { $in: ["$$b.status", ["booked", "confirmed"]] },
                    { $gte: ["$$b.time", todayUTC] }, // Data é hoje ou no futuro
                  ],
                },
              },
            },
          },
          // Pega o histórico de lembretes do cliente
          totalRemindersSent: { $size: "$customerDetails.returnReminders" },
          lastReminderSent: { $max: "$customerDetails.returnReminders.sentAt" },
        },
      },
      // 6. O FILTRO MÁGICO: Aplica todas as regras de negócio
      {
        $match: {
          // Regra 1: O último corte foi ANTES da data de corte (ex: 30 dias atrás)
          lastCompletedVisit: { $lt: cutoffDateUTC, $ne: null },
          // Regra 2: E o cliente NÃO tem nenhum horário futuro marcado
          futureBookingsCount: 0,
          // Exclusão 2: E o total de lembretes enviados é MENOR que 3
          totalRemindersSent: { $lt: 3 },
          // Exclusão 1: E (ou o cliente nunca recebeu lembrete OU o último lembrete foi antes do início deste mês)
          $or: [{ lastReminderSent: { $exists: false } }, { lastReminderSent: { $lt: startOfCurrentMonthUTC } }],
        },
      },
      // 7. Retorna os dados limpos de quem passou no filtro
      {
        $project: {
          _id: "$customerDetails._id",
          name: "$customerDetails.name",
          phone: "$customerDetails.phone",
        },
      },
    ]);
    return customers;
  } catch (error) {
    console.error(`Erro na agregação para barbershop ${barbershopId}:`, error);
    return []; // Retorna array vazio em caso de erro
  }
}

/**
 * JOB (Worker) que roda toda terça-feira para enviar lembretes de retorno.
 */
export const sendAutomatedReturnReminders = async () => {
  console.log(`[${new Date().toLocaleTimeString()}] Iniciando JOB: Lembretes de Retorno (Toda Terça).`);
  const nowBrazil = toZonedTime(new Date(), BRAZIL_TZ);
  const todayUTC = fromZonedTime(startOfDay(nowBrazil), BRAZIL_TZ);
  const startOfCurrentMonthUTC = fromZonedTime(startOfMonth(nowBrazil), BRAZIL_TZ);

  try {
    // 1. Encontra barbearias que ativaram o lembrete automático
    const barbershopsToNotify = await Barbershop.find({
      "returnReminder.enabled": true,
    });

    console.log(`-> Encontradas ${barbershopsToNotify.length} barbearias com lembretes automáticos ativos.`);

    for (const barbershop of barbershopsToNotify) {
      const days = barbershop.returnReminder.daysSinceLastCut;
      const cutoffDateUTC = fromZonedTime(subDays(nowBrazil, days), BRAZIL_TZ);

      // 2. Usa a lógica de agregação para achar os clientes
      const customers = await findCustomersToRemind(barbershop._id, cutoffDateUTC, startOfCurrentMonthUTC, todayUTC);

      if (customers.length > 0) {
        console.log(`-> Enviando ${customers.length} lembretes para ${barbershop.name}...`);
      } else {
        console.log(`-> Nenhum cliente elegível para ${barbershop.name}.`);
        continue;
      }

      // 3. Envia as mensagens e atualiza o histórico do cliente
      for (const customer of customers) {
        const customMessage = barbershop.returnReminder.message
          .replace(/{name}/g, customer.name) // regex 'g' para substituir todas ocorrências
          .replace(/{days}/g, days.toString());

        await sendWhatsAppConfirmation(customer.phone, customMessage);

        // ATUALIZA O CLIENTE no banco para registrar o envio
        await Customer.updateOne(
          { _id: customer._id },
          { $push: { returnReminders: { sentAt: new Date() } } } // new Date() é sempre UTC, o que é perfeito
        );

        await delay(5000 + Math.random() * 5000); // Pausa de 5 a 10s
      }
    }
  } catch (error) {
    console.error(`❌ Erro no JOB de lembretes de retorno:`, error);
  }
  console.log(`[${new Date().toLocaleTimeString()}] JOB: Lembretes de Retorno finalizado.`);
};
