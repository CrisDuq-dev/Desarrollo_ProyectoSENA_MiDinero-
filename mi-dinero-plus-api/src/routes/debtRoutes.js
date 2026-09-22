const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const {
  getDebts,
  createDebt,
  updateDebt,
  addPayment,
  deleteDebt,
} = require('../controllers/debtController')

router.use(authMiddleware)

router.get('/', getDebts)
router.post('/', createDebt)
router.put('/:id', updateDebt)
router.post('/:id/pay', addPayment)
router.delete('/:id', deleteDebt)

module.exports = router