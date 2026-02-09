require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-flash-latest",
        "gemini-1.5-pro",
        "gemini-pro",
        "gemini-1.0-pro"
    ];

    for (const modelName of modelsToTest) {
        console.log(`Testing: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello");
            console.log(`✅ SUCCESS with ${modelName}!`);
            return; // Stop on first success
        } catch (error) {
            console.log(`❌ FAILED with ${modelName}: ${error.message.substring(0, 100)}...`);
        }
    }
    console.log("All models failed.");
}

testModels();
