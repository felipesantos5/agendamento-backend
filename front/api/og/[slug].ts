import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.redirect(302, '/');
  }

  try {
    const apiUrl = process.env.VITE_BACKEND_URL || 'https://api.barbeariagendamento.com.br';
    const response = await fetch(`${apiUrl}/barbershops/slug/${slug}`);

    if (!response.ok) {
      return res.redirect(302, `/${slug}`);
    }

    const barbershop = await response.json();
    const siteUrl = `https://barbeariagendamento.com.br/${slug}`;
    const logoUrl = barbershop.logoUrl || 'https://barbeariagendamento.com.br/logo.jpg';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Agendar em ${barbershop.name}</title>

  <meta name="description" content="${barbershop.description || `Agende seu horário na ${barbershop.name}. Cortes, barba e tratamentos masculinos.`}" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${siteUrl}" />
  <meta property="og:title" content="${barbershop.name} - Agendamento Online" />
  <meta property="og:description" content="${barbershop.description || `Agende seu horário na ${barbershop.name} de forma online. Rápido, prático e seguro.`}" />
  <meta property="og:image" content="${logoUrl}" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:site_name" content="${barbershop.name}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${siteUrl}" />
  <meta name="twitter:title" content="${barbershop.name} - Agendamento Online" />
  <meta name="twitter:description" content="${barbershop.description || `Agende seu horário na ${barbershop.name} de forma online.`}" />
  <meta name="twitter:image" content="${logoUrl}" />

</head>
<body>
  <h1>${barbershop.name}</h1>
  <p>${barbershop.description || `Agende seu horário na ${barbershop.name}. Cortes, barba e tratamentos masculinos.`}</p>
  <a href="${siteUrl}">Acessar ${barbershop.name}</a>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Erro ao buscar barbearia:', error);
    return res.redirect(302, `/${slug}`);
  }
}
