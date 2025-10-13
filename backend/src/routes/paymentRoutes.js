import express from "express";
import mongoose from "mongoose";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import Booking from "../models/Booking.js";
import Barbershop from "../models/Barbershop.js";

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
      return res
        .status(404)
        .json({ error: "Agendamento ou barbearia não encontrado(a)." });
    }

    // ---- ALTERAÇÃO 2: Reativar a validação ----
    // Verifica se a barbearia tem pagamentos habilitados E se o token foi preenchido.
    if (!barbershop.paymentsEnabled || !barbershop.mercadoPagoAccessToken) {
      return res.status(400).json({
        error: "Pagamento online não está habilitado para esta barbearia.",
      });
    }

    if (
      !booking.service ||
      typeof booking.service.price !== "number" ||
      booking.service.price <= 0
    ) {
      return res
        .status(400)
        .json({ error: "Serviço ou preço inválido para este agendamento." });
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
          success: `https://api.barbeariagendamento.com.br/${barbershop.slug}/pagamento-sucesso`,
          failure: `https://api.barbeariagendamento.com.br/${barbershop.slug}`,
          pending: `https://api.barbeariagendamento.com.br/${barbershop.slug}`,
        },
        auto_return: "approved",
        notification_url: `https://api.barbeariagendamento.com.br/api/barbershops/6851dbf31f3fdbf60410f501/bookings/webhook`,
        external_reference: booking._id.toString(),
      },
    };

    const result = await preference.create(preferenceData);

    booking.paymentId = result.id;
    await booking.save();

    res.json({ payment_url: result.init_point });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    const errorMessage =
      error.cause?.message ||
      error.message ||
      "Falha ao gerar link de pagamento.";
    res.status(500).json({
      error: "Falha ao gerar link de pagamento.",
      details: errorMessage,
    });
  }
});

// Rota para Webhook (receber notificações do Mercado Pago)
router.post("/webhook", async (req, res) => {
  const notification = req.body;
  console.log("🔔 Webhook recebido:", notification);

  try {
    if (
      notification.type === "payment" &&
      notification.action === "payment.updated"
    ) {
      const paymentId = notification.data.id;

      const client = new MercadoPagoConfig({
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      });

      // AGORA a variável 'Payment' existe por causa da importação
      const payment = await new Payment(client).get({ id: paymentId });

      if (payment && payment.external_reference) {
        const bookingId = payment.external_reference;
        const paymentStatus = payment.status;

        console.log(
          `- Pagamento ID: ${paymentId}, Status: ${paymentStatus} ${bookingId}`
        );

        const updatedBooking = await Booking.findByIdAndUpdate(
          bookingId,
          { $set: { paymentStatus: paymentStatus } },
          { new: true }
        );

        if (updatedBooking) {
          console.log(
            `✅ Agendamento ${bookingId} atualizado para status de pagamento: ${paymentStatus}`
          );
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    res.sendStatus(500);
  }
});

export default router;
