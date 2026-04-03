const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Visitor = sequelize.define('Visitor', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mobile: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_lead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  last_page_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  last_seen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  timestamps: true,
  tableName: 'visitors'
});

module.exports = Visitor;
