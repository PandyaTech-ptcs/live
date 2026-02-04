const { Sequelize, DataTypes } = require('sequelize');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// --- DB Connection (Same as index.js) ---
const sequelize = new Sequelize(
    process.env.DB_NAME || 'temple_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'your_password_here',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

// --- Model Definition ---
const Temple = sequelize.define('Temple', {
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    name_en: DataTypes.STRING,
    name_hi: DataTypes.STRING,
    // We only need these for this script
    state: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    liveVideoId: DataTypes.STRING,
});

async function translateText(text, targetLang) {
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY is missing in .env");
        return null;
    }
    
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Translate the temple name "${text}" to ${targetLang}. 
        Rules:
        1. Return ONLY the translated name. No explanations.
        2. Remove any garbage words like "add", "new", "test" from the end.
        3. Keep it divine and respectful.
        4. If the text is "Kal Bhairav ujjain mandir add", result should be "काल भैरव उज्जैन मंदिर" (for Hindi) or "Kal Bhairav Ujjain Temple" (for English).
        `;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("⚠️ AI Translation failed:", error.message);
        return null;
    }
}

async function runFixed() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to Database.');

        const temples = await Temple.findAll();
        console.log(`🔍 Found ${temples.length} temples. Checking for missing translations...`);

        for (const temple of temples) {
            let updates = {};
            let needsUpdate = false;

            // 1. Fix Hindi Name if missing
            if (!temple.name_hi) {
                console.log(`   🔸 Translating to HINDI: ${temple.name}`);
                const translation = await translateText(temple.name, "Hindi");
                if (translation) updates.name_hi = translation;
            }

            // 2. Fix English Name if missing
            if (!temple.name_en) {
                console.log(`   🔸 Translating to ENGLISH: ${temple.name}`);
                const translation = await translateText(temple.name, "English");
                if (translation) updates.name_en = translation;
            }

            // 3. Fix MAIN NAME to GUJARATI (if it looks like English/ASCII)
            // Check if name contains mostly English characters
            if (/^[A-Za-z0-9\s]+$/.test(temple.name.replace(/[-–]/g, ''))) {
                console.log(`   🔸 Converting MAIN NAME to GUJARATI: ${temple.name}`);
                const translation = await translateText(temple.name, "Gujarati");
                if (translation) {
                    updates.name = translation;
                    needsUpdate = true;
                }
            } else if (Object.keys(updates).length > 0) {
                needsUpdate = true;
            }

            // 3. Save if changes
            if (needsUpdate) {
                await temple.update(updates);
                console.log(`   ✅ Updated: ${temple.name} -> HI: ${updates.name_hi || '...'} | EN: ${updates.name_en || '...'}`);
            }
        }

        console.log("\n🎉 All temples processed! You can now restart the server and app.");

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

runFixed();
