const express = require('express');
const { getConversations, getMessages } = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/', getConversations);
router.get('/:id/messages', getMessages);

module.exports = router;
