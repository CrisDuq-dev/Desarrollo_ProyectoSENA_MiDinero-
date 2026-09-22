const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware') // o la ruta que uses
const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController')

// 1) Auth en TODAS las rutas de este router
router.use(authMiddleware)

// 2) Luego las rutas
router.get('/', getTransactions)
router.post('/', createTransaction)
router.put('/:id', updateTransaction)
router.delete('/:id', deleteTransaction)

module.exports = router
