import Lead from '../models/LeadForm.js';

// Função auxiliar para formatar a mensagem do Discord (Embed fica mais profissional)
const createDiscordPayload = (lead) => {
  return {
    embeds: [{
      title: "🚀 Novo Lead Qualificado!",
      color: 5814783, // Green/Teal
      fields: [
        // Section 1: Contact Info
        { name: "👤 Nome", value: lead.name, inline: true },
        { name: "📧 Email", value: lead.email, inline: true },
        { name: "📱 Telefone", value: lead.phone || "N/A", inline: true },
        
        // Section 2: Business Context (The "Pain" Points)
        { name: "💈 Barbeiros", value: lead.barberCount || "-", inline: true },
        { name: "📅 Agendamento", value: lead.schedulingMethod || "-", inline: true },
        { name: "💰 Financeiro", value: lead.financialControlMethod || "-", inline: true },
        
        // Section 3: Message
        { name: "💬 Mensagem", value: lead.message }
      ],
      footer: { text: `Lead ID: ${lead._id}` },
      timestamp: new Date().toISOString()
    }]
  };
};

export const createLead = async (req, res) => {
  try {
    // 1. Destructure all fields including the new financial one
    const { 
      name, 
      email, 
      phone, 
      message, 
      barberCount, 
      schedulingMethod,
      financialControlMethod 
    } = req.body;

    // 2. Validate essential fields
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields (name, email, message)." });
    }

    // 3. Save to MongoDB
    const newLead = await Lead.create({ 
      name, 
      email, 
      phone, 
      message,
      barberCount,
      schedulingMethod,
      financialControlMethod
    });

    // 4. Send to Discord (Non-blocking)
    const discordUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (discordUrl) {
      fetch(discordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createDiscordPayload(newLead))
      }).catch(err => console.error('[Discord] Webhook Error:', err));
    }

    return res.status(201).json({ 
      success: true, 
      message: "Lead created successfully." 
    });

  } catch (error) {
    console.error('[Controller] Lead creation error:', error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
};