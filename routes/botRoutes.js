const express = require('express');
const { createBot, getBots, getBotById, updateBot, deleteBot, getWidgetBotConfig } = require('../controllers/botController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public route for the widget
router.get('/:id/widget', getWidgetBotConfig);

// Protected routes
router.use(protect);
router.post('/', createBot);
router.get('/', getBots);
router.get('/:id', getBotById);
router.put('/:id', updateBot);
router.delete('/:id', deleteBot);

module.exports = router;
