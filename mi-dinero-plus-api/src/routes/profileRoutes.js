const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getProfile,
  updateProfile,
  updateSettings,
  updateUser,
  changePassword,
  resetSimulation,
} = require('../controllers/profileController');

router.use(authMiddleware);

router.get('/', getProfile);
router.put('/profile', updateProfile);
router.put('/settings', updateSettings);
router.put('/user', updateUser);
router.put('/password', changePassword);
router.post('/reset-simulation', resetSimulation);

module.exports = router;