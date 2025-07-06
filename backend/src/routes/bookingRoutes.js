import express from "express";
import Booking from "../models/Booking.js";
import Barbershop from "../models/Barbershop.js";
import Customer from "../models/Customer.js";
import mongoose from "mongoose";
import { bookingSchema as BookingValidationSchema } from "../validations/bookingValidation.js";
import { sendWhatsAppConfirmation } from "../services/evolutionWhatsapp.js";
import { formatBookingTime } from "../utils/formatBookingTime.js";
import { formatPhoneNumber } from "../utils/phoneFormater.js";
import { checkHolidayAvailability } from "../middleware/holidayCheck.js";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";
import { protectCustomer } from "../middleware/authCustomerMiddleware.js";

const router = express.Router({ mergeParams: true });

// Criar Agendamento em uma Barbearia
// Rota esperada: POST /barbershops/:barbershopId/bookings
router.post("/", checkHolidayAvailability, async (req, res) => {
  try {
    const data = BookingValidationSchema.parse(req.body);
    const bookingTime = new Date(data.time);

    const customer = await Customer.findOneAndUpdate(
      { phone: data.customer.phone }, // Condição de busca
      { $set: { name: data.customer.name, phone: data.customer.phone } }, // Dados para inserir/atualizar
      { new: true, upsert: true } // Opções: new->retorna o doc atualizado, upsert->cria se não existir
    );

    const conflict = await Booking.findOne({
      barber: data.barber,
      time: bookingTime,
      status: { $nin: ["canceled"] },
    });

    if (conflict) {
      return res.status(409).json({
        error: "Este horário já foi preenchido. Por favor, escolha outro.",
      });
    }

    const createdBooking = await Booking.create({
      ...data,
      customer: customer._id,
      barbershop: req.params.barbershopId,
      time: bookingTime,
    });

    customer.bookings.push(createdBooking._id);
    await customer.save();

    if (createdBooking) {
      const barbershop = await Barbershop.findById(req.params.barbershopId);
      const formattedTime = formatBookingTime(new Date(bookingTime));

      const cleanPhoneNumber = barbershop.contact.replace(/\D/g, "");

      const whatsappLink = `https://wa.me/55${cleanPhoneNumber}`;

      const locationLink = `https://barbeariagendamento.com.br/localizacao/${barbershop._id}`;

      const message = `Olá, ${customer.name}! Seu agendamento na ${barbershop.name} foi confirmado com sucesso para ${formattedTime} ✅\n\nPara mais informações, entre em contato com a barbearia:\n${whatsappLink}\n\n📍 Ver no mapa:\n${locationLink}\n\nNosso time te aguarda! 💈`;

      sendWhatsAppConfirmation(customer.phone, message);
    }

    res.status(201).json(createdBooking);
  } catch (e) {
    console.error("ERRO AO CRIAR AGENDAMENTO:", e);
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados de agendamento inválidos.", details: e.errors });
    }
    if (e.name === "CastError") {
      return res.status(400).json({ error: "ID inválido fornecido para um dos campos." });
    }
    res.status(500).json({ error: "Ocorreu um erro interno ao processar sua solicitação." });
  }
});

// Listar Agendamentos de uma Barbearia
// Rota esperada: GET /barbershops/:barbershopId/bookings
router.get("/", async (req, res) => {
  try {
    // ✅ Use req.params.barbershopId aqui, que vem da rota pai graças ao mergeParams
    const barbershopId = req.params.barbershopId;

    if (!barbershopId || !mongoose.Types.ObjectId.isValid(barbershopId)) {
      return res.status(400).json({ error: "ID da barbearia inválido ou não fornecido." });
    }

    const bookings = await Booking.find({ barbershop: barbershopId }).populate("barber", "name").populate("service", "name price duration");

    res.json(bookings);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    res.status(500).json({ error: "Falha ao buscar agendamentos." });
  }
});

