const express = require('express');
const { processChat, getConversations, getConversationMessages, deleteConversation } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', protect, processChat);
router.get('/conversations', protect, getConversations);
router.get('/conversations/:id', protect, getConversationMessages);
router.delete('/conversations/:id', protect, deleteConversation);

module.exports = router;
