const fs = require('fs');
const OpenAI = require('openai');
const { PdfDocument, Bot, PdfChunk } = require('../models');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Process PDF file:
 * 1. Create Vector Store for the Bot if not exists.
 * 2. Upload file to OpenAI.
 * 3. Add file to the Bot's Vector Store.
 * 4. Update DB with OpenAI file/vector store IDs.
 */
exports.processPdf = async (pdfDoc) => {
  try {
    await pdfDoc.update({ status: 'processing' });
    
    // 1. Get or create Vector Store for the bot
    const bot = await Bot.findByPk(pdfDoc.bot_id);
    if (!bot) throw new Error(`Bot ${pdfDoc.bot_id} not found`);

    let vectorStoreId = bot.vector_store_id;

    if (!vectorStoreId) {
      console.log(`Creating new Vector Store for bot ${bot.name}...`);
      const vectorStore = await openai.vectorStores.create({
        name: `Bot_${bot.id}_Knowledge_Base`
      });
      vectorStoreId = vectorStore.id;
      await bot.update({ vector_store_id: vectorStoreId });
    }

    // 2. Upload file to OpenAI
    console.log(`Uploading file ${pdfDoc.file_name} to OpenAI...`);
    const file = await openai.files.create({
      file: fs.createReadStream(pdfDoc.file_path),
      purpose: "assistants",
    });

    // 3. Add file to Vector Store
    console.log(`Adding file ${file.id} to Vector Store ${vectorStoreId}...`);
    await openai.vectorStores.files.create(vectorStoreId, {
      file_id: file.id
    });

    // 4. Update PDF Document record
    await pdfDoc.update({
      status: 'completed',
      openai_file_id: file.id
    });

    console.log(`Successfully processed PDF ${pdfDoc.file_name} and added to Vector Store ${vectorStoreId}`);

  } catch (error) {
    console.error(`Error processing PDF ${pdfDoc.id}:`, error);
    fs.appendFileSync('pdf_error.log', new Date().toISOString() + ' | PDF ID: ' + pdfDoc.id + ' | Error: ' + error.stack + '\n');
    await pdfDoc.update({ status: 'failed' });
    throw error;
  }
};

/**
 * Search for relevant chunks using OpenAI Vector Store Search
 * (Replaces local cosine similarity search)
 */
exports.searchRelevantChunks = async (botId, query, topK = 5) => {
  try {
    const bot = await Bot.findByPk(botId);
    if (!bot || !bot.vector_store_id) {
       console.warn(`Bot ${botId} has no Vector Store. Search skipped.`);
       return [];
    }

    console.log(`Searching Vector Store ${bot.vector_store_id} for: "${query}"`);
    
    // Note: client.vectorStores.search is part of the newer Agentic SDK or standard Assistant API
    // If using standard SDK, we use vectorStores.fileBatches or similar, 
    // but the user's snippet specifically mentioned client.vectorStores.search.
    
    const searchResult = await openai.vectorStores.search(bot.vector_store_id, {
      query: query,
      max_num_results: topK
    });

    return searchResult.data.map((result) => ({
      id: result.file_id,
      content: (result.content && Array.isArray(result.content))
        ? result.content.map(c => c.text).join(" ")
        : "",
      score: result.score,
    }));

  } catch (error) {
    console.error('Error searching Vector Store:', error);
    return [];
  }
};
