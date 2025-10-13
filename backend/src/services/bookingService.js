// services/bookingService.js
import Booking from "../models/Booking.js"; // Ajuste o caminho conforme sua estrutura

export const updateExpiredBookings = async () => {
  try {
    // Pega a data/hora atual no timezone de São Paulo
    const now = new Date();

    const result = await Booking.updateMany(
      {
        time: { $lt: now }, // Data/hora menor que agora
        status: { $in: ["booked", "confirmed"] }, // Apenas os que não foram finalizados
      },
      {
        $set: {
          status: "completed",
          updatedAt: now, // Opcional: registrar quando foi atualizado automaticamente
        },
      }
    );

    return result.modifiedCount;
  } catch (error) {
    console.error("❌ Erro ao atualizar bookings expirados:", error);
    return 0;
  }
};
