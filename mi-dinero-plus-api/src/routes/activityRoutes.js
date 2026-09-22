const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const {
  getActivities,
  getUnreadActivities,
  markAllAsRead,
  markAsRead,
  deleteActivity,
  clearAllActivities,
} = require('../controllers/activityController')

router.use(authMiddleware)

router.get('/', getActivities)
router.get('/unread', getUnreadActivities)
router.patch('/read-all', markAllAsRead)
router.delete('/clear', clearAllActivities)   
router.patch('/:id/read', markAsRead)
router.delete('/:id', deleteActivity)

module.exports = router