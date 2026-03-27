require('dotenv').config();
const { OpenAI } = require('openai');
const { Agent, Runner } = require('@openai/agents');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testAgent() {
  console.log("Starting Agent AI Verification...");

  try {
    // 1. Check if we can create an agent
    const agent = new Agent({
      name: "Test Agent",
      instructions: "You are a test assistant. Answer with 'Verification Success' if you can read this.",
      model: "gpt-4o-mini"
    });
    console.log("Agent instance created successfully.");

    // 2. Check if we can run the agent
    const runner = new Runner();
    const result = await runner.run(agent, [{ role: "user", content: [{ type: "input_text", text: "Hello, can you hear me?" }] }]);
    
    console.log("Agent run result:", result.finalOutput);
    if (result.finalOutput.includes("Verification Success")) {
      console.log("Basic Agent Run: PASSED");
    } else {
      console.log("Basic Agent Run: FAILED (Unexpected output)");
    }

    // 3. Vector Store Search Test
    if (client.vectorStores && client.vectorStores.search) {
      console.log("OpenAI Vector Store Search API: AVAILABLE");
    } else {
      console.log("OpenAI Vector Store Search API: NOT FOUND (Check SDK version)");
    }

  } catch (error) {
    console.error("Verification error:", error);
  }
}

testAgent();
