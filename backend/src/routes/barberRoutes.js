// src/routes/barberRoutes.js
import express from "express";
import mongoose from "mongoose";
import Barber from "../models/Barber.js";
import AdminUser from "../models/AdminUser.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import {
  barberCreationSchema,
  barberUpdateSchema,
} from "../validations/barberValidation.js";
import { z } from "zod";
import {
  startOfDay,
  endOfDay,
  parseISO,
  isPast,
  areIntervalsOverlapping,
  format as formatDateFns,
} from "date-fns";
import { protectAdmin } from "../middleware/authAdminMiddleware.js";
import { requireRole } from "../middleware/authAdminMiddleware.js";
import { ptBR } from "date-fns/locale";
import crypto from "crypto";
import { checkIsHoliday } from "../services/holidayService.js";
import BlockedDay from "../models/BlockedDay.js";
import TimeBlock from "../models/TimeBlock.js";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
// import formatInTimeZone from date-fns-tz
import "dotenv/config";

const router = express.Router({ mergeParams: true }); // mergeParams é importante para acessar :barbershopId

const BRAZIL_TIMEZONE = "America/Sao_Paulo";

// Adicionar Barbeiro a uma Barbearia
// Rota: POST /barbershops/:barbershopId/barbers
router.post("/", protectAdmin, requireRole("admin"), async (req, res) => {
  try {
    // ... (sua validação de autorização) ...
    const data = barberCreationSchema.parse(req.body);

    const existingAdminUser = await AdminUser.findOne({ email: data.email });
    if (existingAdminUser) {
      return res.status(409).json({ error: "Este email já está em uso." });
    }

    const newBarber = await Barber.create({
      name: data.name,
      image: data.image,
      availability: data.availability,
      commission: data.commission,
      barbershop: req.params.barbershopId,
    });

    // ✅ GERAÇÃO DO TOKEN
    const setupToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(setupToken)
      .digest("hex");

    // O token expira em, por exemplo, 72 horas
    const tokenExpiration = Date.now() + 72 * 60 * 60 * 1000;

    if (newBarber) {
      await AdminUser.create({
        email: data.email,
        role: "barber",
        barbershop: req.params.barbershopId,
        barberProfile: newBarber._id,
        status: "pending",
        accountSetupToken: hashedToken,
        accountSetupTokenExpires: new Date(tokenExpiration),
      });
    }

    // ✅ Retorna o link de configuração para o admin frontend
    // Em um app real, você enviaria este link por email para data.email
    const setupLink = `${process.env.ADMIN_FRONTEND_URL}/configurar-senha/${setupToken}`;

    res.status(201).json({
      barber: newBarber,
      setupLink: setupLink, // O admin pode copiar e enviar este link para o barbeiro
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos.", details: e.errors });
    }
    console.error("Erro ao criar funcionário:", e);
    res.status(500).json({ error: e.message || "Erro ao criar funcionário." });
  }
});

// Listar Barbeiros de uma Barbearia
// Rota: GET /barbershops/:barbershopId/barbers
router.get("/", async (req, res) => {
  try {
    const barbershopId = new mongoose.Types.ObjectId(req.params.barbershopId);

    const barbers = await Barber.aggregate([
      // 1. Encontra todos os barbeiros que pertencem a esta barbearia
      {
        $match: { barbershop: barbershopId },
      },
      // 2. Faz o "JOIN" com a coleção 'adminusers'
      {
        $lookup: {
          from: "adminusers", // O nome da coleção no MongoDB (geralmente plural e minúsculo)
          localField: "_id", // O campo no modelo 'Barber'
          foreignField: "barberProfile", // O campo correspondente no modelo 'AdminUser'
          as: "loginInfo", // O nome do novo array que será adicionado com os dados do usuário
        },
      },
      // 3. O $lookup retorna um array. $unwind descontrói esse array para podermos acessar os campos.
      {
        $unwind: {
          path: "$loginInfo",
          preserveNullAndEmptyArrays: true, // Mantém barbeiros na lista mesmo que não tenham um login (importante!)
        },
      },
      // 4. Projeta (seleciona) os campos que queremos retornar para o frontend
      {
        $project: {
          _id: 1, // 1 significa incluir o campo
          name: 1,
          image: 1,
          availability: 1,
          email: "$loginInfo.email",
          commission: 1,
          // Pega o email de dentro do objeto 'loginInfo' que foi juntado
        },
      },
    ]);

    res.json(barbers);
  } catch (e) {
    console.error("Erro ao buscar funcionários:", e);
    res.status(500).json({ error: "Erro ao buscar funcionários." });
  }
});

// Rota: GET /barbershops/:barbershopId/barbers/:barberId/free-slots
router.get("/:barberId/free-slots", async (req, res) => {
  try {
    const { date, serviceId } = req.query;
    const { barberId } = req.params;

    if (!date || !serviceId) {
      return res
        .status(400)
        .json({ error: "Data e serviço são obrigatórios." });
    }

    // --- 1. SETUP DE DATAS (À PROVA DE FUSO HORÁRIO) ---
    // Converte a string de data recebida (ex: "2025-07-16") para um objeto Date
    // que representa o início do dia no fuso horário do Brasil.
    const selectedDate = toZonedTime(parseISO(date), BRAZIL_TIMEZONE);

    // --- 2. BUSCA DE DADOS EM PARALELO ---
    const [serviceDoc, barber, existingBookings, timeBlocks] =
      await Promise.all([
        Service.findById(serviceId).lean(),
        Barber.findById(barberId).lean(),
        // Busca agendamentos do dia, ignorando os cancelados
        Booking.find({
          barber: barberId,
          status: { $ne: "canceled" },
          time: {
            $gte: startOfDay(selectedDate),
            $lt: endOfDay(selectedDate),
          },
        })
          .populate("service", "duration")
          .lean(),
        // Busca bloqueios que se sobrepõem ao dia
        TimeBlock.find({
          barber: barberId,
          startTime: { $lt: endOfDay(selectedDate) },
          endTime: { $gt: startOfDay(selectedDate) },
        }).lean(),
      ]);

    if (!serviceDoc || !barber) {
      return res
        .status(404)
        .json({ error: "Serviço ou barbeiro não encontrado." });
    }
    const serviceDuration = serviceDoc.duration;

    // --- 3. DEFINIÇÃO DO HORÁRIO DE TRABALHO ---
    const dayOfWeekName = formatInTimeZone(
      selectedDate,
      BRAZIL_TIMEZONE,
      "EEEE",
      { locale: ptBR }
    );
    const workHours = barber.availability.find(
      (a) => a.day.toLowerCase() === dayOfWeekName.toLowerCase()
    );
    if (!workHours) return res.json([]);

    const [startH, startM] = workHours.start.split(":").map(Number);
    const [endH, endM] = workHours.end.split(":").map(Number);

    // Cria objetos Date que representam o início e o fim do expediente NO FUSO DO BRASIL
    const dayStart = toZonedTime(
      new Date(selectedDate).setHours(startH, startM, 0, 0),
      BRAZIL_TIMEZONE
    );
    const dayEnd = toZonedTime(
      new Date(selectedDate).setHours(endH, endM, 0, 0),
      BRAZIL_TIMEZONE
    );

    // --- 4. MAPEAMENTO DE TODOS OS INTERVALOS INDISPONÍVEIS ---
    // Une agendamentos e bloqueios em uma única lista de intervalos.
    // **A correção crucial é aqui**: `toZonedTime` garante que as datas UTC do banco
    // sejam tratadas como horários de Brasília para a lógica de comparação.
    const unavailableIntervals = [
      ...existingBookings.map((b) => ({
        start: toZonedTime(b.time, BRAZIL_TIMEZONE),
        end: new Date(
          toZonedTime(b.time, BRAZIL_TIMEZONE).getTime() +
            b.service.duration * 60000
        ),
      })),
      ...timeBlocks.map((b) => ({
        start: toZonedTime(b.startTime, BRAZIL_TIMEZONE),
        end: toZonedTime(b.endTime, BRAZIL_TIMEZONE),
      })),
    ];

    // --- 5. LÓGICA PARA ENCONTRAR OS HORÁRIOS LIVRES ---
    const availableSlots = [];
    let potentialSlotStart = new Date(dayStart);
    const nowInBrazil = toZonedTime(new Date(), BRAZIL_TIMEZONE);

    while (potentialSlotStart < dayEnd) {
      const potentialSlotEnd = new Date(
        potentialSlotStart.getTime() + serviceDuration * 60000
      );

      // Regra 1: O horário deve terminar dentro do expediente
      if (potentialSlotEnd > dayEnd) break;

      // Regra 2: O horário não pode ser no passado
      const isPastTime = isPast(potentialSlotStart);

      if (!isPastTime) {
        const potentialInterval = {
          start: potentialSlotStart,
          end: potentialSlotEnd,
        };

        // Regra 3: O horário não pode ter conflito com nenhum intervalo indisponível
        const hasConflict = unavailableIntervals.some((unavailable) =>
          areIntervalsOverlapping(potentialInterval, unavailable)
        );

        if (!hasConflict) {
          // Se passar em todas as regras, adiciona à lista
          availableSlots.push(potentialSlotStart);
        }
      }

      // Avança para o próximo possível horário de início (intervalo de 15 minutos)
      potentialSlotStart = new Date(potentialSlotStart.getTime() + 15 * 60000);
    }

    // --- 6. FORMATAÇÃO FINAL PARA O FRONTEND ---
    // Formata a lista final de objetos Date para strings "HH:mm" no fuso do Brasil.
    const finalSlots = availableSlots.map((slotDate) => ({
      time: formatInTimeZone(slotDate, BRAZIL_TIMEZONE, "HH:mm"),
      isBooked: false, // Por definição, todos os slots nesta lista estão livres
    }));

    res.json({ slots: finalSlots });
  } catch (error) {
    console.error("Erro ao buscar horários livres:", error);
    res.status(500).json({ error: "Erro interno ao processar a solicitação." });
  }
});

router.get("/bookings/barber", protectAdmin, async (req, res) => {
  try {
    const { role, barberProfileId, barbershopId } = req.adminUser; // Dados do token JWT

    let query = { barbershop: new mongoose.Types.ObjectId(barbershopId) };

    // Se a função for 'barber', adiciona o filtro para pegar apenas os agendamentos dele
    if (role === "barber") {
      if (
        !barberProfileId ||
        !mongoose.Types.ObjectId.isValid(barberProfileId)
      ) {
        return res.status(400).json({
          error: "Perfil de barbeiro inválido ou não associado a este usuário.",
        });
      }
      query.barber = new mongoose.Types.ObjectId(barberProfileId);
    }
    // Se a função for 'admin', o query buscará todos os agendamentos da barbearia

    const bookings = await Booking.find(query)
      .populate("barber", "name")
      .populate("service", "name price")
      .populate("customer", "name phone whatsapp") // Incluindo 'whatsapp' se existir
      .sort({ time: 1 }); // Ordena do mais próximo para o mais distante

    res.json(bookings);
  } catch (error) {
    console.error("Erro ao buscar agendamentos do usuário:", error);
    res.status(500).json({ error: "Erro interno ao buscar agendamentos." });
  }
});

// Rota: PUT /barbershops/:barbershopId/barbers/:barberId
router.put("/:barberId", protectAdmin, async (req, res) => {
  try {
    const { barbershopId, barberId } = req.params;

    // 1. Validação de Autorização: O admin está tentando editar um funcionário da sua própria barbearia?
    if (req.adminUser.barbershopId !== barbershopId) {
      return res.status(403).json({
        error: "Não autorizado a modificar funcionários desta barbearia.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(barberId)) {
      return res.status(400).json({ error: "ID do funcionário inválido." });
    }

    // 2. Validação dos Dados Recebidos
    const dataToUpdate = barberUpdateSchema.parse(req.body);

    // 3. Atualização Segura no Banco
    const updatedBarber = await Barber.findOneAndUpdate(
      { _id: barberId, barbershop: barbershopId }, // Condição garante que o barbeiro pertence à barbearia correta
      dataToUpdate, // Novos dados (nome, availability, image)
      { new: true, runValidators: true }
    );

    if (!updatedBarber) {
      return res
        .status(404)
        .json({ error: "Funcionário não encontrado nesta barbearia." });
    }

    res.json(updatedBarber);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados inválidos para atualização do funcionário.",
        details: e.errors,
      });
    }
    console.error("Erro ao atualizar funcionário:", e);
    res.status(500).json({ error: "Erro interno ao atualizar o funcionário." });
  }
});