router.put(
  "/:bookingId/status",
  protectAdmin, // Apenas usuários logados no painel podem acessar
  async (req, res) => {
    try {
      const { barbershopId, bookingId } = req.params;
      const { status } = req.body;

      // 1. Validação dos IDs
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ error: "ID do agendamento inválido." });
      }

      const booking = await Booking.findOne({
        _id: bookingId,
        barbershop: barbershopId,
      });

      if (!booking) {
        return res.status(404).json({ error: "Agendamento não encontrado nesta barbearia." });
      }

      const barbershop = await Barbershop.findById(barbershopId);

      // 2. Validação do Status recebido
      const allowedStatuses = ["booked", "completed", "canceled", "confirmed"];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: `Status inválido. Use um dos seguintes: ${allowedStatuses.join(", ")}`,
        });
      }

      const bookingDate = new Date(booking.time);

      const formattedDate = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }).format(bookingDate);

      if (status === "canceled") {
        const message = `Olá ${booking.customer.name},\nInformamos que seu agendamento foi cancelado na ${barbershop.name} para o dia ${formattedDate}.`;

        sendWhatsAppConfirmation(booking.customer.phone, message);
      }

      // 3. Encontrar o agendamento

      // 4. Atualizar o status e salvar
      booking.status = status;
      await booking.save();

      // 5. Retornar a resposta de sucesso com o agendamento atualizado
      res.status(200).json({
        success: true,
        message: `Agendamento atualizado para '${status}' com sucesso.`,
        data: booking,
      });
    } catch (error) {
      console.error("Erro ao atualizar status do agendamento:", error);
      res.status(500).json({ error: "Ocorreu um erro no servidor." });
    }
  }
);

router.put(
  "/:bookingId/cancel", // Mantivemos o mesmo padrão de URL, mas com outra proteção
  protectCustomer, // Protegida para garantir que um cliente esteja logado
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const customerId = req.customer.id; // ID do cliente logado, vindo do middleware protectCustomer

      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ error: "ID do agendamento inválido." });
      }

      // 1. Encontra o agendamento que o cliente quer cancelar
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return res.status(404).json({ error: "Agendamento não encontrado." });
      }

      // 2. VERIFICAÇÃO DE SEGURANÇA CRUCIAL!
      // Garante que o ID do cliente logado é o mesmo ID do cliente no agendamento.
      // Isso impede que o cliente A cancele o agendamento do cliente B.
      if (booking.customer.toString() !== customerId) {
        return res.status(403).json({ error: "Você não tem permissão para cancelar este agendamento." });
      }

      // 3. Regra de negócio: não permitir cancelamento de agendamentos que já passaram
      if (new Date(booking.time) < new Date()) {
        return res.status(400).json({ error: "Não é possível cancelar um agendamento que já ocorreu." });
      }

      // 4. Se tudo estiver certo, atualiza o status
      booking.status = "canceled";
      await booking.save();

      // Você pode adicionar uma notificação de WhatsApp para o admin/barbeiro aqui se desejar

      res.status(200).json({
        success: true,
        message: "Seu agendamento foi cancelado com sucesso.",
        data: booking,
      });
    } catch (error) {
      console.error("Erro ao cancelar agendamento pelo cliente:", error);
      res.status(500).json({ error: "Falha ao processar o cancelamento." });
    }
  }
);

// Excluir um Agendamento
// Rota esperada: DELETE /barbershops/:barbershopId/bookings/:bookingId
router.delete("/:bookingId", async (req, res) => {
  try {
    const { bookingId, barbershopId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: "ID do agendamento inválido." });
    }

    const booking = await Booking.findOneAndDelete({
      _id: bookingId,
      barbershop: barbershopId,
    });

    if (!booking) {
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }

    const barbershop = await Barbershop.findById(barbershopId);

    if (!barbershop) {
      return res.status(404).json({ error: "Barbearia não encontrada." });
    }

    const bookingDate = new Date(booking.time);

    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }).format(bookingDate);

    const message = `Olá ${booking.customer.name},\nInformamos que seu agendamento foi cancelado na ${barbershop.name} para o dia ${formattedDate} foi cancelado.`;

    sendWhatsAppConfirmation(booking.customer.phone, message);

    res.status(200).json({ message: "Agendamento excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir agendamento:", error);
    res.status(500).json({ error: "Falha ao excluir agendamento." });
  }
});

export default router;
