const { OpenAI } = require('openai');
require('dotenv').config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VS_ID = "vs_69c695b99f2c819191af2c385ae2f8d9";

async function checkVs() {
  try {
    console.log(`Checking Vector Store: ${VS_ID}`);
    
    // 1. List files in Vector Store
    const files = await client.vectorStores.files.list(VS_ID);
    console.log(`Files in Vector Store (${files.data.length}):`);
    for (const f of files.data) {
      const fileInfo = await client.files.retrieve(f.id);
      console.log(`- File ID: ${f.id}, Name: ${fileInfo.filename}, Status: ${f.status}`);
    }

    if (files.data.length === 0) {
      console.warn("WARNING: No files found in the Vector Store!");
    }

    // 2. Perform a test search
    const query = "About RSI Concept";
    console.log(`\nTesting search for: "${query}"...`);
    const searchResult = await client.vectorStores.search(VS_ID, {
      query: query,
      max_num_results: 5
    });

    console.log(`Search Results (${searchResult.data.length}):`);
    searchResult.data.forEach((r, i) => {
      console.log(`Result ${i + 1}:`);
      console.log(`- File: ${r.filename} (${r.file_id})`);
      console.log(`- Score: ${r.score}`);
      const text = r.content.map(c => c.text).join(" ");
      console.log(`- Content: ${text.substring(0, 100)}...`);
    });

  } catch (err) {
    console.error("Error checking Vector Store:", err);
  }
}

checkVs();
