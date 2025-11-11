import express from "express";
import mongoose from "mongoose";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import Booking from "../models/Booking.js";
import { formatBookingTime } from "../utils/formatBookingTime.js";
import Barbershop from "../models/Barbershop.js";
import { sendWhatsAppConfirmation } from "../services/evolutionWhatsapp.js";
import { sendEventToBarbershop } from "../services/sseService.js";

const router = express.Router({ mergeParams: true });

// ROTA: POST /barbershops/:barbershopId/bookings/:bookingId/create-payment
router.post("/:bookingId/create-payment", async (req, res) => {
  try {
    const { barbershopId, bookingId } = req.params;

    // ---- ALTERAÇÃO 1: Buscar a barbearia junto com o agendamento ----
    const [barbershop, booking] = await Promise.all([
      Barbershop.findById(barbershopId),
      Booking.findById(bookingId).populate("service").populate("customer"),
    ]);

    if (!booking || !barbershop) {
      return res.status(404).json({ error: "Agendamento ou barbearia não encontrado(a)." });
    }

    // ---- ALTERAÇÃO 2: Reativar a validação ----
    // Verifica se a barbearia tem pagamentos habilitados E se o token foi preenchido.
    if (!barbershop.paymentsEnabled || !barbershop.mercadoPagoAccessToken) {
      return res.status(400).json({
        error: "Pagamento online não está habilitado para esta barbearia.",
      });
    }

    if (!booking.service || typeof booking.service.price !== "number" || booking.service.price <= 0) {
      return res.status(400).json({ error: "Serviço ou preço inválido para este agendamento." });
    }

    // ---- ALTERAÇÃO 3: Usar o Access Token da barbearia ----
    const client = new MercadoPagoConfig({
      accessToken: barbershop.mercadoPagoAccessToken, // Puxa a chave do banco de dados
    });

    const preference = new Preference(client);

    const preferenceData = {
      body: {
        items: [
          {
            id: booking._id.toString(),
            title: `Agendamento: ${booking.service.name}`,
            description: "serviço de barbearia",
            quantity: 1,
            currency_id: "BRL",
            unit_price: booking.service.price,
          },
        ],
        payer: {
          name: booking.customer.name,
          email: `cliente_${booking.customer._id}@email.com`, // Usar um email mais consistente
          phone: {
            area_code: booking.customer.phone.substring(0, 2),
            number: booking.customer.phone.substring(2, 11),
          },
        },
        back_urls: {
          success: `https://barbeariagendamento.com.br/${barbershop.slug}/pagamento-sucesso`,
          failure: `https://barbeariagendamento.com.br/${barbershop.slug}`,
          pending: `https://barbeariagendamento.com.br/${barbershop.slug}`,
        },
        auto_return: "approved",
        notification_url: `https://api.barbeariagendamento.com.br/api/barbershops/${barbershopId}/bookings/webhook?barbershopId=${barbershopId}`,
        external_reference: booking._id.toString(),
      },
    };

    const result = await preference.create(preferenceData);

    booking.paymentId = result.id;
    await booking.save();

    res.json({ payment_url: result.init_point });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    const errorMessage = error.cause?.message || error.message || "Falha ao gerar link de pagamento.";
    res.status(500).json({
      error: "Falha ao gerar link de pagamento.",
      details: errorMessage,
    });
  }
});

