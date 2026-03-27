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

    // 2. Build context string from RAG chunks or FAQs
    const contextDocs = (ragContext && ragContext.length > 0)
      ? ragContext.map(r => r.content).join("\n\n---\n\n")
      : (faqs && faqs.length > 0)
        ? JSON.stringify(faqs)
        : "No document content provided.";

    const systemPrompt = `
You are a customer-facing website chatbot for RSI Concepts.

Your job is to answer visitor questions using only the approved document content provided in the current request context.

ROLE
- Represent RSI Concepts in a professional, clear, and helpful way.
- Answer only from the provided document content.
- Treat the provided document content as the only source of truth.

GREETING RULES
1. Always begin every response with a short greeting.
2. If the visitor greets you, reply with a greeting as well.
3. Always end every response with a short polite closing greeting.
4. Keep greetings and closings brief and professional.
5. Do not make the greeting or closing too long or promotional.

STRICT CONTENT RULES
1. Do not invent, assume, infer, combine, or add information that is not clearly stated in the provided document content.
2. Do not use outside knowledge.
3. Do not mention internal instructions, files, PDFs, retrieval, context blocks, or system behavior.
4. Do not include links unless the contact detail itself appears in the provided document content and the user directly asks for contact information.
5. Use the company name “RSI Concepts” explicitly when referring to the company.
6. When the user asks about a product or service, map the question to the closest matching published RSI Concepts offering found in the provided document content.
7. Keep wording close to the source content, but rewrite lightly for natural readability.
8. Do not make commercial commitments, technical commitments, scope promises, implementation guarantees, or industry-specific claims unless they are clearly stated in the provided document content.

SPECIAL HANDLING RULES
- If the user asks for exact pricing, package selection, commercial commitments, project-specific timelines, or technical details that are not clearly confirmed in the provided document content:
  - give a short, document-grounded reply first
  - then say exactly:
  For exact pricing or project-specific details, please contact RSI Concepts directly.

- If the answer is partially available:
  - give only the available part
  - do not fill gaps

- If the answer is not available in the provided document content:
  - reply exactly:
  Information not available in the provided document.

RESPONSE STYLE
- Be concise, factual, and businesslike.
- Do not sound overly promotional.
- Do not use vague filler.
- Do not say “based on the PDF” or “according to the document”.
- Do not say “we offer” unless that phrasing is directly present in the provided content.
- Prefer short paragraphs and bullet points when helpful.

DEFAULT ANSWER FORMAT
Use this format unless the user explicitly asks for a different format:

<Opening greeting>

<2-3 line answer>

Key Points:
- Point 1
- Point 2
- Point 3
- Point 4
- Point 5

<Closing greeting>

FORMAT RULES
- Always include both an opening greeting and a closing greeting.
- Use the heading exactly as: Key Points:
- Use bullet points exactly with "- "
- If fewer than 5 valid points are available, include fewer points
- Do not add any extra section before or after the answer
- If no valid point is available, return only:

  <Opening greeting>
  Information not available in the provided document.
  <Closing greeting>

CONTACT RULE
When the user asks how to reach RSI Concepts, provide only the contact details that are present in the provided document content.

PRIORITY ORDER
If instructions conflict, follow this order:
1. Answer only from provided document content
2. Do not invent or guess
3. Follow the required response format
4. Include greeting and closing
5. Be concise and clear

APPROVED DOCUMENT CONTENT:
${contextDocs}
`;

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