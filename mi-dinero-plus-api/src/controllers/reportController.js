const { buildUserReport } = require('../services/reportService')
const { sendFinancialReportEmail } = require('../services/emailService')
const {
  buildReportExcelBuffer,
  excelFilename,
} = require('../services/excelReportService')

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

/**
 * GET /api/reports/download/:type   (type = weekly | monthly)
 * Descarga el reporte en Excel directamente al equipo del usuario.
 */
async function downloadReport(req, res) {
  try {
    const userId = req.user && (req.user.id || req.user.userId)
    if (!userId) {
      return res.status(401).json({ message: 'No autenticado' })
    }

    const type = req.params.type
    if (type !== 'weekly' && type !== 'monthly') {
      return res.status(400).json({ message: 'Tipo de reporte inválido' })
    }

    const report = await buildUserReport(userId, type)
    const buffer = await buildReportExcelBuffer(report)

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${excelFilename(report)}"`
    )
    res.setHeader('Cache-Control', 'no-store')
    return res.send(Buffer.from(buffer))
  } catch (err) {
    console.error('downloadReport:', err.message)
    return res.status(500).json({
      message: err.message || 'No se pudo generar el reporte',
    })
  }
}

module.exports = {
  sendWeeklyReport,
  sendMonthlyReport,
  previewWeeklyReport,
  downloadReport,
}