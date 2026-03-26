const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.generateBotResponse = async (bot, visitorMessage, faqs, ragContext = [], history = []) => {
  try {

    const pureGreetings = ["hi", "hello", "hey", "hey there", "hi there",
      "good morning", "good afternoon", "good evening", "good night",
      "greetings", "salam", "assalamualaikum", "namaste",
      "what's up", "whats up", "yo", "bye", "goodbye", "see you", "see you soon", "see you later", "see you tomorrow", "see you next time", "see you again", "see you soon", "see you later", "see you tomorrow", "see you next time", "see you again"];
    const trimmedMsg = visitorMessage.trim();
    if (pureGreetings.includes(trimmedMsg.toLowerCase())) {
      return `${trimmedMsg}, I’m here to help you learn about RSI Concepts and its products, services, and solutions. Please let me know what specific information you are looking for, and I will be happy to guide you.`;
    }
    // 1. Check if an FAQ matches directly
    if (faqs && Array.isArray(faqs)) {
      const match = faqs.find(faq => faq.question.toLowerCase() === visitorMessage.toLowerCase());
      if (match) return match.answer;
    }

    if (!bot.use_ai) {
      return "I'm sorry, an agent will be with you shortly.";
    }

    // 2. Build context string from RAG chunks
    let systemPrompt = '';
    const defaultPrompt = "You are a helpful customer support assistant. Answer clearly and politely.";
    const basePrompt = bot.prompt || defaultPrompt;

    if (ragContext && ragContext.length > 0) {
      const contextDocs = ragContext.map(r => r.content).join("\n\n---\n\n");

      systemPrompt = `
${basePrompt}
You are a professional AI assistant.

STRICT RULES:

Answer ONLY from the provided PDF content
Do NOT add any extra information
Do NOT include links
Keep wording as close as possible to the document

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

<2-3 lines summary strictly from document>

1) **Point 1**
2) **Point 2**
3) **Point 3**
4) **Point 4**
5) **Point 5**

IMPORTANT:

Use numbered lists exactly like shown (1), 2), etc.)
Bold ONLY the text of the key points using ** ** (e.g., 1) **Key Point Text**)
Do NOT write "Key Points", "Title", or any heading
Do NOT add any text before or after the format
Do NOT explain anything outside the format
Do NOT include any greeting like "Welcome to Rsi concepts" or "I am here to help you learn about products and services"
If exact 5 points are not available, use only available points
Use the EXACT wording from the document for both the summary and the points. Do NOT paraphrase, summarize, or rewrite.
Ensure proper spacing and line breaks between numbered points
Ensure there is a newline between each numbered point

CONTEXT:
${contextDocs}
`;
    }

    else {
      let contextString = '';
      if (faqs && faqs.length > 0) {
        contextString = `\nHere is some information you should know and use to answer questions: ${JSON.stringify(faqs)}`;
      }
      systemPrompt = `${basePrompt}\n\nYour name is ${bot.name}. Be helpful, polite, and concise. 
IMPORTANT: NEVER include the statement "Welcome to Rsi concepts. I am here to help you learn about products and services and solution." or any similar greeting.${contextString}`;
    }

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