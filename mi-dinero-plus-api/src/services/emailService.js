const fs = require('fs');
const path = require('path')
const { Resend } = require('resend')
const { formatMoneyCOP } = require('./reportService')

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.MAIL_FROM || 'MiDinero+ <onboarding@resend.dev>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const LOGO_PATH = path.join(__dirname, '../assets/logo-midinero.png')

function getLogoAttachment() {
  try {
    if (!fs.existsSync(LOGO_PATH)) {
      console.warn('Logo no encontrado en', LOGO_PATH)
      return null
    }
    const content = fs.readFileSync(LOGO_PATH)
    return {
      filename: 'logo-midinero.png',
      content,
      contentId: 'midinero-logo',
    }
  } catch (err) {
    console.warn('No se pudo leer el logo:', err.message)
    return null
  }
}

async function sendEmail({ to, subject, html, attachments }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY no configurada; correo no enviado:', subject, '→', to)
    return { skipped: true }
  }

  const payload = {
    from: FROM,
    to: [to],
    subject,
    html,
  }

  if (attachments && attachments.length > 0) {
    payload.attachments = attachments
  }

  const { data, error } = await resend.emails.send(payload)

  if (error) {
    console.error('Error enviando correo:', error)
    throw new Error(error.message || 'No se pudo enviar el correo')
  }

  return data
}

async function sendVerificationEmail(to, token) {
  const link = `${FRONTEND_URL}/verificar-email?token=${token}`
  return sendEmail({
    to,
    subject: 'Verifica tu correo — MiDinero+',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#0f172a">Verifica tu correo</h2>
        <p>Gracias por registrarte en <strong>MiDinero+</strong>.</p>
        <p>Para activar tu cuenta, haz clic en el botón:</p>
        <p style="margin:28px 0">
          <a href="${link}"
             style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">
            Verificar correo
          </a>
        </p>
        <p style="color:#64748b;font-size:14px">
          O copia este enlace en el navegador:<br/>
          <a href="${link}">${link}</a>
        </p>
        <p style="color:#64748b;font-size:13px">Este enlace vence en 24 horas.</p>
      </div>
    `,
  })
}

async function sendPasswordResetEmail(to, token) {
  const link = `${FRONTEND_URL}/recuperar-contrasena?token=${token}`
  return sendEmail({
    to,
    subject: 'Recuperar contraseña — MiDinero+',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#0f172a">Recuperar contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña en <strong>MiDinero+</strong>.</p>
        <p>Si fuiste tú, usa este botón:</p>
        <p style="margin:28px 0">
          <a href="${link}"
             style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">
            Crear nueva contraseña
          </a>
        </p>
        <p style="color:#64748b;font-size:14px">
          O copia este enlace:<br/>
          <a href="${link}">${link}</a>
        </p>
        <p style="color:#64748b;font-size:13px">
          El enlace vence en 1 hora. Si no pediste esto, ignora este correo.
        </p>
      </div>
    `,
  })
}

// =====================
// Reportes financieros
// =====================

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildGoalsHtml(goals) {
  if (!goals || goals.length === 0) {
    return `<p style="margin:0;color:#94a3b8;font-size:14px;">Aún no tienes metas de ahorro registradas. ¡Buen momento para crear la primera!</p>`
  }

  const rows = goals
    .map((g) => {
      const status =
        String(g.status || '').toLowerCase() === 'completed'
          ? 'Completada'
          : `${g.pct}% avanzado`
      return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #1f2937;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:4px;background:#16a34a;border-radius:4px;"></td>
              <td style="padding-left:12px;">
                <div style="font-size:14px;font-weight:800;color:#f1f5f9;">${escapeHtml(g.name)}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:4px;">
                  ${formatMoneyCOP(g.current)} de ${formatMoneyCOP(g.target)} · ${status}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    })
    .join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    <p style="margin:14px 0 0;color:#4ade80;font-size:13px;font-weight:700;">
      Sigue firme: cada abono te acerca a tus metas.
    </p>`
}

function buildDebtsHtml(debts) {
  if (!debts || debts.length === 0) {
    return `<p style="margin:0;color:#94a3b8;font-size:14px;">No tienes deudas registradas. ¡Excelente para tu salud financiera!</p>`
  }

  const rows = debts
    .map((d) => {
      let tiempo = 'Sin fecha límite'
      if (d.daysLeft != null) {
        if (d.daysLeft < 0) tiempo = `Vencida hace ${Math.abs(d.daysLeft)} día(s)`
        else if (d.daysLeft === 0) tiempo = 'Vence hoy'
        else tiempo = `Faltan ${d.daysLeft} día(s)`
      }
      return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #1f2937;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:4px;background:#dc2626;border-radius:4px;"></td>
              <td style="padding-left:12px;">
                <div style="font-size:14px;font-weight:800;color:#f1f5f9;">${escapeHtml(d.name)}</div>
                <div style="font-size:12px;color:#fca5a5;margin-top:4px;">
                  Pendiente: ${formatMoneyCOP(d.pending)} · ${tiempo}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    })
    .join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    <p style="margin:14px 0 0;color:#f87171;font-size:13px;font-weight:700;">
      Cada abono te acerca a estar limpio financieramente.
    </p>`
}

