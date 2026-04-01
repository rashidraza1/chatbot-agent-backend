const { Conversation, Message, Bot, Visitor } = require('../models');
const { generateBotResponse, generateChatTitle } = require('../services/openaiService');
const { searchRelevantChunks } = require('../services/pdfService');

exports.processChat = async (req, res) => {
  try {
    const { bot_id, conversation_id, content } = req.body;
    let conversation;

    const authId = req.user.id;
    const authType = req.userType;

    // ================================
    // 1. GET / CREATE CONVERSATION
    // ================================
    if (conversation_id) {
      conversation = await Conversation.findByPk(conversation_id, { include: [Bot] });
    }

    if (!conversation) {
      const title = await generateChatTitle(bot_id, content);

      conversation = await Conversation.create({
        bot_id,
        visitor_id: authType === 'guest' ? authId : null,
        user_id: authType === 'user' ? authId : null,
        title,
        status: 'active'
      });

      conversation = await Conversation.findByPk(conversation.id, { include: [Bot] });
    } else {
      // Sync user_id if upgrading from guest to logged-in
      if (authType === 'user' && !conversation.user_id) {
        await conversation.update({ user_id: authId });
      }
    }

    // ================================
    // 2. SAVE USER MESSAGE
    // ================================
    const userMessage = await Message.create({
      conversation_id: conversation.id,
      sender_type: 'visitor',
      sender_id: authId,
      content
    });

    if (conversation.status !== 'active') {
      return res.status(200).json({
        conversation_id: conversation.id,
        title: conversation.title,
        userMessage,
        info: 'Conversation requires agent handover or is closed'
      });
    }

    // ================================
    // 3. RAG + HISTORY
    // ================================
    const ragContext = await searchRelevantChunks(conversation.Bot.id, content, 3);

    const previousMessages = await Message.findAll({
      where: { conversation_id: conversation.id },
      order: [['createdAt', 'DESC']],
      limit: 11
    });

    const history = previousMessages
      .slice(1)
      .reverse()
      .map(msg => ({
        role: msg.sender_type === 'visitor' ? 'user' : 'assistant',
        content: msg.content
      }));

    let responseContent = "";
    const isStreaming = req.body.stream === true;

    // ================================
    // 🔥 4. STREAMING MODE
    // ================================
    if (isStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      res.flushHeaders();
      req.setTimeout(0);

      res.write(`data: ${JSON.stringify({ type: "start" })}\n\n`);

      let isClosed = false;

      req.on("close", () => {
        isClosed = true;
      });

      responseContent = await generateBotResponse(
        conversation.Bot,
        content,
        conversation.Bot.faqs || [],
        ragContext,
        history,
        (delta) => {
          if (isClosed) return;
          res.write(`data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`);
          if (res.flush) res.flush();
        }
      );

      // 5. SAVE BOT MESSAGE
      const botMessage = await Message.create({
        conversation_id: conversation.id,
        sender_type: 'bot',
        content: responseContent
      });

      if (!isClosed) {
        res.write(`data: ${JSON.stringify({
          type: "done",
          conversation_id: conversation.id,
          title: conversation.title,
          userMessage,
          botMessage
        })}\n\n`);
        res.end();
      }
      return;
    }

    // ================================
    // 6. NORMAL MODE
    // ================================
    responseContent = await generateBotResponse(
      conversation.Bot,
      content,
      conversation.Bot.faqs || [],
      ragContext,
      history
    );

    const botMessage = await Message.create({
      conversation_id: conversation.id,
      sender_type: 'bot',
      content: responseContent
    });

    return res.status(200).json({
      conversation_id: conversation.id,
      title: conversation.title,
      userMessage,
      botMessage
    });

  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: 'Failed to process chat', details: error.message });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const { bot_id } = req.query;
    const authId = req.user.id;
    const authType = req.userType;

    if (!bot_id) return res.status(400).json({ error: 'bot_id is required' });

    const conversations = await Conversation.findAll({
      where: { 
        bot_id,
        [authType === 'user' ? 'user_id' : 'visitor_id']: authId
      },
      order: [['updatedAt', 'DESC']]
    });
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await Message.findAll({
      where: { conversation_id: id },
      order: [['createdAt', 'ASC']]
    });
    const conversation = await Conversation.findByPk(id);
    res.json({ conversation, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    await Message.destroy({ where: { conversation_id: id } });
    await Conversation.destroy({ where: { id } });
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};
