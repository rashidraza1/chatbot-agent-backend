const { Conversation, Message, Bot, Visitor } = require('../models');

exports.getConversations = async (req, res) => {
  try {
    const bots = await Bot.findAll({ where: { user_id: req.user.id }, attributes: ['id'] });
    const botIds = bots.map(b => b.id);

    const conversations = await Conversation.findAll({
        where: { bot_id: botIds },
        include: [
            { model: Visitor, attributes: ['name', 'email', 'last_seen'] },
            { model: Bot, attributes: ['name'] }
        ],
        order: [['updatedAt', 'DESC']]
    });
    
    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error fetching conversations' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
        where: { conversation_id: req.params.id },
        order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server Error fetching messages' });
  }
};
