const { buildUserReport } = require('../services/reportService')
const { sendFinancialReportEmail } = require('../services/emailService')

/**
 * POST /api/reports/send-weekly
 * Envía al usuario autenticado su reporte semanal por correo.
 */
async function sendWeeklyReport(req, res) {
  try {
    const userId = req.user && (req.user.id || req.user.userId)
    if (!userId) {
      return res.status(401).json({ message: 'No autenticado' })
    }

    const report = await buildUserReport(userId, 'weekly')
    await sendFinancialReportEmail(report)

    return res.json({
      message: 'Reporte semanal enviado',
      period: report.period,
      to: report.user.email,
      summary: {
        incomeCount: report.transactions.incomeCount,
        expenseCount: report.transactions.expenseCount,
        netBalance: report.transactions.netBalanceFormatted,
        goals: report.goals.length,
        debts: report.debts.length,
      },
    })
  } catch (err) {
    console.error('sendWeeklyReport:', err.message)
    return res.status(500).json({
      message: err.message || 'No se pudo enviar el reporte semanal',
    })
  }
}

/**
 * POST /api/reports/send-monthly
 * Envía al usuario autenticado su reporte mensual por correo.
 */
async function sendMonthlyReport(req, res) {
  try {
    const userId = req.user && (req.user.id || req.user.userId)
    if (!userId) {
      return res.status(401).json({ message: 'No autenticado' })
    }

    const report = await buildUserReport(userId, 'monthly')
    await sendFinancialReportEmail(report)

    return res.json({
      message: 'Reporte mensual enviado',
      period: report.period,
      to: report.user.email,
      summary: {
        incomeCount: report.transactions.incomeCount,
        expenseCount: report.transactions.expenseCount,
        netBalance: report.transactions.netBalanceFormatted,
        goals: report.goals.length,
        debts: report.debts.length,
      },
    })
  } catch (err) {
    console.error('sendMonthlyReport:', err.message)
    return res.status(500).json({
      message: err.message || 'No se pudo enviar el reporte mensual',
    })
  }
}

/**
 * GET /api/reports/preview-weekly
 * Devuelve el JSON del reporte (sin enviar correo) para depurar.
 */
async function previewWeeklyReport(req, res) {
  try {
    const userId = req.user && (req.user.id || req.user.userId)
    if (!userId) {
      return res.status(401).json({ message: 'No autenticado' })
    }

    const report = await buildUserReport(userId, 'weekly')
    return res.json(report)
  } catch (err) {
    console.error('previewWeeklyReport:', err.message)
    return res.status(500).json({
      message: err.message || 'No se pudo generar el preview',
    })
  }
}

module.exports = {
  sendWeeklyReport,
  sendMonthlyReport,
  previewWeeklyReport,
}