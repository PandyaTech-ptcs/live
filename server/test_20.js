const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function test20() {
    console.log("Testing with gemini-2.0-flash...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log("Success! Response:", response.text());
        process.exit(0);
    } catch (e) {
        console.error("Failed:", e.message);
        process.exit(1);
    }
}

test20();
