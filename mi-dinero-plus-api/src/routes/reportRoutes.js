const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const {
  sendWeeklyReport,
  sendMonthlyReport,
  previewWeeklyReport,
  downloadReport,
} = require('../controllers/reportController')

// Todas las rutas de reportes requieren autenticación
router.use(authMiddleware)

router.get('/preview-weekly', previewWeeklyReport)
router.post('/send-weekly', sendWeeklyReport)
router.post('/send-monthly', sendMonthlyReport)
router.get('/download/:type', downloadReport)

module.exports = router