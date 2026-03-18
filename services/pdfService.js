const fs = require('fs');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { PdfChunk } = require('../models');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper: Split text into chunks
const chunkText = (text, maxLength = 1000) => {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    if (currentChunk.join(' ').length + word.length + 1 <= maxLength) {
      currentChunk.push(word);
    } else {
      chunks.push(currentChunk.join(' '));
      currentChunk = [word];
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }
  return chunks;
};

// Process PDF file and store chunks/embeddings
exports.processPdf = async (pdfDoc) => {
  try {
    const dataBuffer = fs.readFileSync(pdfDoc.file_path);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    const chunks = chunkText(text, 1000); // 1000 chars per chunk
    console.log(`Split PDF ${pdfDoc.id} into ${chunks.length} chunks.`);

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      // Generate embedding using OpenAI
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const embedding = response.data[0].embedding;

      // Store in DB
      await PdfChunk.create({
        bot_id: pdfDoc.bot_id,
        pdf_id: pdfDoc.id,
        content: chunk,
        embedding: embedding // JSON column stores array
      });
    }

    // Update status
    await pdfDoc.update({ status: 'completed' });
    console.log(`Successfully processed PDF: ${pdfDoc.file_name}`);

  } catch (error) {
    console.error(`Error processing PDF ${pdfDoc.id}:`, error);
    fs.appendFileSync('pdf_error.log', new Date().toISOString() + ' | PDF ID: ' + pdfDoc.id + ' | Error: ' + error.stack + '\n');
    await pdfDoc.update({ status: 'failed' });
    throw error;
  }
};

// Function to compute cosine similarity between two vectors
const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Search for relevant chunks given a query
exports.searchRelevantChunks = async (botId, query, topK = 3) => {
  try {
    // 1. Embed the user's query
    const queryResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryEmbedding = queryResponse.data[0].embedding;

    // 2. Fetch all chunks for this bot
    const allChunks = await PdfChunk.findAll({
      where: { bot_id: botId }
    });

    if (allChunks.length === 0) return [];

    // 3. Calculate similarity for each chunk (Done in memory for simplicity/performance given smaller scales)
    const scoredChunks = allChunks.map(chunk => {
      let chunkEmbedding = chunk.embedding;
      // Depending on DB/Sequelize mapping, it might be a stringified JSON array
      if (typeof chunkEmbedding === 'string') {
          chunkEmbedding = JSON.parse(chunkEmbedding);
      }
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      return {
        content: chunk.content,
        similarity
      };
    });

    // 4. Sort by highest similarity and return top K
    scoredChunks.sort((a, b) => b.similarity - a.similarity);
    return scoredChunks.slice(0, Math.min(topK, scoredChunks.length));

  } catch (error) {
    console.error('Error searching RAG chunks:', error);
    return [];
  }
};
