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
    let systemPrompt = '';
    const defaultPrompt = "You are a helpful customer support assistant. Answer clearly and politely.";
    const basePrompt = bot.prompt || defaultPrompt;

    console.log("base Promt", basePrompt)

    //     if (ragContext && ragContext.length > 0) {
    //       const contextDocs = ragContext.map(r => r.content).join("\n\n---\n\n");
    //       systemPrompt = `You are a professional AI assistant.

    // STRICT RULES:
    // * Answer ONLY from the provided PDF content
    // * Do NOT add any extra information
    // * Do NOT include links
    // * Do NOT rewrite too much
    // * Keep wording as close as possible to the document

    // FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
    // Title:
    // <Main heading from the document>

    // Description:
    // <2-3 lines summary strictly from document>

    // Key Points:
    // * Point 1
    // * Point 2
    // * Point 3
    // * Point 4
    // * Point 5

    // Keywords: <comma separated keywords from document if available>

    // IMPORTANT:
    // * Use bullet points exactly like shown
    // * Do not add explanations outside this format
    // * If data is missing, skip that section



    // CONTEXT:
    // ${contextDocs}`;
    //     }
    if (ragContext && ragContext.length > 0) {
      const contextDocs = ragContext.map(r => r.content).join("\n\n---\n\n");

      systemPrompt = `
${basePrompt}

STRICT RULES:
- Answer ONLY from the provided PDF content
- Do NOT add any extra information
- Do NOT include links
- Keep wording as close as possible to the document

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

Title:
<Main heading from the document>

Description:
<2-3 lines summary strictly from document>

Key Points:
- Point 1
- Point 2
- Point 3
- Point 4
- Point 5

Keywords:
<comma separated keywords from document if available>

IMPORTANT:
- Use bullet points exactly like shown
- Do not add explanations outside this format
- If data is missing, skip that section

CONTEXT:
${contextDocs}
`;
    }

    else {
      let contextString = '';
      if (faqs && faqs.length > 0) {
        contextString = `\nHere is some information you should know and use to answer questions: ${JSON.stringify(faqs)}`;
      }
      systemPrompt = `${basePrompt}\n\nYour name is ${bot.name}. Be helpful, polite, and concise.${contextString}`;
    }

    console.log("systemPrompt", systemPrompt)

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
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
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }]
    });
    return completion.choices[0].message.content.replace(/["']/g, "").trim();
  } catch (err) {
    console.error('Failed to generate chat title:', err);
    return 'New Chat';
  }
};
