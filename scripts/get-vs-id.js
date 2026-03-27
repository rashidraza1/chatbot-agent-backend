require('dotenv').config();
const { Bot } = require('../models');

async function getVsId() {
  const bot = await Bot.findByPk(1);
  if (bot) {
    console.log('BOT_NAME:', bot.name);
    console.log('VS_ID:', bot.vector_store_id);
  } else {
    console.log('Bot 1 not found');
  }
}

getVsId();
