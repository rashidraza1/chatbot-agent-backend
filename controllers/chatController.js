const { Conversation, Message, Bot, Visitor } = require('../models');
const { generateBotResponse, generateChatTitle } = require('../services/openaiService');
const { searchRelevantChunks } = require('../services/pdfService');

exports.processChat = async (req, res) => {
  try {
    const { bot_id, conversation_id, user_id, content } = req.body;
    let conversation;

    if (conversation_id) {
      conversation = await Conversation.findByPk(conversation_id, { include: [Bot] });
    }

    if (!conversation) {
      // Create new conversation
      const visitor = await Visitor.create({
        name: 'Guest',
        last_page_url: req.headers.referer || null
      });

      // Generate title
      const title = await generateChatTitle(bot_id, content);

      conversation = await Conversation.create({
        bot_id,
        visitor_id: visitor.id,
        user_id: user_id || null, // Optional user_id
        title,
        status: 'active'
      });
      // Need to re-fetch with Bot
      conversation = await Conversation.findByPk(conversation.id, { include: [Bot] });
    } else {
      // If conversation exists but user logs in midway
      if (user_id && !conversation.user_id) {
        await conversation.update({ user_id });
      }
    }

    // Save visitor message
    const userMessage = await Message.create({
      conversation_id: conversation.id,
      sender_type: 'visitor',
      sender_id: user_id || conversation.visitor_id,
      content
    });

    // Touch conversation to update updatedAt
    await conversation.update({ updatedAt: new Date() });

    if (conversation.status === 'active') {
       // 1. Perform RAG Search against PDFs
       const ragContext = await searchRelevantChunks(conversation.Bot.id, content, 3);
       
       // 2. Fetch recent conversation history (last 10 messages)
       const previousMessages = await Message.findAll({
         where: { conversation_id: conversation.id },
         order: [['createdAt', 'DESC']],
         limit: 11 // Include current user message which was just saved
       });

       // Reverse to get chronological order and format for OpenAI
       // We skip the first one because it's the current message we just saved above
       const history = previousMessages
         .slice(1)
         .reverse()
         .map(msg => ({
           role: msg.sender_type === 'visitor' ? 'user' : 'assistant',
           content: msg.content
         }));

       // 3. Generate response with context and history
       const responseContent = await generateBotResponse(
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

       // Touch conversation to update updatedAt
       await conversation.update({ updatedAt: new Date() });

       return res.status(200).json({
         conversation_id: conversation.id,
         title: conversation.title,
         userMessage,
         botMessage
       });
    } else {
      return res.status(200).json({
        conversation_id: conversation.id,
        title: conversation.title,
        userMessage,
        info: 'Conversation requires agent handover or is closed'
      });
    }
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: 'Failed to process chat', details: error.message });
  }
};


exports.getConversations = async (req, res) => {
  try {
    const { user_id, bot_id } = req.query;
    if (!user_id || !bot_id) return res.status(400).json({ error: 'user_id and bot_id are required' });

    const conversations = await Conversation.findAll({
      where: { user_id, bot_id },
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

