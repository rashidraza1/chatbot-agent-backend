const express = require('express');
const { register, login, guestLogin, getMe, captureLead } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/guest', guestLogin);
router.post('/guest/capture', protect, captureLead);
router.get('/me', protect, getMe);

module.exports = router;
