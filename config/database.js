const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();
console.log("connecting...")
const mysql2 = require('mysql2');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    dialectModule: mysql2, // Critical fix for Vercel/serverless environments
    logging: false,
  }
);

module.exports = { sequelize };
