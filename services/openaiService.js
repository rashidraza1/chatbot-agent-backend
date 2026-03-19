const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.generateBotResponse = async (bot, visitorMessage, faqs, ragContext = []) => {
  try {
    // 1. Check if an FAQ matches directly
    if (faqs && Array.isArray(faqs)) {
      const match = faqs.find(faq => faq.question.toLowerCase() === visitorMessage.toLowerCase());
      if (match) return match.answer;
    }

    if (!bot.use_ai) {
      return "I'm sorry, an agent will be with you shortly.";
    }

    // 2. Build context string from RAG chunks
    let contextString = '';
    if (ragContext && ragContext.length > 0) {
      const contextDocs = ragContext.map(r => r.content).join("\n\n---\n\n");
      contextString = `\nHere is extracted information from the company's documents. You MUST answer the user's question using ONLY the provided context below. If you cannot find the answer in the context, say "I don't know." Do not make up information.\n\nContext:\n${contextDocs}`;
    } else if (faqs && faqs.length > 0) {
      contextString = `\nHere is some information you should know and use to answer questions: ${JSON.stringify(faqs)}`;
    }

    // 3. Fallback to OpenAI
    const systemPrompt = `You are an AI assistant for a website. Your name is ${bot.name}. Be helpful, polite, and concise.${contextString}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: visitorMessage }
      ]
    });

    return completion.choices[0].message.content;

  } catch (error) {
    console.error('OpenAI Error:', error);
    return "I'm having trouble connecting right now. Let me hand you over to a human agent.";
  }
};

exports.generateChatTitle = async (botId, firstMessage) => {
  try {
    const prompt = `Generate a short title (maximum 5 to 7 words) for a chat conversation that starts with the following message:\n\n"${firstMessage}"\n\nTitle clearly:`;
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });
    return completion.choices[0].message.content.replace(/["']/g, "").trim();
  } catch (err) {
    console.error('Failed to generate chat title:', err);
    return 'New Chat';
  }
};
