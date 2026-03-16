const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.generateBotResponse = async (bot, visitorMessage, faqs) => {
  try {
    // 1. Check if an FAQ matches directly (very basic matching for exact strings, ideally use embeddings, but doing basic included here)
    if (faqs && Array.isArray(faqs)) {
      const match = faqs.find(faq => faq.question.toLowerCase() === visitorMessage.toLowerCase());
      if (match) return match.answer;
    }

    if (!bot.use_ai) {
      return "I'm sorry, an agent will be with you shortly.";
    }

    // 2. Fallback to OpenAI
    const systemPrompt = `You are an AI assistant for a website. Your name is ${bot.name}.
    Be helpful, polite, and concise.
    ${faqs && faqs.length > 0 ? 'Here is some information you should know and use to answer questions: ' + JSON.stringify(faqs) : ''}
    `;

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
