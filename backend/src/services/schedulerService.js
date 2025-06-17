import cron from 'node-cron';
import Booking from '../models/Booking.js';
import {sendWhatsAppConfirmation}  from './evolutionWhatsapp.js';
import { startOfDay, endOfDay } from 'date-fns';

// Função para buscar agendamentos do dia e enviar lembretes
const sendDailyReminders = async () => {
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);

  try {
    const bookings = await Booking.find({
      time: {
        $gte: start,
        $lt: end,
      },
      status: 'confirmed',
    })
      .populate('barber')
      .populate('customer');

    if (bookings.length === 0) {
      console.log('Nenhum agendamento para hoje.');
      return;
    }

    console.log(`${bookings.length} agendamentos encontrados para hoje. Enviando lembretes...`);

    for (const booking of bookings) {
      const customerPhone = booking.customer.phone;
      const appointmentTime = new Date(booking.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const barberName = booking.barber ? booking.barber.name : 'seu barbeiro';

      const message = `Olá, ${booking.customer.name}! Lembrete do seu agendamento hoje na barbearia às ${appointmentTime} com ${barberName}.`;

      await sendWhatsAppConfirmation(customerPhone, message);

      console.log(`Mensagem enviada para ${booking.customer.name} (${customerPhone})`);
    }

  } catch (error) {
    console.error('Erro ao enviar lembretes de agendamento:', error);
  }
};

// Agenda a tarefa para ser executada todos os dias às 8h da manhã
cron.schedule('20 13 * * *', () => {
  console.log('Executando tarefa agendada: Envio de lembretes de agendamento.');
  sendDailyReminders();
}, {
  scheduled: true,
  timezone: "America/Sao_Paulo" // Defina o fuso horário correto
});

console.log('Serviço de agendamento de lembretes iniciado.');