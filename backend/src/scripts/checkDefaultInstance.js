// Script para verificar o status da instância padrão "teste"
import "dotenv/config";
import axios from "axios";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

async function checkDefaultInstance() {
  const instanceName = "teste";

  console.log("=== DIAGNÓSTICO DA INSTÂNCIA PADRÃO ===\n");
  console.log(`Evolution API URL: ${EVOLUTION_API_URL}`);
  console.log(`Instância: ${instanceName}\n`);

  const api = axios.create({
    baseURL: EVOLUTION_API_URL,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
    },
    timeout: 10000,
  });

  try {
    // 1. Verifica se a instância existe
    console.log("1. Verificando se a instância existe...");
    const statusResponse = await api.get(`/instance/connectionState/${instanceName}`);
    console.log("✅ Instância existe!");
    console.log("Status:", JSON.stringify(statusResponse.data, null, 2));
    console.log("");

    // 2. Verifica conexão
    const state = statusResponse.data?.state || statusResponse.data?.instance?.state;
    if (state === "open" || state === "connected") {
      console.log("✅ Instância CONECTADA e pronta para enviar mensagens\n");
    } else {
      console.log(`⚠️ Instância NÃO CONECTADA (estado: ${state})`);
      console.log("Para conectar, acesse a Evolution API e escaneie o QR code.\n");
    }

    // 3. Testa envio de mensagem (número de teste)
    console.log("3. Testando envio de mensagem...");
    console.log("⚠️ Pulando teste de envio (configure um número de teste se necessário)\n");

    // 4. Lista todas as instâncias
    console.log("4. Listando todas as instâncias...");
    try {
      const instancesResponse = await api.get("/instance/fetchInstances");
      const instances = Array.isArray(instancesResponse.data)
        ? instancesResponse.data
        : [instancesResponse.data];

      console.log(`\nTotal de instâncias: ${instances.length}`);
      instances.forEach((inst, index) => {
        console.log(`\n--- Instância ${index + 1} ---`);
        console.log(`Nome: ${inst.name || inst.instanceName}`);
        console.log(`Status: ${inst.connectionStatus || inst.state || inst.status}`);
        console.log(`Número: ${inst.ownerJid || inst.owner || "N/A"}`);
      });
    } catch (listError) {
      console.log("⚠️ Erro ao listar instâncias:", listError.message);
    }

    console.log("\n=== DIAGNÓSTICO CONCLUÍDO ===");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ ERRO NO DIAGNÓSTICO:");

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Erro: ${error.response.data?.error || error.response.statusText}`);
      console.error(`Detalhes:`, JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 404) {
        console.log("\n⚠️ A instância 'teste' NÃO EXISTE!");
        console.log("\nPara criar a instância 'teste', execute:");
        console.log(`curl -X POST "${EVOLUTION_API_URL}/instance/create" \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -H "apikey: ${EVOLUTION_API_KEY}" \\`);
        console.log(`  -d '{"instanceName":"teste","integration":"WHATSAPP-BAILEYS","qrcode":true}'`);
      }
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error("⏱️ TIMEOUT: A Evolution API não respondeu em 10 segundos");
      console.error("Verifique se o serviço está rodando e acessível.");
    } else {
      console.error("Código:", error.code);
      console.error("Mensagem:", error.message);
    }

    console.log("\n=== DIAGNÓSTICO FALHOU ===");
    process.exit(1);
  }
}

checkDefaultInstance();
