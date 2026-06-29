// api/submit.js
// Esta función recibe los datos del formulario, los guarda en Airtable
// y envía un correo de confirmación con recomendaciones vía Resend.

export default async function handler(req, res) {
  // Solo aceptar peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, edad, correo, whatsapp, tiempo, puntaje, nivel, respuestas } = req.body;

    // Validación mínima
    if (!nombre || !correo) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // Nombres exactos de las 17 columnas en Airtable, en el mismo orden que las preguntas
    const columnasPreguntas = [
      'P1 - Hinchazón abdominal',
      'P2 - Gases/flatulencia',
      'P3 - Dolor abdominal',
      'P4 - Tránsito intestinal',
      'P5 - Digestiones pesadas',
      'P6 - Nivel de energía',
      'P7 - Niebla mental',
      'P8 - Estado de ánimo',
      'P9 - Problemas de piel',
      'P10 - Peso corporal',
      'P11 - Sistema inmune',
      'P12 - Intolerancias/alergias',
      'P13 - Alimentación habitual',
      'P14 - Nivel de estrés',
      'P15 - Calidad de sueño',
      'P16 - Migrañas/alergias',
      'P17 - Enfermedad autoinmune',
    ];

    // Construir el objeto de campos: datos del formulario + las 17 respuestas
    const fields = {
      Nombre: nombre,
      Edad: edad,
      Correo: correo,
      WhatsApp: whatsapp,
      'Tiempo con síntomas': tiempo,
      'Puntaje': puntaje,
      'Nivel de resultado': nivel,
    };

    if (Array.isArray(respuestas)) {
      columnasPreguntas.forEach((nombreColumna, i) => {
        if (respuestas[i] !== undefined) {
          fields[nombreColumna] = respuestas[i];
        }
      });
    }

    // ── 1. Guardar el registro en Airtable ──
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    );

    if (!airtableRes.ok) {
      const errorData = await airtableRes.json();
      console.error('Error de Airtable:', errorData);
      // No detenemos el flujo: igual intentamos enviar el correo
    }

    // ── 2. Enviar correo con Resend ──
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Restauración Digestiva <recomendaciones@restauraciondigestiva.com>',
        to: [correo],
        subject: `${nombre}, aquí están tus recomendaciones de salud digestiva 🌿`,
        html: buildEmailHtml(nombre, nivel),
      }),
    });

    if (!emailRes.ok) {
      const errorData = await emailRes.json();
      console.error('Error de Resend:', errorData);
      return res.status(500).json({ error: 'No se pudo enviar el correo' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error general:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Plantilla simple del correo. Puedes personalizarla más adelante.
function buildEmailHtml(nombre, nivel) {
  return `
  <div style="font-family: -apple-system, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #333;">
    <h2 style="color: #6c4fb6;">Hola, ${nombre} 🌿</h2>
    <p>Gracias por completar el Diagnóstico de Salud Digestiva. Tu resultado fue: <strong>${nivel}</strong>.</p>
    <p>Aquí van algunas recomendaciones generales que podrían ayudarte a empezar en tu proceso de recuperar tu salud digestiva:</p>
    <ul style="line-height: 1.8;">
      <li>Mastica despacio y evita comer apurada o distraída.</li>
      <li>Prioriza alimentos enteros y reduce ultraprocesados.</li>
      <li>Mantén horarios regulares de comida.</li>
      <li>Hidrátate adecuadamente durante el día.</li>
      <li>Observa cómo reacciona tu cuerpo a ciertos alimentos.</li>
    </ul>
    <p>Si quieres profundizar en tu caso particular, puedes agendar una sesión conmigo aquí:</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="https://calendly.com/ponce-liz/45min" style="background: #8bc34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        📅 Agendar mi sesión
      </a>
    </p>
    <p style="font-size: 13px; color: #888;">Con cariño,<br>Liz</p>
  </div>
  `;
}
