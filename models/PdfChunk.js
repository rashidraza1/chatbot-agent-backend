const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PdfChunk = sequelize.define('PdfChunk', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  bot_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pdf_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  embedding: {
    type: DataTypes.JSON,
    allowNull: false,
  }
}, {
  timestamps: true,
  tableName: 'pdf_chunks'
});

module.exports = PdfChunk;
