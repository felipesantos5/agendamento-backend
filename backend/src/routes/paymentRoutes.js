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

  console.log(`notification`, notification);

  // O ID da barbearia é essencial para buscar o Access Token correto
  const { barbershopId } = req.query;

  try {
    // 1. Filtra APENAS o evento que importa ('payment.updated')
    if (notification.type === "payment" && notification.action === "payment.updated") {
      if (!barbershopId) {
        throw new Error("Webhook: barbershopId não foi fornecido na URL.");
      }

      // 2. Pega o ID do pagamento (ex: 132713009869)
      const paymentId = notification.data.id;

      const barbershop = await Barbershop.findById(barbershopId);
      if (!barbershop || !barbershop.mercadoPagoAccessToken) {
        throw new Error(`Webhook: Barbearia ${barbershopId} não encontrada ou sem token.`);
      }

      // 3. Busca os detalhes completos do pagamento no MP
      const client = new MercadoPagoConfig({ accessToken: barbershop.mercadoPagoAccessToken });
      const payment = await new Payment(client).get({ id: paymentId });

      // 4. A MÁGICA: Conecta o pagamento ao agendamento via external_reference
      if (payment && payment.external_reference) {
        const bookingId = payment.external_reference;
        const paymentStatus = payment.status;

        // 5. Busca o agendamento no NOSSO banco
        const booking = await Booking.findById(bookingId);

        if (booking) {
          booking.paymentStatus = paymentStatus;

          // 6. LÓGICA DE CONFIRMAÇÃO
          // Esta é a sua regra de negócio:
          // Se o pagamento foi APROVADO e era OBRIGATÓRIO...
          if (paymentStatus === "approved" && booking.isPaymentMandatory) {
            // ...e ainda estava pendente...
            if (booking.status === "pending_payment") {
              // ...CONFIRMA o agendamento.
              booking.status = "confirmed";
            }

            // Popula os dados para enviar as notificações
            await booking.populate([
              { path: "customer", select: "name phone" },
              { path: "barber", select: "name" },
              { path: "barbershop", select: "name contact" },
              { path: "service", select: "name" },
            ]);

            // 7. Envia as notificações que foram "seguradas"
            const formattedTime = formatBookingTime(booking.time, true);
            const cleanPhoneNumber = booking.barbershop.contact.replace(/\D/g, "");
            const whatsappLink = `https://wa.me/55${cleanPhoneNumber}`;
            const message = `Olá, ${booking.customer.name}! Seu pagamento foi aprovado e seu agendamento na ${booking.barbershop.name} está confirmado para ${formattedTime} ✅\n\nNos vemos lá! 💈\n\nFale com a barbearia: ${whatsappLink}`;

            sendWhatsAppConfirmation(booking.customer.phone, message);
            sendEventToBarbershop(barbershopId, "new_booking", booking.toObject());
          }

          await booking.save();
          console.log(`✅ Webhook: Agendamento ${bookingId} atualizado para status: ${paymentStatus}`);
        }
      }
    }

    // 8. Responde 200 para o Mercado Pago parar de enviar este evento.
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    res.sendStatus(500); // Responde 500 para o MP tentar de novo
  }
});

export default router;
