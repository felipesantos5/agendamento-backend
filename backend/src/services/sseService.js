// Armazena as conexões SSE ativas, organizadas por barbershopId
const clients = new Map();

/**
 * Adiciona um novo cliente (conexão SSE) à lista para uma barbearia específica.
 * @param {string} barbershopId ID da barbearia.
 * @param {object} client A resposta (res) do Express que representa a conexão.
 */
function addClient(barbershopId, client) {
  if (!clients.has(barbershopId)) {
    clients.set(barbershopId, []);
  }
  clients.get(barbershopId).push(client);
  console.log(`[SSE] Cliente conectado para barbershop ${barbershopId}. Total: ${clients.get(barbershopId).length}`);
}

/**
 * Remove um cliente da lista (quando ele se desconecta).
 * @param {string} barbershopId ID da barbearia.
 * @param {object} client A resposta (res) do Express a ser removida.
 */
function removeClient(barbershopId, client) {
  const barbershopClients = clients.get(barbershopId);
  if (barbershopClients) {
    clients.set(
      barbershopId,
      barbershopClients.filter((c) => c !== client)
    );
    console.log(`[SSE] Cliente desconectado da barbershop ${barbershopId}. Restantes: ${clients.get(barbershopId).length}`);
    // Limpa o mapa se não houver mais clientes para essa barbearia
    if (clients.get(barbershopId).length === 0) {
      clients.delete(barbershopId);
    }
  }
}

/**
 * Envia um evento SSE para todos os clientes conectados a uma barbearia específica.
 * @param {string} barbershopId ID da barbearia para notificar.
 * @param {string} eventName Nome do evento (ex: 'new_booking').
 * @param {object} data Dados a serem enviados (opcional).
 */
function sendEventToBarbershop(barbershopId, eventName, data = {}) {
  const barbershopClients = clients.get(barbershopId);
  if (barbershopClients && barbershopClients.length > 0) {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    console.log(`[SSE] Enviando evento '${eventName}' para ${barbershopClients.length} cliente(s) da barbershop ${barbershopId}`);
    barbershopClients.forEach((client) => client.write(message));
  }
}

export { addClient, removeClient, sendEventToBarbershop };
