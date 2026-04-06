const { OpenAI } = require('openai');
const { Agent, Runner, withTrace } = require('@openai/agents');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate bot response using @openai/agents Agent & Runner
 */
exports.generateBotResponse = async (bot, visitorMessage, faqs, ragContext = [], history = [], onDelta) => {
  return await withTrace(`Bot_${bot.id}_Response`, async () => {
    try {
      // 1. Check if an FAQ matches directly (only for non-streaming for now, or handle separately)
      if (faqs && Array.isArray(faqs) && !onDelta) {
        const match = faqs.find(faq => faq.question.toLowerCase() === visitorMessage.toLowerCase());
        if (match) return match.answer;
      }

      if (!bot.use_ai) {
        const fallback = "I'm sorry, an agent will be with you shortly.";
        if (onDelta) onDelta(fallback);
        return fallback;
      }

      // 2. Define the Agent
      const agent = new Agent({
        name: bot.name || "AI Assistant",
        instructions: `${bot.prompt || "You are a helpful AI assistant."}
        
Your response MUST be optimized for real-time streaming display (like ChatGPT).

Follow these strict rules:
1) Write responses in a natural left-to-right flow, as if the text is being revealed progressively.
2) Use short sentences and small logical chunks so the output can be streamed smoothly.
3) Avoid very long paragraphs. Break content into multiple small lines.
4) Use natural pauses with punctuation (commas, periods) to help streaming feel realistic.
5) Do NOT dump the entire answer in one long block.
6) Structure responses in a conversational way and use a Friendly, Clear, and Human-like tone.
7) If explaining something, do it step-by-step.
8) Prefer incremental clarity instead of large complete explanations at once.
9) Keep formatting simple. If providing a numbered list, use the format 1), 2), 3) instead of 1., 2., 3.
10) Ensure the response feels like it is being typed in real-time.
`,
        model: "gpt-4o",
        modelSettings: {
          temperature: 0.7,
          maxTokens: 2048,
          store: true
        }
      });

      // 3. Prepare conversation history
      const conversationHistory = history.map(item => ({
        role: item.role,
        content: [{
          type: item.role === "assistant" ? "output_text" : "input_text",
          text: item.content
        }]
      }));

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

      // 4. Vector store search
      let searchContext = "";
      //if (bot.vector_store_id) {
      try {
        console.log("Vector store ID:", bot.vector_id);
        const searchResult = await client.vectorStores.search("vs_69c663be52948191941de261a6970ed6", {
          query: visitorMessage,
          max_num_results: 5
        });
        searchContext = searchResult.data.map(r => {
          return (r.content && Array.isArray(r.content))
            ? r.content.map(c => c.text).join(" ")
            : "";
        }).join("\n\n---\n\n");
      } catch (err) {
        console.error("Vector search failed:", err);
      }
      //}

      if (searchContext) {
        agent.instructions += `\n\nAPPROVED DOCUMENT CONTENT:\n${searchContext}`;
      }

      // 5. Run the agent
      // ✅ Run Agent
      let finalResponse = "";

      if (onDelta) {
        const result = await runner.run(agent, conversationHistory, { stream: true });

        for await (const chunk of result.toTextStream()) {
          // 🔥 IMPORTANT: no buffering here
          finalResponse += chunk;

          // send raw chunk
          onDelta(chunk);

          // small delay for smoothness
          await new Promise(r => setTimeout(r, 10));
        }
      }

      else {
        // ✅ Normal mode
        const result = await runner.run(agent, conversationHistory);

        if (!result.finalOutput) {
          throw new Error("Agent result is undefined");
        }

        finalResponse = result.finalOutput;
      }

      // Clean up and format
      const unwantedStatement = /Welcome to Rsi concepts[.!]? I am (here )?to help you learn about products and services (and )?solutions?[.!]?/gi;
      finalResponse = finalResponse.replace(unwantedStatement, "").trim();
      finalResponse = finalResponse.replace(/^(\d+)\.\s/gm, "$1) ");

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