// Rota: DELETE /barbershops/:barbershopId/barbers/:barberId
router.delete(
  "/:barberId",
  protectAdmin,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { barbershopId, barberId } = req.params;

      // 1. Validação de Autorização
      if (req.adminUser.barbershopId !== barbershopId) {
        return res.status(403).json({
          error: "Não autorizado a deletar funcionários desta barbearia.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(barberId)) {
        return res.status(400).json({ error: "ID do funcionário inválido." });
      }

      // Opcional: Verificar se o barbeiro tem agendamentos futuros antes de deletar
      const futureBookings = await Booking.findOne({
        barber: barberId,
        time: { $gte: new Date() },
      });

      if (futureBookings) {
        return res.status(400).json({
          error:
            "Não é possível deletar. Este funcionário possui agendamentos futuros.",
        });
      }

      // 2. Deleção Segura no Banco
      const deletedBarber = await Barber.findOneAndDelete({
        _id: barberId,
        barbershop: barbershopId, // Garante que só deleta o funcionário da barbearia correta
      });

      if (!deletedBarber) {
        return res
          .status(404)
          .json({ error: "Funcionário não encontrado nesta barbearia." });
      }

      res.json({
        message: "Funcionário deletado com sucesso.",
        barberId: deletedBarber._id,
      });
    } catch (e) {
      console.error("Erro ao deletar funcionário:", e);
      res.status(500).json({ error: "Erro interno ao deletar o funcionário." });
    }
  }
);

export default router;
