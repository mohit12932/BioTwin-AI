const { GoogleGenerativeAI } = require('@google/generative-ai');
const ClinicalGuideline = require('../../models/ClinicalGuideline');
require('dotenv').config({ path: __dirname + '/../../.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// We use the recommended embedding model for text
const embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });

/**
 * Generates a vector embedding for a given text string.
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]>} - The vector embedding (array of floats).
 */
async function generateEmbedding(text) {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('⚠️ Gemini Embedding failed. Error:', error.message);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Searches the MongoDB Atlas ClinicalGuideline collection using Vector Search.
 * @param {string} query - The clinical query (e.g., patient conditions).
 * @param {string} specialty - (Optional) Filter by specialty.
 * @param {number} limit - Max number of guidelines to retrieve.
 * @returns {Promise<Array>} - The retrieved guidelines.
 */
async function retrieveGuidelines(query, specialty = null, limit = 2) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('RAG Service: GEMINI_API_KEY missing, skipping retrieval.');
      return [];
    }

    // 1. Generate the embedding for the query
    const queryVector = await generateEmbedding(query);

    // 2. Construct the vector search pipeline
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_index', // Must match the index name created in Atlas
          path: 'embedding',
          queryVector: queryVector,
          numCandidates: 10,
          limit: limit
        }
      },
      {
        $project: {
          title: 1,
          content: 1,
          specialty: 1,
          source: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];

    // Note: To filter by specialty in $vectorSearch, we would need to add a filter field
    // inside the $vectorSearch operator, but it requires the specialty field to be indexed
    // as a filterable field in the Atlas Search index definition.
    // For simplicity, we filter post-retrieval or rely on semantic similarity.
    
    const results = await ClinicalGuideline.aggregate(pipeline);

    if (specialty) {
      return results.filter(doc => doc.specialty === specialty || doc.specialty === 'general');
    }

    return results;
  } catch (error) {
    console.error('Error in retrieveGuidelines:', error);
    // Return empty array to gracefully degrade if Vector Search fails (e.g., index not created yet)
    return [];
  }
}

module.exports = {
  generateEmbedding,
  retrieveGuidelines
};
