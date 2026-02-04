const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testLatest() {
    console.log("Testing with gemini-flash-latest...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log("Success! Response:", response.text());
        process.exit(0);
    } catch (e) {
        console.error("Failed:", e.message);
        process.exit(1);
    }
}

testLatest();
