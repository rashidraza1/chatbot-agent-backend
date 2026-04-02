require('dotenv').config();
const { generateBotResponse } = require('./services/openaiService');

async function test() {
  const bot = {
    id: 1,
    name: "Test Bot",
    prompt: "You are a helpful assistant.",
    use_ai: true,
    vector_store_id: null
  };
  const visitorMessage = "Can you explain how to make a cup of coffee using your rules for streaming? Please be very descriptive but follow the short sentences and small chunks rule.";
  
  console.log("Starting stream...");
  try {
    let fullText = "";
    await generateBotResponse(bot, visitorMessage, [], [], [], (delta) => {
      process.stdout.write(delta);
      fullText += delta;
    });
    console.log("\n\nStream finished.");
    console.log("Full response length:", fullText.length);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
