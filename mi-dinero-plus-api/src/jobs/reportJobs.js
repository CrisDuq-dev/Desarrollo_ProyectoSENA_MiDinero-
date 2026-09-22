const cron = require('node-cron')
const pool = require('../config/db')
const { buildUserReport } = require('../services/reportService')
const { sendFinancialReportEmail } = require('../services/emailService')

async function getReportRecipients() {
  const [rows] = await pool.query(
    `SELECT id, full_name, email
     FROM users
     WHERE email IS NOT NULL
       AND email <> ''
       AND (
         email_verified = 1
         OR google_id IS NOT NULL
         OR auth_provider = 'google'
       )`
  )
  return rows
}

async function sendReportsToAll(type) {
  const label = type === 'monthly' ? 'mensual' : 'semanal'
  console.log(`[reportJobs] Iniciando envío ${label}…`)

  let recipients
  try {
    recipients = await getReportRecipients()
  } catch (err) {
    console.error('[reportJobs] Error listando usuarios:', err.message)
    return
  }

  console.log(`[reportJobs] Destinatarios: ${recipients.length}`)

  let ok = 0
  let fail = 0

  for (const user of recipients) {
    try {
      const report = await buildUserReport(user.id, type)
      await sendFinancialReportEmail(report)
      ok += 1
      console.log(`[reportJobs] OK → ${user.email}`)
    } catch (err) {
      fail += 1
      console.error(`[reportJobs] Falló ${user.email}:`, err.message)
    }
  }

  console.log(`[reportJobs] Fin ${label}. OK=${ok} Fallos=${fail}`)
}

function startReportJobs() {
  const enabled = String(process.env.REPORT_CRON_ENABLED || 'true').toLowerCase()
  if (enabled === 'false' || enabled === '0') {
    console.log('[reportJobs] Desactivado (REPORT_CRON_ENABLED=false)')
    return
  }

  // Lunes 08:00 (Colombia)
  cron.schedule(
    '0 8 * * 1',
    () => {
      sendReportsToAll('weekly').catch((err) =>
        console.error('[reportJobs] weekly crash:', err.message)
      )
    },
    { timezone: 'America/Bogota' }
  )

  // Día 1 de cada mes 08:00
  cron.schedule(
    '0 8 1 * *',
    () => {
      sendReportsToAll('monthly').catch((err) =>
        console.error('[reportJobs] monthly crash:', err.message)
      )
    },
    { timezone: 'America/Bogota' }
  )

  console.log(
    '[reportJobs] Programado: lunes 08:00 (semanal) y día 1 08:00 (mensual) America/Bogota'
  )
}

module.exports = {
  startReportJobs,
  sendReportsToAll,
}