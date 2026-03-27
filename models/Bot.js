const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Bot = sequelize.define('Bot', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'AI Assistant',
  },
  avatar_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  color_theme: {
    type: DataTypes.STRING,
    defaultValue: '#007BFF',
  },
  welcome_message: {
    type: DataTypes.TEXT,
    defaultValue: 'Hello! How can I help you today?',
  },
  use_ai: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  faqs: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  vector_store_id: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true,
  tableName: 'bots'
});

module.exports = Bot;
