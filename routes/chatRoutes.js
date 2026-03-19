const express = require('express');
const { processChat, getConversations, getConversationMessages, deleteConversation } = require('../controllers/chatController');

const router = express.Router();

router.post('/', processChat);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationMessages);
router.delete('/conversations/:id', deleteConversation);

module.exports = router;
