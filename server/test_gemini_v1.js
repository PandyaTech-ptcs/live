const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testV1() {
    console.log("Testing with apiVersion: v1");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Note: The second argument is for apiVersion in some versions
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
        const result = await model.generateContent("test");
        console.log("v1 gemini-1.5-flash works!");
        process.exit(0);
    } catch (e) {
        console.error("v1 failed:", e.message);
        
        try {
            console.log("Testing with default (v1beta) but model gemini-1.5-flash-latest");
            const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const result2 = await model2.generateContent("test");
            console.log("gemini-1.5-flash-latest works!");
            process.exit(0);
        } catch (e2) {
            console.error("flash-latest failed:", e2.message);
        }
    }
}

testV1();
