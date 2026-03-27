const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.generateBotResponse = async (bot, visitorMessage, faqs, ragContext = [], history = []) => {
  try {

    // 1. Check if an FAQ matches directly
    if (faqs && Array.isArray(faqs)) {
      const match = faqs.find(faq => faq.question.toLowerCase() === visitorMessage.toLowerCase());
      if (match) return match.answer;
    }

    if (!bot.use_ai) {
      return "I'm sorry, an agent will be with you shortly.";
    }

    const basePrompt = bot?.prompt || "";
    //console.log("Base Prompt:", basePrompt);

    // 2. Build context string from RAG chunks or FAQs
    const contextDocs = (ragContext && ragContext.length > 0)
      ? ragContext.map(r => r.content).join("\n\n---\n\n")
      : (faqs && faqs.length > 0)
        ? JSON.stringify(faqs)
        : "No document content provided.";

    const systemPrompt = `
          ${basePrompt}

Use only one short opening greeting line or one short closing greeting line when needed.

APPROVED DOCUMENT CONTENT:
${contextDocs}
`;

    //console.log("System Prompt:", systemPrompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: visitorMessage }
      ]
    });

    let finalResponse = completion.choices[0].message.content;

    // Remove the unwanted statement if present (extremely flexible regex for variations in punctuation, plurals, and wording)
    const unwantedStatement = /Welcome to Rsi concepts[.!]? I am (here )?to help you learn about products and services (and )?solutions?[.!]?/gi;
    finalResponse = finalResponse.replace(unwantedStatement, "").trim();

    return finalResponse;

  } catch (error) {
    console.error('OpenAI Error:', error);
    return "I'm having trouble connecting right now. Let me hand you over to a human agent.";
  }
};

exports.generateChatTitle = async (botId, firstMessage) => {
  try {
    const prompt = `Generate a short title (maximum 5 to 7 words) for a chat conversation that starts with the following message:\n\n"${firstMessage}"\n\nTitle clearly:`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });
    return completion.choices[0].message.content.replace(/["']/g, "").trim();
  } catch (err) {
    console.error('Failed to generate chat title:', err);
    return 'New Chat';
  }
};