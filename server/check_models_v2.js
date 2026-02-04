const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelsToTry = [
      "gemini-1.5-flash-001",
      "gemini-1.5-flash-002",
      "gemini-1.5-pro",
      "gemini-1.0-pro",
      "gemini-pro",
      "gemini-flash-latest" // What I had initially
  ];

  for (const mName of modelsToTry) {
      try {
          const model = genAI.getGenerativeModel({ model: mName });
          const result = await model.generateContent("Hi");
          console.log(`✅ SUCCESS: ${mName}`);
          return;
      } catch (error) {
          console.log(`❌ FAILED: ${mName} - ${error.message.split('\n')[0]}`);
      }
  }
}

listModels();
