const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
      const modal = genAI.getGenerativeModel({ model: "gemini-pro" }); // Dummy init
      // The SDK doesn't always expose listModels directly on the main class in simplified usage, 
      // but let's try the ModelService or just try a standard known model request to checking connectivity.
      
      // Actually, checking documentation or just trying a safe model is faster.
      // But let's try to generate with 'gemini-pro' to see if it works.
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent("Hello");
      console.log("gemini-pro works: " + result.response.text());
  } catch (error) {
      console.error("gemini-pro failed:", error.message);
  }

  try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Hello");
      console.log("gemini-1.5-flash works: " + result.response.text());
  } catch (error) {
      console.error("gemini-1.5-flash failed:", error.message);
  }
}

listModels();
