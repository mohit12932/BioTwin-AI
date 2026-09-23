const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    const prompt = 'Return exactly {"status": "ok"} in raw JSON.';
    console.log('Generating content...');
    const result = await model.generateContent(prompt);
    console.log('Result:', result.response.text());
  } catch (err) {
    console.error('Gemini error:', err);
  }
}
testGemini();
