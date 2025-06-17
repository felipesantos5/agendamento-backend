import cron from 'node-cron';
import Booking from '../models/Booking.js';
import {sendWhatsAppConfirmation}  from './evolutionWhatsapp.js';

// Função para buscar agendamentos do dia e enviar lembretes
const sendDailyReminders = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  try {
    const bookings = await Booking.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
      status: 'confirmed', // Apenas lembretes para agendamentos confirmados
    }).populate('barber'); // Popula os dados do barbeiro

    if (bookings.length === 0) {
      console.log('Nenhum agendamento para hoje.');
      return;
    }

    console.log(`${bookings.length} agendamentos encontrados para hoje. Enviando lembretes...`);

    for (const booking of bookings) {
      // Verifique se a estrutura dos seus models corresponde a estes caminhos
      const customerPhone = booking.customer.phone; 
      const appointmentTime = new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const barberName = booking.barber ? booking.barber.name : 'seu barbeiro';

      const message = `Olá, ${booking.customer.name}! Lembrete do seu agendamento hoje na barbearia às ${appointmentTime} com ${barberName}.`;

      // Adapte a chamada se o nome da função for diferente
      await sendWhatsAppConfirmation(customerPhone, message);

      console.log(`Mensagem enviada para ${booking.customer.name} (${customerPhone})`);
    }

  } catch (error) {
    console.error('Erro ao enviar lembretes de agendamento:', error);
  }
};

// Agenda a tarefa para ser executada todos os dias às 8h da manhã
cron.schedule('0 13 * * *', () => {
  console.log('Executando tarefa agendada: Envio de lembretes de agendamento.');
  sendDailyReminders();
}, {
  scheduled: true,
  timezone: "America/Sao_Paulo" // Defina o fuso horário correto
});

console.log('Serviço de agendamento de lembretes iniciado.');