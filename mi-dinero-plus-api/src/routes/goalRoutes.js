const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const {
  getGoals,
  createGoal,
  updateGoal,
  addContribution,
  deleteGoal,
} = require('../controllers/goalController')

router.use(authMiddleware)

router.get('/', getGoals)
router.post('/', createGoal)
router.put('/:id', updateGoal)
router.post('/:id/contribute', addContribution)
router.delete('/:id', deleteGoal)

module.exports = router