const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    if (!process.env.GEMINI_API_KEY) {
        console.error("No API Key found in .env");
        return;
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // The listModels method is not directly on genAI in all versions, 
        // but we can try to fetch it via the base client or just test a few names.
        console.log("Testing model: gemini-1.5-flash");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("test");
        console.log("gemini-1.5-flash works!");
    } catch (e) {
        console.error("gemini-1.5-flash failed:", e.message);
        
        try {
            console.log("Testing model: gemini-pro");
            const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result2 = await model2.generateContent("test");
            console.log("gemini-pro works!");
        } catch (e2) {
            console.error("gemini-pro failed:", e2.message);
        }
    }
}

listModels();
