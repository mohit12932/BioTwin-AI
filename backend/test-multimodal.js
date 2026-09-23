const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

async function testMultimodal() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    
    // create a dummy 1x1 png image in base64
    const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/png"
      }
    };

    const prompt = 'Describe this image in exactly one word in JSON like {"desc": "word"}';
    console.log('Generating content...');
    const result = await model.generateContent([prompt, imagePart]);
    console.log('Result:', result.response.text());
  } catch (err) {
    console.error('Gemini error:', err);
  }
}
testMultimodal();
