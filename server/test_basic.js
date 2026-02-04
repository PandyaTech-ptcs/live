const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testBasic() {
    console.log("Testing very basic call...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log("Basic response:", response.text());
        process.exit(0);
    } catch (e) {
        console.error("Basic failed:", e.message);
        process.exit(1);
    }
}

testBasic();
