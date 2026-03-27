require('dotenv').config();
const { Bot } = require('../models');
const { generateBotResponse } = require('../services/openaiService');

async function debugChat() {
  console.log("Simulating chat request...");
  
  try {
    // Mock bot with id 1
    const bot = await Bot.findByPk(1);
    if (!bot) {
      console.error("Bot 1 not found in database. Please ensure DB is seeded.");
      return;
    }

    const visitorMessage = "About RSI Concept";
    const faqs = bot.faqs || [];
    const ragContext = [];
    const history = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hello! How can I help you today?" }
    ];

    console.log("Calling generateBotResponse...");
    const response = await generateBotResponse(bot, visitorMessage, faqs, ragContext, history);
    
    console.log("Response:", response);
    if (response.includes("trouble connecting")) {
      console.log("Reproduced Error: Connection Fallback Message Received.");
    } else {
      console.log("Success: Bot responded normally.");
    }

  } catch (err) {
    console.error("DEBUG ERROR:", err);
  }
}

debugChat();
