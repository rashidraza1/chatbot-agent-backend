const { OpenAI } = require('openai');
const { Agent, Runner, withTrace } = require('@openai/agents');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate bot response using @openai/agents Agent & Runner
 */
exports.generateBotResponse = async (bot, visitorMessage, faqs, ragContext = [], history = []) => {
  return await withTrace(`Bot_${bot.id}_Response`, async () => {
    try {
      // 1. Check if an FAQ matches directly
      if (faqs && Array.isArray(faqs)) {
        const match = faqs.find(faq => faq.question.toLowerCase() === visitorMessage.toLowerCase());
        if (match) return match.answer;
      }

      if (!bot.use_ai) {
        return "I'm sorry, an agent will be with you shortly.";
      }

      // 2. Define the Agent
      const agent = new Agent({
        name: bot.name || "AI Assistant",
        instructions: `

- ${bot.prompt || "Keep answers short, polite, and personalized."}

`,
        model: "gpt-4o", // Using gpt-4o as a reliable premium model
        modelSettings: {
          temperature: 0.7,
          maxTokens: 2048,
          store: true
        }
      });

      // 3. Prepare conversation history for the Runner
      // history items usually come as { role, content }
      // @openai/agents might expect AgentInputItem format
      const conversationHistory = history.map(item => ({
        role: item.role,
        content: [{ 
          type: item.role === "assistant" ? "output_text" : "input_text", 
          text: item.content 
        }]
      }));

      // Add the current user message
      conversationHistory.push({
        role: "user",
        content: [{ type: "input_text", text: visitorMessage }]
      });

      const runner = new Runner({
        traceMetadata: {
          _trace_source_: "chatbot-agent-backend",
          bot_id: bot.id.toString()
        }
      });

      // 4. Perform vector store search if bot has one
      // We can manually inject search results as additional context if the Agent SDK doesn't handle the tool automatically
      let searchContext = "";
      if (bot.vector_store_id) {
        console.log(`Searching vector store ${bot.vector_store_id} for context...`);
        try {
          const searchResult = await client.vectorStores.search(bot.vector_store_id, {
            query: visitorMessage,
            max_num_results: 5
          });
          searchContext = searchResult.data.map(r => {
            return (r.content && Array.isArray(r.content))
              ? r.content.map(c => c.text).join(" ")
              : "";
          }).join("\n\n---\n\n");
        } catch (err) {
          console.error("Vector search failed during response generation:", err);
        }
      }

      // If we have search context, we can append it to the prompt or as a specialized message
      // In the Agent pattern, we might want to use tools, but here we'll follow the user's pattern of injection if needed.
      // Actually, if the agent has "Use only information retrieved from the attached File Search knowledge base", 
      // and we don't have a real "tool" abstraction yet, we'll inject it into the instructions for this run.

      if (searchContext) {
        agent.instructions += `\n\nAPPROVED DOCUMENT CONTENT:\n${searchContext}`;
      }

      // 5. Run the agent
      const result = await runner.run(agent, conversationHistory);

      if (!result.finalOutput) {
        throw new Error("Agent result is undefined");
      }

      let finalResponse = result.finalOutput;

      // Clean up common unwanted statements if needed
      const unwantedStatement = /Welcome to Rsi concepts[.!]? I am (here )?to help you learn about products and services (and )?solutions?[.!]?/gi;
      finalResponse = finalResponse.replace(unwantedStatement, "").trim();

      return finalResponse;

    } catch (error) {
      console.error('OpenAI Agent Error:', error);
      const fs = require('fs');
      fs.appendFileSync('openai_error.log', `${new Date().toISOString()} | Bot ID: ${bot.id} | Error: ${error.stack}\n`);
      return "I'm having trouble connecting right now. Let me hand you over to a human agent.";
    }
  });
};

/**
 * Generate chat title
 */
exports.generateChatTitle = async (botId, firstMessage) => {
  try {
    const prompt = `Generate a short title (maximum 5 to 7 words) for a chat conversation that starts with the following message:\n\n"${firstMessage}"\n\nTitle clearly:`;
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });
    return completion.choices[0].message.content.replace(/["']/g, "").trim();
  } catch (err) {
    console.error('Failed to generate chat title:', err);
    return 'New Chat';
  }
};