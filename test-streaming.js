require('dotenv').config();
const { generateBotStream } = require('./services/openaiService');

async function test() {
  const bot = {
    id: 1,
    name: "Test Bot",
    prompt: "You are a helpful assistant.",
    use_ai: true,
    vector_store_id: null
  };
  const visitorMessage = "Hello, who are you?";
  
  console.log("Starting stream...");
  try {
    const stream = await generateBotStream(bot, visitorMessage, [], [], []);
    
    let fullText = "";
    for await (const delta of stream.toTextStream()) {
      process.stdout.write(delta);
      fullText += delta;
    }
    console.log("\n\nStream finished.");
    console.log("Full response length:", fullText.length);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
