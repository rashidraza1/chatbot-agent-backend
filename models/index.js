const { sequelize } = require('../config/database');

const User = require('./User');
const Bot = require('./Bot');
const Visitor = require('./Visitor');
const Conversation = require('./Conversation');
const Message = require('./Message');
const PdfDocument = require('./PdfDocument');
const PdfChunk = require('./PdfChunk');

// Associations
User.hasMany(Bot, { foreignKey: 'user_id' });
Bot.belongsTo(User, { foreignKey: 'user_id' });

Bot.hasMany(Conversation, { foreignKey: 'bot_id' });
Conversation.belongsTo(Bot, { foreignKey: 'bot_id' });

Visitor.hasMany(Conversation, { foreignKey: 'visitor_id' });
Conversation.belongsTo(Visitor, { foreignKey: 'visitor_id' });

Conversation.hasMany(Message, { foreignKey: 'conversation_id' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' });

Bot.hasMany(PdfDocument, { foreignKey: 'bot_id' });
PdfDocument.belongsTo(Bot, { foreignKey: 'bot_id' });

PdfDocument.hasMany(PdfChunk, { foreignKey: 'pdf_id', onDelete: 'CASCADE' });
PdfChunk.belongsTo(PdfDocument, { foreignKey: 'pdf_id' });

Bot.hasMany(PdfChunk, { foreignKey: 'bot_id', onDelete: 'CASCADE' });
PdfChunk.belongsTo(Bot, { foreignKey: 'bot_id' });

module.exports = {
  sequelize,
  User,
  Bot,
  Visitor,
  Conversation,
  Message,
  PdfDocument,
  PdfChunk
};

