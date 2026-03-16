const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  conversation_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sender_type: {
    type: DataTypes.ENUM('visitor', 'bot', 'agent'),
    allowNull: false,
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable for visitor or bot if id isn't explicitly defined
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  }
}, {
  timestamps: true,
  tableName: 'messages'
});

module.exports = Message;
