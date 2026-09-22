const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getAdvice, getMundoPlusReply } = require('../controllers/aiController');

router.use(authMiddleware);
router.post('/advice', getAdvice);
router.post('/mundo-plus', getMundoPlusReply);

module.exports = router;