const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middlewares/authMiddleware');
const { getAdvice, getMundoPlusReply } = require('../controllers/aiController');

const aiUserLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ai-user-${req.user?.id ?? 'anon'}`,
  message: {
    error: 'resting',
    message: 'Has usado mucho el asistente. Espera unos minutos.',
    reply: 'Has usado mucho el asistente por ahora. Espera unos minutos y vuelve a intentarlo.',
  },
});

router.use(authMiddleware);
router.use(aiUserLimiter);
router.post('/advice', getAdvice);
router.post('/mundo-plus', getMundoPlusReply);

module.exports = router;