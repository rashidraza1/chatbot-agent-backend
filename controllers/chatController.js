const { Conversation, Message, Bot, Visitor } = require('../models');
const { generateBotResponse, generateChatTitle } = require('../services/openaiService');
const { searchRelevantChunks } = require('../services/pdfService');
const { sendLeadEmail } = require('../services/emailService');

// Helper to extract and handle lead data from AI response
const handleLeadCapture = async (content, visitorId) => {
  // Even more aggressive regex: remove from start of JSON/codeblock to end
  const leadMatch = content.match(/(\`{3}(json)?\s*)?\{[\s\S]*?"lead_capture"[\s\S]*(\}?\s*\`{3})?/);
  if (leadMatch) {
    let leadData = null;
    try {
      // Clean up JSON string: sometimes AI includes unescaped newlines inside strings
      let jsonString = leadMatch[0];
      jsonString = jsonString.replace(/\n/g, ' '); 
      leadData = JSON.parse(jsonString).lead_capture;
    } catch (parseErr) {
      console.warn("JSON.parse failed for lead capture, falling back to regex extraction.");
      // FALLBACK: Regex extraction if JSON.parse fails
      const text = leadMatch[0];
      const getField = (regex) => {
        const m = text.match(regex);
        return m ? m[1].trim() : null;
      };
      
      leadData = {
        name: getField(/"name"\s*:\s*"([^"]+)"/),
        email: getField(/"email"\s*:\s*"([^"]+)"/),
        mobile: getField(/"mobile"\s*:\s*"([^"]+)"/),
        enquiry: getField(/"enquiry"\s*:\s*"([^"]+)"/),
        status: getField(/"status"\s*:\s*"([^"]+)"/)
      };
    }

    if (leadData && (leadData.status === 'complete' || (leadData.name && (leadData.email || leadData.mobile)))) {
      // Update visitor as a lead
      const visitor = await Visitor.findByPk(visitorId);
      if (visitor) {
        await visitor.update({
          name: leadData.name || visitor.name,
          email: leadData.email || visitor.email,
          mobile: leadData.mobile || visitor.mobile,
          is_lead: true
        });

        // Send email notification
        await sendLeadEmail(leadData);
      }
    }
      // Return content without the JSON block
      return content.replace(leadMatch[0], '').trim();
    }
    return content;
};

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
      // Process lead capture if present
      const processedBotContent = await handleLeadCapture(responseContent, authId);

      const botMessage = await Message.create({
        conversation_id: conversation.id,
        sender_type: 'bot',
        content: processedBotContent
      });

      if (!isClosed) {
        res.write(`data: ${JSON.stringify({
          type: "done",
          conversation_id: conversation.id,
          title: conversation.title,
          userMessage,
          botMessage: { ...botMessage.toJSON(), content: processedBotContent } // Ensure stripped content is sent
        })}\n\n`);
        res.end();
      }
      return;
    }

    // Process lead capture if present
    const processedBotContent = await handleLeadCapture(responseContent, authId);

    const botMessage = await Message.create({
      conversation_id: conversation.id,
      sender_type: 'bot',
      content: processedBotContent
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
