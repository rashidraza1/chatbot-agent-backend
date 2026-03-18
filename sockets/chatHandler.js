const { Conversation, Message, Bot, Visitor, User } = require('../models');
const { generateBotResponse } = require('../services/openaiService');
const { searchRelevantChunks } = require('../services/pdfService');

module.exports = (io, socket) => {
  console.log('New client connected:', socket.id);

  // Visitor joins a room based on conversation ID
  socket.on('join_conversation', async ({ conversationId, botId, visitorData }) => {
    try {
      let conversation;

      if (conversationId) {
        conversation = await Conversation.findByPk(conversationId, { include: [Bot, Visitor] });
        if (conversation) {
          socket.join(`conversation_${conversation.id}`);
          socket.emit('conversation_joined', { conversation });
          return;
        }
      }

      // If no conversation exists, create a new visitor and conversation
      const visitor = await Visitor.create({
        name: visitorData?.name || 'Anonymous',
        email: visitorData?.email || null,
        last_page_url: visitorData?.url || null
      });

      conversation = await Conversation.create({
        bot_id: botId,
        visitor_id: visitor.id,
        status: 'active'
      });

      // Fetch the bot with FAQs
      const bot = await Bot.findByPk(botId);

      socket.join(`conversation_${conversation.id}`);
      socket.emit('conversation_joined', { conversation, bot });
      
      // Auto-send welcome message
      if (bot.welcome_message) {
        const welcomeMessage = await Message.create({
          conversation_id: conversation.id,
          sender_type: 'bot',
          content: bot.welcome_message
        });
        io.to(`conversation_${conversation.id}`).emit('new_message', welcomeMessage);
      }
    } catch (error) {
       console.error('Error joining conversation', error);
    }
  });

  // Handle incoming messages from visitor
  socket.on('send_message', async ({ conversationId, content, senderType, senderId }) => {
    console.log(`Message received: ${content} from ${senderType} in conv ${conversationId}`);
    try {
      const message = await Message.create({
        conversation_id: conversationId,
        sender_type: senderType,
        sender_id: senderId || null,
        content
      });

      console.log('Message saved to DB, broadcasting to room:', `conversation_${conversationId}`);
      io.to(`conversation_${conversationId}`).emit('new_message', message);

      const conversation = await Conversation.findByPk(conversationId, { include: [Bot] });
      if (!conversation) {
        console.error(`Conversation ${conversationId} not found!`);
        return;
      }

      // If the sender is a visitor and the status is active, the bot should auto-reply
      if (senderType === 'visitor' && conversation.status === 'active') {
          console.log('Triggering bot response for conversation:', conversationId);
          // Emit typing indicator immediately
          io.to(`conversation_${conversationId}`).emit('bot_typing', true);

          setTimeout(async () => {
             try {
               // 1. Perform RAG Search against PDFs
               const ragContext = await searchRelevantChunks(conversation.Bot.id, content, 3);
               console.log(`Found ${ragContext.length} relevant PDF chunks for the query.`);

               // 2. Generate response with context
               const responseContent = await generateBotResponse(conversation.Bot, content, conversation.Bot.faqs, ragContext);
               console.log('Generated bot response:', responseContent);

               const botMessage = await Message.create({
                 conversation_id: conversationId,
                 sender_type: 'bot',
                 content: responseContent
               });

               io.to(`conversation_${conversationId}`).emit('bot_typing', false);
               io.to(`conversation_${conversationId}`).emit('new_message', botMessage);
             } catch (innerError) {
               console.error('Error in bot response timeout:', innerError);
               io.to(`conversation_${conversationId}`).emit('bot_typing', false);
             }
          }, 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Agent manually takes over
  socket.on('agent_join', async ({ conversationId, agentId }) => {
      try {
        const conversation = await Conversation.findByPk(conversationId);
        if (conversation) {
            await conversation.update({ status: 'human_handover' });
            socket.join(`conversation_${conversationId}`);
            io.to(`conversation_${conversationId}`).emit('agent_joined', { agentId });
        }
      } catch (error) {
          console.error(error);
      }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
};