// Rota para Webhook (receber notificações do Mercado Pago)
router.post("/webhook", async (req, res) => {
  const notification = req.body;
  const { barbershopId } = req.query;

  console.log("🔔 Webhook Recebido:", notification); // Log para depuração

  try {
    let paymentId = null;

    // --- ✅ NOVA LÓGICA DE CAPTURA DE ID ---
    // Caso 1: Notificação de Pagamento (ex: payment.created, payment.updated)
    if (notification.type === "payment" && notification.data?.id) {
      console.log(`Webhook: Capturado 'type: payment' com ID: ${notification.data.id}`);
      paymentId = notification.data.id;
    }
    // Caso 2: Notificação de Tópico (ex: topic: 'payment')
    else if (notification.topic === "payment" && notification.resource) {
      // O 'resource' pode ser uma URL ou só o ID
      const resource = notification.resource;
      paymentId = resource.substring(resource.lastIndexOf("/") + 1);
      console.log(`Webhook: Capturado 'topic: payment' com ID: ${paymentId}`);
    }
    // Ignora outros eventos como 'merchant_order'
    else {
      console.log("Webhook: Evento ignorado (não é 'payment').");
      return res.sendStatus(200); // Responde 200 para o MP parar de enviar
    }
    // ------------------------------------

    if (!barbershopId) {
      throw new Error(`Webhook: barbershopId não foi fornecido para o paymentId: ${paymentId}`);
    }

    // --- LÓGICA DE VERIFICAÇÃO (Como estava antes) ---
    const barbershop = await Barbershop.findById(barbershopId);
    if (!barbershop || !barbershop.mercadoPagoAccessToken) {
      throw new Error(`Webhook: Barbearia ${barbershopId} não encontrada ou sem token.`);
    }

    const client = new MercadoPagoConfig({ accessToken: barbershop.mercadoPagoAccessToken });

    // Busca os detalhes completos do pagamento no MP
    console.log(`Webhook: Buscando detalhes do pagamento ${paymentId} no Mercado Pago...`);
    const payment = await new Payment(client).get({ id: paymentId });

    if (payment && payment.external_reference) {
      const bookingId = payment.external_reference;
      const paymentStatus = payment.status; // ex: 'approved', 'in_process', 'rejected'

      console.log(`Webhook: Pagamento ${paymentId} encontrado. Status: ${paymentStatus}. Referência (BookingID): ${bookingId}`);

      const booking = await Booking.findById(bookingId);

      if (booking) {
        // Evita processar duas vezes se o status já estiver correto
        if (booking.paymentStatus === paymentStatus) {
          console.log(`Webhook: Booking ${bookingId} já está com status ${paymentStatus}. Ignorando.`);
          return res.sendStatus(200);
        }

        booking.paymentStatus = paymentStatus;

        // --- LÓGICA DE CONFIRMAÇÃO ---
        // Se o pagamento foi APROVADO...
        if (paymentStatus === "approved") {
          // ...e era um pagamento OBRIGATÓRIO que estava PENDENTE...
          if (booking.isPaymentMandatory && booking.status === "pending_payment") {
            booking.status = "confirmed"; // ✅ Confirma o agendamento

            console.log(`Webhook: Booking ${bookingId} (obrigatório) foi PAGO. Status atualizado para 'confirmed'.`);

            // Popula dados para enviar notificações
            await booking.populate([
              { path: "customer", select: "name phone" },
              { path: "barber", select: "name" },
              { path: "barbershop", select: "name contact" },
              { path: "service", select: "name" },
            ]);

            // Envia WhatsApp
            const formattedTime = formatBookingTime(booking.time, true);
            const cleanPhoneNumber = booking.barbershop.contact.replace(/\D/g, "");
            const whatsappLink = `https://wa.me/55${cleanPhoneNumber}`;
            const message = `Olá, ${booking.customer.name}! Seu pagamento foi aprovado e seu agendamento na ${booking.barbershop.name} está confirmado para ${formattedTime} ✅\n\nNos vemos lá! 💈\n\nFale com a barbearia: ${whatsappLink}`;

            sendWhatsAppConfirmation(booking.customer.phone, message);

            // Envia SSE
            sendEventToBarbershop(barbershopId, "new_booking", booking.toObject());
          } else {
            console.log(`Webhook: Booking ${bookingId} (opcional) foi PAGO. Status atualizado.`);
          }
        }

        await booking.save();
      } else {
        console.warn(`Webhook: Agendamento com ID ${bookingId} (external_reference) não encontrado no banco.`);
      }
    } else {
      console.warn(`Webhook: Pagamento ${paymentId} não encontrado no Mercado Pago ou não possui external_reference.`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    res.sendStatus(500); // Responde 500 para o MP tentar de novo
  }
});

export default router;