function buildReportEmailHtml(report, { hasLogo = false } = {}) {
  const { user, period, transactions: tx, goals, debts } = report
  const title =
    period.type === 'monthly'
      ? 'Tu reporte mensual — Mi Dinero+'
      : 'Tu reporte semanal — Mi Dinero+'

  const netColor = tx.netBalance >= 0 ? '#16a34a' : '#dc2626'
  const excelNote =
    period.type === 'monthly'
      ? `<p style="margin:12px 0 0;font-size:13px;color:#93c5fd;">
           📎 Adjuntamos un Excel profesional con el detalle del mes.
         </p>`
      : ''

  const brandBlock = hasLogo
    ? `
      <table cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
        <tr>
          <td style="vertical-align:middle;padding-right:12px;">
            <img src="cid:midinero-logo" width="48" height="48" alt="Mi Dinero+"
                 style="display:block;border:0;border-radius:10px;background:#fff;" />
          </td>
          <td style="vertical-align:middle;">
            <div style="font-size:18px;font-weight:700;font-style:italic;letter-spacing:0.02em;color:#ffffff;line-height:1.2;">
              Mi Dinero+
            </div>
            <div style="font-size:11px;color:#bfdbfe;margin-top:2px;">
              Meta Autos Medellín
            </div>
          </td>
        </tr>
      </table>`
    : `
      <p style="margin:0 0 6px;font-size:16px;font-weight:700;font-style:italic;letter-spacing:0.02em;color:#ffffff;">
        Mi Dinero+
      </p>`

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><title>${title}</title></head>
<body style="margin:0;padding:0;background:#0b1220;font-family:Nunito,Inter,Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b1220;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937;">
          <tr>
            <td style="padding:28px 28px 18px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;">
              ${brandBlock}
              <h1 style="margin:0;font-size:22px;line-height:1.3;">Hola, ${escapeHtml(user.firstName)} 👋</h1>
              <p style="margin:10px 0 0;font-size:14px;line-height:1.5;opacity:0.95;">
                Te deseamos lo mejor en tu aprendizaje financiero.
                Aquí tienes tu resumen <strong>${period.label}</strong>
                (${period.startDate} → ${period.endDate}).
              </p>
              ${excelNote}
            </td>
          </tr>

          <tr>
            <td style="padding:22px 28px 8px;">
              <h2 style="margin:0 0 12px;font-size:16px;color:#f1f5f9;">1. Transacciones</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;border:1px solid #1f2937;">
                <tr>
                  <td style="padding:14px;width:33%;text-align:center;">
                    <div style="font-size:12px;color:#94a3b8;">Ingresos</div>
                    <div style="font-size:15px;font-weight:800;color:#16a34a;margin-top:4px;">${tx.totalIncomeFormatted}</div>
                    <div style="font-size:11px;color:#64748b;">${tx.incomeCount} registro(s)</div>
                  </td>
                  <td style="padding:14px;width:33%;text-align:center;border-left:1px solid #1f2937;border-right:1px solid #1f2937;">
                    <div style="font-size:12px;color:#94a3b8;">Gastos</div>
                    <div style="font-size:15px;font-weight:800;color:#dc2626;margin-top:4px;">${tx.totalExpenseFormatted}</div>
                    <div style="font-size:11px;color:#64748b;">${tx.expenseCount} registro(s)</div>
                  </td>
                  <td style="padding:14px;width:33%;text-align:center;">
                    <div style="font-size:12px;color:#94a3b8;">Balance neto</div>
                    <div style="font-size:15px;font-weight:800;color:${netColor};margin-top:4px;">${tx.netBalanceFormatted}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 8px;">
              <h2 style="margin:0 0 12px;font-size:16px;color:#f1f5f9;">2. Metas de ahorro</h2>
              <div style="background:#0f172a;border-radius:12px;border:1px solid #1f2937;padding:14px;">
                ${buildGoalsHtml(goals)}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 8px;">
              <h2 style="margin:0 0 12px;font-size:16px;color:#f1f5f9;">3. Gestión de deudas</h2>
              <div style="background:#0f172a;border-radius:12px;border:1px solid #1f2937;padding:14px;">
                ${buildDebtsHtml(debts)}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 28px 28px;">
              <p style="margin:0;font-size:13px;line-height:1.55;color:#94a3b8;">
                Este mensaje es solo educativo (simulación). Sigue registrando movimientos,
                metas y deudas para que el próximo reporte sea aún más útil.
              </p>
              <p style="margin:14px 0 0;font-size:12px;color:#64748b;">
                © <span style="font-style:italic;">Mi Dinero+</span> · Meta Autos Medellín · SENA ADSO
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Envía el reporte semanal o mensual.
 * El mensual adjunta Excel automáticamente.
 * Incluye logo embebido si existe el archivo en src/assets.
 */
async function sendFinancialReportEmail(report, options = {}) {
  if (!report || !report.user || !report.user.email) {
    throw new Error('Reporte inválido: falta el correo del usuario')
  }

  const isMonthly = report.period.type === 'monthly'
  const subject = isMonthly
    ? 'Tu reporte mensual — Mi Dinero+'
    : 'Tu reporte semanal — Mi Dinero+'

  const attachments = []
  const logo = getLogoAttachment()
  if (logo) {
    attachments.push(logo)
  }

  const wantExcel = options.attachExcel === true || isMonthly
  if (wantExcel) {
    try {
      const {
        buildReportExcelBuffer,
        excelFilename,
      } = require('./excelReportService')

      const buffer = await buildReportExcelBuffer(report)
      attachments.push({
        filename: excelFilename(report),
        content: buffer,
      })
    } catch (err) {
      console.error('No se pudo generar Excel del reporte:', err.message)
    }
  }

  return sendEmail({
    to: report.user.email,
    subject,
    html: buildReportEmailHtml(report, { hasLogo: Boolean(logo) }),
    attachments: attachments.length ? attachments : undefined,
  })
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendFinancialReportEmail,
  buildReportEmailHtml,
}