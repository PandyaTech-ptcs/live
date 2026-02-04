const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes, Op } = require('sequelize');
const https = require('https');
require('dotenv').config();
const twilio = require('twilio');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// --- PostgreSQL Database Connection ---
const sequelize = new Sequelize(
    process.env.DB_NAME || 'temple_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'your_password_here',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false // Toggle to true if you want to see SQL queries
    }
);

// --- Temple Model Definition ---
const Temple = sequelize.define('Temple', {
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    name_en: DataTypes.STRING,
    name_hi: DataTypes.STRING,
    state: { type: DataTypes.STRING, allowNull: false },
    district: { type: DataTypes.STRING, allowNull: true },
    description: DataTypes.TEXT,
    liveVideoId: DataTypes.STRING,
    location: DataTypes.STRING,
    liveChannelUrl: DataTypes.STRING,
    socialLinks: { type: DataTypes.JSONB }, // Stores Facebook, Instagram etc.
    keywords: { type: DataTypes.ARRAY(DataTypes.STRING) },
    ignoreVideoIds: { type: DataTypes.ARRAY(DataTypes.STRING) },
    history: DataTypes.TEXT,
    history_en: DataTypes.TEXT,
    history_hi: DataTypes.TEXT,
    architecture: DataTypes.TEXT,
    architecture_en: DataTypes.TEXT,
    architecture_hi: DataTypes.TEXT,
    significance: DataTypes.TEXT,
    significance_en: DataTypes.TEXT,
    significance_hi: DataTypes.TEXT,
    bestTimeToVisit: DataTypes.STRING,
    howToReach: DataTypes.TEXT,
    nearbyAttractions: DataTypes.TEXT,
    aartiTimings: { type: DataTypes.JSONB } // Dynamic timings
});

// --- User Model for Login/Registration ---
const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    contact: { type: DataTypes.STRING, allowNull: false, unique: true }, // Email or Mobile (Login ID)
    phoneNumber: { type: DataTypes.STRING }, // Explicit Mobile Number for calls
    password: { type: DataTypes.STRING, allowNull: true }, // Allow null temporarily to fix sync
    lastLogin: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    rating: { type: DataTypes.INTEGER, defaultValue: 0 }, // User rating (1-5)
    role: { type: DataTypes.STRING, defaultValue: 'user' }, // 'user' or 'admin'
    wantsToWorkAsGuide: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// --- OTP Model for Verification ---
const Otp = sequelize.define('Otp', {
    contact: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false }
});

// --- Appointment Model for Guide Bookings ---
const Appointment = sequelize.define('Appointment', {
    userName: { type: DataTypes.STRING, allowNull: false },
    userContact: { type: DataTypes.STRING, allowNull: false },
    guideContact: { type: DataTypes.STRING, allowNull: false },
    guideName: { type: DataTypes.STRING },
    date: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'pending' }, // pending, accepted, rejected
    bookedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// ... (Skipping intermediate lines) ...

// API: Update Profile
app.post('/api/update-profile', async (req, res) => {
    try {
        const { contact, name, phoneNumber } = req.body;
        if (!contact) {
            return res.status(400).json({ error: "Missing contact identifier" });
        }

        const user = await User.findOne({ where: { contact } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const updates = {};
        if (name) updates.name = name;
        if (phoneNumber) updates.phoneNumber = phoneNumber;

        await user.update(updates);
        console.log(`[USER] Profile Updated: ${user.name} (${user.contact})`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("Update Profile error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// --- Suggestion Model for User Feedback ---
const Suggestion = sequelize.define('Suggestion', {
    contact: { type: DataTypes.STRING, allowNull: false },
    userName: { type: DataTypes.STRING },
    category: { type: DataTypes.STRING },
    message: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'pending' }
});

// --- Local Guide Model (Employment) ---
const Guide = sequelize.define('Guide', {
    name: { type: DataTypes.STRING, allowNull: false },
    contact: { type: DataTypes.STRING, allowNull: false, unique: true },
    gender: { type: DataTypes.STRING }, 
    age: { type: DataTypes.INTEGER },
    district: { type: DataTypes.STRING, allowNull: false },
    area: { type: DataTypes.STRING }, // Specific area within district
    experience: { type: DataTypes.STRING },
    languages: { type: DataTypes.STRING }, // e.g. "Gujarati, Hindi"
    bio: { type: DataTypes.TEXT },
    hourlyRate: { type: DataTypes.STRING }, // e.g. "₹200/hr"
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: { type: DataTypes.STRING, defaultValue: 'active' }, // active, inactive
    rating: { type: DataTypes.FLOAT, defaultValue: 4.5 }
});

// --- Guide Review Model ---
const GuideReview = sequelize.define('GuideReview', {
    guideContact: { type: DataTypes.STRING, allowNull: false },
    guideName: { type: DataTypes.STRING },
    userContact: { type: DataTypes.STRING, allowNull: false },
    userName: { type: DataTypes.STRING },
    appointmentId: { type: DataTypes.INTEGER }, // Link to the appointment
    rating: { type: DataTypes.INTEGER, allowNull: false }, // 1-5 stars
    comment: { type: DataTypes.TEXT },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// --- Initial Data for Seeding ---
const INITIAL_TEMPLE_DATA = [];

// --- Sync & Seed Database ---
async function initDb() {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL Connection has been established successfully.');

        await sequelize.sync({ alter: true }); // Sync models to database
        
        const count = await Temple.count();
        if (count === 0) {
            console.log("Seeding initial temple data...");
            for (const group of INITIAL_TEMPLE_DATA) {
                for (const temple of group.temples) {
                    await Temple.create({
                        ...temple,
                        state: group.state
                    });
                }
            }
            console.log("Seeding complete!");
        }
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

// --- YouTube Live Check Logic ---
function checkYouTubeLive(channelUrl, callback, keywords = [], ignoreIds = []) {
    if (!channelUrl) {
        callback("PRE-RECORDED_VIDEO_ID");
        return;
    }

    // Standardize URL: Ensure it starts with https
    if (!channelUrl.startsWith('http')) {
        if (channelUrl.startsWith('@')) {
            channelUrl = 'https://www.youtube.com/' + channelUrl;
        } else {
            channelUrl = 'https://www.youtube.com/@' + channelUrl;
        }
    }

    // We'll try the provided URL and some common variants
    const urlsToTry = [channelUrl];
    
    // If it's a channel URL (has @ handle), also try the /live subpage
    if (channelUrl.includes('youtube.com/@') && !channelUrl.endsWith('/live')) {
        urlsToTry.push(channelUrl.endsWith('/') ? channelUrl + 'live' : channelUrl + '/live');
    }
    
    // Also try /streams for some channels
    if (channelUrl.includes('youtube.com/@') && !channelUrl.endsWith('/streams')) {
        urlsToTry.push(channelUrl.endsWith('/') ? channelUrl + 'streams' : channelUrl + '/streams');
    }

    const options = {
        headers: {
             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 8000
    };

    let triedCount = 0;
    
    function tryNextUrl() {
        if (triedCount >= urlsToTry.length) {
            callback("PRE-RECORDED_VIDEO_ID");
            return;
        }

        const url = urlsToTry[triedCount];
        triedCount++;

        console.log(`[YOUTUBE] Checking: ${url}`);
        
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                let videoId = null;

                // Case 1: Checking a /streams page or /live page with multiple videos
                if (url.includes('/streams') || url.includes('/live')) {
                    const renderers = data.split('videoRenderer');
                    for (let i = 1; i < renderers.length; i++) {
                        const block = renderers[i];
                        const isLive = block.includes('style="LIVE"') || block.includes('"label":"LIVE"') || block.includes('"text":"LIVE"');
                        if (isLive) {
                            const idMatch = block.match(/"videoId":"([^"]+)"/);
                            if (idMatch) {
                                const id = idMatch[1];
                                if (ignoreIds && ignoreIds.includes(id)) continue;
                                
                                // Optional keyword check
                                if (keywords && keywords.length > 0) {
                                    const titleMatch = block.match(/"title":\{"runs":\[\{"text":"(.*?)"\}\]/) || block.match(/"title":\{"simpleText":"(.*?)"\}/);
                                    const title = titleMatch ? titleMatch[1] : "";
                                    if (keywords.some(k => title.toLowerCase().includes(k.toLowerCase()))) {
                                        videoId = id;
                                        break;
                                    }
                                } else {
                                    videoId = id;
                                    break;
                                }
                            }
                        }
                    }
                }

                // Case 2: Direct channel home or fallback for /live
                if (!videoId) {
                    const isLive = data.includes('isLive":true') || 
                                   data.includes('"status":"LIVE"') || 
                                   data.includes('"PLAYER_LIVE_LABEL":"Live"') || 
                                   data.includes('style="LIVE"');
                    
                    const videoIdMatch = data.match(/"videoId":"([^"]+)"/);
                    const canonicalMatch = data.match(/link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([^"]+)"/);
                    
                    let id = videoIdMatch ? videoIdMatch[1] : (canonicalMatch ? canonicalMatch[1] : null);
                    
                    if (isLive && id && (!ignoreIds || !ignoreIds.includes(id))) {
                        videoId = id;
                    }
                }

                if (videoId) {
                    console.log(`[YOUTUBE] Found Live: ${videoId} at ${url}`);
                    callback(videoId);
                } else {
                    tryNextUrl();
                }
            });
        }).on('error', (err) => {
            console.error(`[ERROR] Request failed for ${url}: ${err.message}`);
            tryNextUrl();
        });
    }

    tryNextUrl();
}

// --- Helper: Send OTP via Email or SMS ---
const sendOtpMessage = async (contact, code) => {
    const isEmail = contact.includes('@');
    console.log(`[OTP] Sending ${code} to ${contact} via ${isEmail ? 'Email' : 'SMS'}`);

    if (isEmail) {
        // NODEMAILER SETUP (Use Gmail or SMTP from .env)
        // If credentials missing, log to console for debugging
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log(`[WARNING] No Email credentials found. OTP: ${code}`);
            return true; 
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: `"Divya Darshan" <${process.env.EMAIL_USER}>`,
            to: contact,
            subject: "Verification Code - Divya Darshan",
            text: `Your OTP is: ${code}`,
            html: `<h3>Your Divya Darshan Verification Code is: <b>${code}</b></h3><p>Valid for 10 minutes.</p>`
        });
    } else {
        // TWILIO SMS SETUP
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            console.log(`[WARNING] No Twilio credentials found. OTP: ${code}`);
            return true;
        }

        try {
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            const message = await client.messages.create({
                body: `OTP: ${code}`, // Adding "OTP:" keyword helps avoid some spam filters
                from: process.env.TWILIO_PHONE_NUMBER,
                to: contact
            });
            console.log(`[SMS] Message Sent! SID: ${message.sid}, Status: ${message.status}`);
        } catch (error) {
            console.error(`[SMS Error] Failed to send to ${contact}:`, error.message);
            throw error; // Let the API endpoint handle it
        }
    }
    return true;
};

// API: Check Live Video ID for a Channel URL
app.get('/api/live-check', (req, res) => {
    const { channelUrl } = req.query;
    if (!channelUrl) return res.status(400).json({ error: "Missing channelUrl" });

    checkYouTubeLive(channelUrl, (videoId) => {
        res.json({ videoId });
    });
});

// --- Automatic Periodic Updates ---
async function updateAllLiveStatuses() {
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 Running Automatic Live Check for all temples...`);
    
    try {
        const temples = await Temple.findAll({ where: { liveChannelUrl: { [Sequelize.Op.ne]: null } } });
        
        for (const temple of temples) {
            checkYouTubeLive(temple.liveChannelUrl, async (videoId) => {
                const isLive = videoId && videoId !== "PRE-RECORDED_VIDEO_ID";
                
                if (isLive) {
                    if (temple.liveVideoId !== videoId) {
                        console.log(`✅ LIVE UPDATE for ${temple.name}: ${videoId}`);
                        await temple.update({ liveVideoId: videoId });
                    }
                } else if (temple.liveVideoId !== "PRE-RECORDED_VIDEO_ID") {
                    console.log(`📡 OFFLINE: ${temple.name} (Resetting to fallback)`);
                    await temple.update({ liveVideoId: "PRE-RECORDED_VIDEO_ID" });
                }
            }, temple.keywords || [], temple.ignoreVideoIds || []);
        }
    } catch (error) {
        console.error("Error updating live statuses:", error);
    }
}

// API: Send OTP
app.post('/api/send-otp', async (req, res) => {
    try {
        const { contact, type } = req.body; // type: 'login' or 'register'
        if (!contact) return res.status(400).json({ error: "Contact is required" });

        // If register, check if user already exists
        if (type === 'register') {
            const user = await User.findOne({ where: { contact } });
            if (user) return res.status(400).json({ error: "User already registered" });
        }

        // Generate 6 digit pin
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // Save to DB
        await Otp.destroy({ where: { contact } }); // Clean previous
        await Otp.create({ contact, code, expiresAt });

        // Send
        await sendOtpMessage(contact, code);

        res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("Send OTP Error:", error);
        res.status(500).json({ error: "Failed to send OTP. Please check credentials." });
    }
});

// API: Verify OTP
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { contact, code } = req.body;
        if (!contact || !code) return res.status(400).json({ error: "Contact and Code are required" });

        const otpRecord = await Otp.findOne({ 
            where: { 
                contact, 
                code,
                expiresAt: { [Op.gt]: new Date() }
            } 
        });

        if (!otpRecord) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        // Delete used OTP
        await otpRecord.destroy();

        res.json({ success: true, message: "OTP verified" });
    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ error: "Failed to verify OTP" });
    }
});

// API: Register User
app.post('/api/register', async (req, res) => {
    try {
        const { name, contact, password } = req.body;
        if (!name || !contact || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Check if user exists
        const existingUser = await User.findOne({ where: { contact } });
        if (existingUser) {
            return res.status(400).json({ error: "User already registered. Please login." });
        }

        // Create user
        const user = await User.create({ 
            name, 
            contact, 
            password, 
            wantsToWorkAsGuide: req.body.wantsToWorkAsGuide || false 
        });
        
        // If user wants to work as guide, auto-create a Guide entry if it doesn't exist
        if (user.wantsToWorkAsGuide) {
            const existingGuide = await Guide.findOne({ where: { contact: user.contact } });
            if (!existingGuide) {
                await Guide.create({
                    name: user.name,
                    contact: user.contact,
                    district: 'Other', // Placeholder, user will need to update
                    status: 'active',
                    isVerified: false
                });
            }
        }

        console.log(`[USER] Registered: ${user.name} (${user.contact}) - Guide: ${user.wantsToWorkAsGuide}`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Registration failed" });
    }
});

// API: Login User
app.post('/api/login', async (req, res) => {
    try {
        const { contact, password } = req.body;
        if (!contact || !password) {
            return res.status(400).json({ error: "Missing contact or password" });
        }

        // Find user
        const user = await User.findOne({ where: { contact } });
        if (!user) {
            return res.status(404).json({ error: "User not found. Please register." });
        }

        // Check password (In production use bcrypt!)
        if (user.password !== password) {
            return res.status(401).json({ error: "Incorrect password" });
        }

        // Update last login timestamp
        await user.update({ lastLogin: new Date() });

        console.log(`[USER] Logged in: ${user.name} (${user.contact})`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// API: Get all temples grouped by state and district
app.get('/api/temples', async (req, res) => {
    try {
        const temples = await Temple.findAll({
            order: [
                ['state', 'ASC'],
                ['district', 'ASC'],
                ['name', 'ASC']
            ]
        });
        
        // Grouping by State -> District logic
        const grouped = temples.reduce((acc, temple) => {
            const state = temple.state;
            const district = temple.district || 'Other'; // Default if district is missing

            if (!acc[state]) {
                acc[state] = { 
                    state: state, 
                    districts: {} 
                };
            }
            
            if (!acc[state].districts[district]) {
                acc[state].districts[district] = {
                    district: district,
                    temples: []
                };
            }

            acc[state].districts[district].temples.push(temple);
            return acc;
        }, {});

        // Convert structure to Arrays for Frontend: [{ state, districts: [{ district, temples: [] }] }]
        const result = Object.values(grouped).map(stateGroup => ({
            state: stateGroup.state,
            districts: Object.values(stateGroup.districts)
        }));

        res.json(result);
    } catch (error) {
        console.error("Fetch Temples Error:", error);
        res.status(500).json({ error: "Failed to fetch temples" });
    }
});

// Backward compatibility (Somnath Aarti)
app.get('/api/darshan', async (req, res) => {
    try {
        const somnath = await Temple.findOne({ where: { name: "સોમનાથ મહાદેવ – સોમનાથ" } });
        res.json(somnath);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch Somnath data" });
    }
});
// API: Reset Password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { contact, newPassword } = req.body;
        if (!contact || !newPassword) {
            return res.status(400).json({ error: "Missing contact or new password" });
        }

        console.log(`[RESET] Attempt for contact: "${contact}"`);
        const user = await User.findOne({ where: { contact } });
        if (!user) {
            console.log(`[RESET] User not found for contact: "${contact}"`);
            return res.status(404).json({ error: "User not found with this contact" });
        }

        await user.update({ password: newPassword });
        console.log(`[USER] Password Reset Success for: ${user.name} (${user.contact})`);
        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        console.error("Reset Password error:", error);
        res.status(500).json({ error: "Failed to reset password" });
    }
});

// API: Update Profile
app.post('/api/update-profile', async (req, res) => {
    try {
        const { contact, name } = req.body;
        if (!contact || !name) {
            return res.status(400).json({ error: "Missing contact or name" });
        }

        const user = await User.findOne({ where: { contact } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await user.update({ name });
        console.log(`[USER] Profile Updated: ${user.name} (${user.contact})`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("Update Profile error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// API: Rate App
app.post('/api/rate-app', async (req, res) => {
    try {
        const { contact, rating } = req.body;
        if (!contact || rating === undefined) {
            return res.status(400).json({ error: "Missing contact or rating" });
        }

        const user = await User.findOne({ where: { contact } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await user.update({ rating });
        console.log(`[USER] Rated App: ${user.name} (${user.contact}) - ${rating} Stars`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("Rate App error:", error);
        res.status(500).json({ error: "Failed to save rating" });
    }
});

// API: Submit Suggestion
app.post('/api/suggestions', async (req, res) => {
    try {
        const { contact, userName, category, message } = req.body;
        if (!contact || !message) {
            return res.status(400).json({ error: "Missing contact or message" });
        }

        const suggestion = await Suggestion.create({ contact, userName, category, message });
        console.log(`[SUGGESTION] from ${userName} (${contact}): ${message.substring(0, 50)}...`);
        res.json({ success: true, suggestion });
    } catch (error) {
        console.error("Suggestion error:", error);
        res.status(500).json({ error: "Failed to submit suggestion" });
    }
});

// API: Admin Register User (Main Admin, Sub Admin, User)
app.post('/api/admin/register-user', async (req, res) => {
    try {
        const { name, contact, password, role, phoneNumber } = req.body;
        if (!name || !contact || !password || !role) {
            return res.status(400).json({ error: "All fields including role are required" });
        }

        // Check if user exists
        const existingUser = await User.findOne({ where: { contact } });
        if (existingUser) {
            return res.status(400).json({ error: "User already registered with this contact." });
        }

        // Create user with explicit role
        const user = await User.create({ name, contact, password, role, phoneNumber });
        console.log(`[ADMIN] Registered New User: ${user.name} (${user.contact}) as ${role}`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("Admin Registration error:", error);
        res.status(500).json({ error: "Registration failed" });
    }
});

// API: Get All Users (For Admin Management)
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.findAll({ 
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'name', 'contact', 'role', 'phoneNumber', 'createdAt'] // Exclude password
        });
        res.json(users);
    } catch (error) {
        console.error("Fetch Users Error:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// API: Update User (Admin)
app.put('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contact, role, phoneNumber, password } = req.body;
        
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const updates = { name, contact, role, phoneNumber };
        if (password && password.trim() !== '') {
            updates.password = password;
        }

        await user.update(updates);
        console.log(`[ADMIN] Updated User: ${user.name}`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("Update User Error:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
});

// API: Delete User (Admin)
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await user.destroy();
        console.log(`[ADMIN] Deleted User: ${user.name}`);
        res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// --- ADMIN APIs ---

// GET: All Suggestions
app.get('/api/admin/suggestions', async (req, res) => {
    try {
        const suggestions = await Suggestion.findAll({ order: [['createdAt', 'DESC']] });
        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch suggestions" });
    }
});

// POST: Update Suggestion Status
app.post('/api/admin/update-suggestion-status', async (req, res) => {
    try {
        const { id, status } = req.body;
        if (!id || !status) {
            return res.status(400).json({ error: "Suggestion ID and status are required" });
        }

        const suggestion = await Suggestion.findByPk(id);
        if (suggestion) {
            await suggestion.update({ status });
            return res.json({ success: true, message: "Status updated" });
        }
        res.status(404).json({ error: "Suggestion not found" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update status" });
    }
});

// GET: All User Ratings
app.get('/api/admin/ratings', async (req, res) => {
    try {
        const ratings = await User.findAll({ 
            where: { rating: { [Op.gt]: 0 } },
            attributes: ['name', 'contact', 'rating'],
            order: [['rating', 'DESC']]
        });
        res.json(ratings);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch ratings" });
    }
});

// GET: All Guides (for Admin)
app.get('/api/admin/guides', async (req, res) => {
    try {
        console.log("[ADMIN] Fetching all guides...");
        const guides = await Guide.findAll({ order: [['createdAt', 'DESC']] });
        console.log(`[ADMIN] Found ${guides.length} guides`);
        res.json(guides);
    } catch (error) {
        console.error("[ADMIN] Fetch guides error:", error);
        res.status(500).json({ error: "Failed to fetch guides: " + error.message });
    }
});

// --- LOCAL GUIDE APIs (Employment) ---

// API: Register as a Guide
app.post('/api/guides/register', async (req, res) => {
    try {
        const { name, contact, district, experience, languages, bio, gender, age, area, hourlyRate } = req.body;
        if (!name || !contact || !district) {
            return res.status(400).json({ error: "Name, contact and district are required" });
        }

        const existing = await Guide.findOne({ where: { contact } });
        if (existing) {
            return res.status(400).json({ error: "Guide already registered with this contact" });
        }

        const guide = await Guide.create({ 
            name, contact, district, experience, languages, bio,
            gender, age, area, hourlyRate 
        });
        console.log(`[GUIDE] New Registration: ${name} in ${district}`);
        res.json({ success: true, guide });
    } catch (error) {
        console.error("Guide registration error:", error);
        res.status(500).json({ error: "Failed to register as guide" });
    }
});

// API: Get Guides by District
app.get('/api/guides/:district', async (req, res) => {
    try {
        const { district } = req.params;
        const guides = await Guide.findAll({ 
            where: { 
                district: { [Op.iLike]: district.trim() },
                status: 'active'
            },
            order: [['isVerified', 'DESC'], ['rating', 'DESC']]
        });
        res.json(guides);
    } catch (error) {
        console.error("Fetch guides error:", error);
        res.status(500).json({ error: "Failed to fetch guides" });
    }
});

// API: Admin Verify Guide
app.post('/api/admin/verify-guide', async (req, res) => {
    try {
        const { id, isVerified } = req.body;
        const guide = await Guide.findByPk(id);
        if (guide) {
            await guide.update({ isVerified });
            return res.json({ success: true, guide });
        }
        res.status(404).json({ error: "Guide not found" });
    } catch (error) {
        res.status(500).json({ error: "Failed to verify guide" });
    }
});

// --- APPOINTMENT APIs ---

// API: Book an Appointment
app.post('/api/appointments/book', async (req, res) => {
    try {
        const { userName, userContact, guideContact, guideName, date } = req.body;
        if (!userName || !userContact || !guideContact || !date) {
            return res.status(400).json({ error: "Missing required booking details" });
        }

        const appointment = await Appointment.create({
            userName, userContact, guideContact, guideName, date
        });

        console.log(`[BOOKING] New Request: ${userName} -> ${guideName || guideContact} on ${date}`);
        res.json({ success: true, appointment });
    } catch (error) {
        console.error("Booking error:", error);
        res.status(500).json({ error: "Failed to book appointment" });
    }
});

// API: Get Appointments for a Guide
app.get('/api/appointments/guide/:contact', async (req, res) => {
    try {
        const { contact } = req.params;
        const appointments = await Appointment.findAll({
            where: { guideContact: contact },
            order: [['bookedAt', 'DESC']]
        });
        res.json(appointments);
    } catch (error) {
        console.error("Fetch appointments error:", error);
        res.status(500).json({ error: "Failed to fetch appointments" });
    }
});

// API: Accept/Reject Appointment
app.post('/api/appointments/update-status', async (req, res) => {
    try {
        const { id, status } = req.body;
        if (!id || !status) {
            return res.status(400).json({ error: "Booking ID and status required" });
        }

        const appointment = await Appointment.findByPk(id);
        if (!appointment) {
            return res.status(404).json({ error: "Appointment not found" });
        }

        await appointment.update({ status });
        console.log(`[BOOKING] Status Updated: ${appointment.id} -> ${status}`);
        res.json({ success: true, appointment });
    } catch (error) {
        console.error("Update appointment error:", error);
        res.status(500).json({ error: "Failed to update appointment" });
    }
});

// API: Get Appointments for a User (to see their bookings)
app.get('/api/appointments/user/:contact', async (req, res) => {
    try {
        const { contact } = req.params;
        const appointments = await Appointment.findAll({
            where: { userContact: contact },
            order: [['bookedAt', 'DESC']]
        });
        res.json(appointments);
    } catch (error) {
        console.error("Fetch user appointments error:", error);
        res.status(500).json({ error: "Failed to fetch appointments" });
    }
});

// --- GUIDE REVIEW APIs ---

// API: Submit a Review for a Guide
app.post('/api/reviews/submit', async (req, res) => {
    try {
        const { guideContact, guideName, userContact, userName, appointmentId, rating, comment } = req.body;
        
        if (!guideContact || !userContact || !rating) {
            return res.status(400).json({ error: "Guide contact, user contact, and rating are required" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // Check if user already reviewed this appointment
        if (appointmentId) {
            const existingReview = await GuideReview.findOne({ where: { appointmentId } });
            if (existingReview) {
                return res.status(400).json({ error: "You have already reviewed this booking" });
            }
        }

        const review = await GuideReview.create({
            guideContact,
            guideName,
            userContact,
            userName,
            appointmentId,
            rating,
            comment
        });

        // Update guide's average rating
        const allReviews = await GuideReview.findAll({ where: { guideContact } });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        
        await Guide.update({ rating: avgRating }, { where: { contact: guideContact } });

        console.log(`[REVIEW] New review for ${guideName}: ${rating} stars by ${userName}`);
        res.json({ success: true, review, avgRating });
    } catch (error) {
        console.error("Submit review error:", error);
        res.status(500).json({ error: "Failed to submit review" });
    }
});

// API: Get Reviews for a Guide
app.get('/api/reviews/guide/:contact', async (req, res) => {
    try {
        const { contact } = req.params;
        const reviews = await GuideReview.findAll({
            where: { guideContact: contact },
            order: [['createdAt', 'DESC']]
        });
        res.json(reviews);
    } catch (error) {
        console.error("Fetch reviews error:", error);
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
});

// API: Check if user can review an appointment
app.get('/api/reviews/can-review/:appointmentId', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const existingReview = await GuideReview.findOne({ where: { appointmentId: parseInt(appointmentId) } });
        res.json({ canReview: !existingReview });
    } catch (error) {
        console.error("Check review status error:", error);
        res.status(500).json({ error: "Failed to check review status" });
    }
});

// --- AI Content Generation ---
app.post('/api/admin/generate-ai-content', async (req, res) => {
    const { name, location } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: "Temple name is required for AI generation" });
    }

    if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({ 
            error: "Gemini API Key missing. Please add your key to server/.env as GEMINI_API_KEY=..." 
        });
    }

    try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Using Gemni Flash Latest as verified available for this key
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `Act as an Expert Spiritual Tour Guide. The user wants to visit the temple "${name}" at "${location}" and wants such detailed information that they DO NOT need to hire a human guide. Be their personal virtual guide.
        
        Write it like a DIVINE SACRED STORY (મહાન ધાર્મિક કથા) but also include practical guide-like details.
        
        Strictly follow this structure for the JSON fields:
        1. history (ઈતિહાસ અને કથા): This must be your masterpiece. Cover 'Pragatya' (ભગવાનના પ્રગટ્યની કથા), ancient legends, 'Lokvayka', Royal Connections, AND include "Guide Notes" - specific things a guide would point out (e.g., "Notice this stone...", "Look at this pillar..."). Write in deep Gujarati.
        2. significance (મહત્વ અને રહસ્યો): Reveal hidden secrets that only local guides know. Explain rituals, mysteries, and spiritual benefits.
        3. architecture (સ્થાપત્ય દર્શન): Don't just list styles. Walk the user through the temple. "As you enter the main gate...", "Observe the carving on the dome...". Write in Gujarati.

        Provide the response in a JSON format with exactly these fields:
        {
          "name_gu": "Temple name in Gujarati",
          "name_hi": "Temple name in Hindi",
          "name_en": "Temple name in English",
          "history": "Comprehensive Guide Script: Pragatya, History, Folklore, and 'Guide-style' tours (પ્રગટ્ય, ઇતિહાસ, લોકવાયકા, અને ગાઈડ જેવી ખાસ માહિતી) in Gujarati",
          "architecture": "Virtual Architectural Tour (સ્થાપત્ય દર્શન) in Gujarati",
          "significance": "Hidden Secrets, Rituals & Spiritual Significance (રહસ્યો અને મહત્વ) in Gujarati",
          "district": "Exact District Name (e.g., Gir Somnath, Devbhumi Dwarka, Kheda, Ahmedabad) in English",
          "bestTimeToVisit": "Best time to visit (e.g., During Aarti, specific festivals) in Gujarati",
          "howToReach": "Detailed Travel Guide (કેવી રીતે પહોંચવું) in Gujarati",
          "nearbyAttractions": "List of nearby attractions INCLUDING Historical Places. Format each as: 'Place Name - Short Description (Distance)'. Write in Gujarati.",
          "history_en": "Comprehensive History & Guide notes in English",
          "history_hi": "Comprehensive History & Guide notes in Hindi"
        }`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        
        const response = await result.response;
        const text = response.text();
        const generatedData = JSON.parse(text);
        res.json({ success: true, data: generatedData });
    } catch (error) {
        console.error("Gemini Gen Error:", error);
        res.status(500).json({ error: "Gemini Generation failed: " + error.message });
    }
});

// POST: Translate Content
app.post('/api/translate', async (req, res) => {
    const { text, targetLang, bulk, contentMap } = req.body;
    
    // Support both single and bulk modes
    if (!targetLang) return res.status(400).json({ error: "Target Language required" });
    if (!bulk && !text) return res.status(400).json({ error: "Text required" });
    if (bulk && (!contentMap || Object.keys(contentMap).length === 0)) return res.status(400).json({ error: "Content Map required for bulk mode" });

    try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using "gemini-1.5-flash-latest" as intended, or fallback to known working one
        // If "gemini-flash-latest" is what worked for 429, stick with it.
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); 

        if (bulk) {
            console.log(`[TRANSLATE BULK] Translating ${Object.keys(contentMap).length} fields to ${targetLang}`);
            
            const prompt = `Translate the following JSON values into ${targetLang === 'hi' ? 'Hindi' : 'English'}.
            Maintain the divine and respectful tone. 
            Return the result as a raw JSON object with the same keys, and translated values.
            Do NOT include markdown formatting (like \`\`\`json). Just the raw JSON.

            Input JSON:
            ${JSON.stringify(contentMap, null, 2)}`;

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            });

            const responseText = result.response.text().trim();
            // Clean up if markdown is still present despite instructions
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '');
            const translatedMap = JSON.parse(cleanJson);
            
            console.log(`[TRANSLATE BULK] Success`);
            res.json({ success: true, translatedMap });

        } else {
            // Legacy/Single mode
            console.log(`[TRANSLATE] Translating text (len: ${text.length}) to ${targetLang}`);
            const prompt = `Translate the following religious/historical text into ${targetLang === 'hi' ? 'Hindi' : 'English'}. 
            Maintain the divine and respectful tone. Return ONLY the translated text.
            
            TEXT: ${text}`;

            const result = await model.generateContent(prompt);
            console.log(`[TRANSLATE] Success`);
            res.json({ success: true, translatedText: result.response.text().trim() });
        }
    } catch (error) {
        console.error(`[TRANSLATE ERROR]`, error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Generate Spiritual Journey Narrative (Enhanced with ALL place types + Nearby)
app.post('/api/generate-journey-guide', async (req, res) => {
    const { origin, destination, lang = 'gu', travelMode = 'road' } = req.body;
    
    if (!origin || !destination) {
        return res.status(400).json({ error: "Origin and Destination are required" });
    }

    const langName = lang === 'hi' ? 'Hindi' : (lang === 'en' ? 'English' : 'Gujarati');
    
    // Mode-specific instructions
    let modeInstructions = '';
    if (travelMode === 'road') {
        modeInstructions = `
        TRAVEL MODE: BY ROAD (Car/Bus)
        Focus on:
        - Highway routes and road conditions
        - Petrol pumps and rest stops
        - Roadside restaurants and dhabas
        - Hotels and lodges on the route
        - Temples and attractions accessible by road
        - Traffic points and toll plazas
        - Scenic viewpoints along the highway
        `;
    } else if (travelMode === 'train') {
        modeInstructions = `
        TRAVEL MODE: BY TRAIN
        Focus on:
        - Railway stations on this route
        - Train connectivity and major junctions
        - Famous places near railway stations
        - Station facilities and waiting rooms
        - Temples and attractions near stations
        - Local transport from stations
        - Food stalls and restaurants at stations
        `;
    } else if (travelMode === 'flight') {
        modeInstructions = `
        TRAVEL MODE: BY FLIGHT
        Focus on:
        - Nearest airports to origin and destination
        - Airport facilities and lounges
        - Ground transportation from airports
        - Major attractions near airports
        - Hotels near airports
        - Flight connectivity information
        - Airport temples and prayer rooms
        `;
    }

    try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `Act as a comprehensive travel and spiritual tour guide for Indian routes. 
        Analyze the NEAREST/SHORTEST road route from "${origin}" to "${destination}".
        
        ${modeInstructions}
        
        CRITICAL INSTRUCTIONS FOR ROAD TRAVEL:
        
        1. ROUTE SELECTION:
           - Identify the NEAREST/SHORTEST road route (by distance or time)
           - Use major highways (NH/SH) that connect these cities
           - Avoid long detours or alternative routes
           - Example: રાજકોટ to ભાવનગર might be: રાજકોટ → બબરા → સિહોર → ભાવનગર (via NH-27)
           
        2. ROUTE PATH:
           - Clearly mention the exact route path with highway numbers
           - List major cities/towns that fall ON this route
           - Specify the highway/road name (e.g., NH-27, SH-31)
        
        3. PLACES TO INCLUDE (15-20 stops):
           - ONLY places that are DIRECTLY on this nearest route
           - NO detours or nearby attractions
           - Focus on practical stops travelers will encounter:
             * Major cities and towns on route
             * Petrol pumps on this highway
             * Restaurants/dhabas on this road
             * Hotels on this route
             * Temples that are ON this highway
             * Rest areas on this road
             * Toll plazas on this route
        
        4. DISTANCE ACCURACY:
           - Provide accurate distances between stops
           - Mention cumulative distance from origin
           - Specify which highway/road each place is on
        
        CATEGORIES TO INCLUDE (mix based on travel mode):
        1. 🛕 Temples & Religious Sites (મંદિરો અને ધાર્મિક સ્થળો)
        2. 🏛️ Historical Places & Monuments (ઐતિહાસિક સ્થળો)
        3. 🏘️ Famous Villages & Towns (પ્રસિદ્ધ ગામો અને શહેરો)
        4. 🍽️ Famous Restaurants & Food Stops (પ્રસિદ્ધ ભોજનાલય)
        5. ⛽ Petrol Pumps & Rest Areas (પેટ્રોલ પંપ અને આરામ સ્થળો)
        6. 🏨 Hotels & Lodging (હોટેલ અને રહેવાની વ્યવસ્થા)
        7. 🌳 Tourist Spots & Natural Beauty (પર્યટન સ્થળો)
        8. 🛍️ Shopping Areas & Markets (બજારો)
        9. 🏖️ Beaches & Lakes (બીચ અને તળાવ)
        10. 🎭 Cultural Centers (સાંસ્કૃતિક કેન્દ્રો)
        
        CRITICAL: Provide ALL text content strictly in ${langName} language.
        
        For each stop, provide:
        1. Name: The name of the location
        2. Category: One of the categories above (emoji + name in ${langName})
        3. Highway: Which highway/road this place is on (e.g., "NH-27", "SH-31")
        4. DistanceFromOrigin: Cumulative distance from starting point (e.g., "45 કિમી")
        5. Story: A detailed narrative about this place - its history, significance, or what makes it special in ${langName}.
        6. DivineSecret/SpecialTip: For temples: mystical facts. For others: insider tips, best items, timings in ${langName}.
        7. PracticalInfo: Distance from previous stop, opening hours, contact if applicable in ${langName}.
        8. TravelersTip: Practical advice for travelers in ${langName}.
        9. StopSequence: Numbered order from start to end.
        
        Format the response as a JSON object:
        {
          "routePath": "The nearest route path with highway in ${langName} (e.g., રાજકોટ → બબરા → સિહોર → ભાવનગર via NH-27)",
          "routeTitle": "A comprehensive title for this journey in ${langName}",
          "highwayName": "Main highway name (e.g., NH-27, SH-31)",
          "estimatedDistance": "Approximate road distance in km",
          "estimatedTime": "Approximate travel time",
          "stops": [
            {
              "name": "Stop Name",
              "category": "Category with emoji",
              "highway": "Highway/Road name",
              "distanceFromOrigin": "Distance from start in ${langName}",
              "story": "Detailed narrative in ${langName}",
              "secret": "Special tip or mystical fact in ${langName}",
              "practicalInfo": "Distance, timings, contact in ${langName}",
              "tip": "Travel tip in ${langName}",
              "sequence": 1
            }
          ]
        }`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        
        const responseData = JSON.parse(result.response.text());
        res.json({ 
            success: true, 
            journey: responseData.stops, 
            title: responseData.routeTitle,
            routePath: responseData.routePath || '',
            distance: responseData.estimatedDistance,
            estimatedTime: responseData.estimatedTime || 'Calculating...'
        });
    } catch (error) {
        console.error("Journey Generation Error:", error);
        res.status(500).json({ error: "Failed to generate journey guide: " + error.message });
    }
});

// --- Twilio Setup ---
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// API: Initiate Bridge Call (Admin -> Guide)
// app.post('/api/admin/call-guide', async (req, res) => {
//     let { adminContact, guideContact } = req.body;
//     if (!adminContact || !guideContact) return res.status(400).json({ error: "Both numbers required" });

//     try {
//         // Ensure E.164 format (Assuming India +91 if not present)
//         if (!adminContact.startsWith('+')) adminContact = '+91' + adminContact.replace(/\D/g, '');
//         if (!guideContact.startsWith('+')) guideContact = '+91' + guideContact.replace(/\D/g, '');

//         console.log(`[TWILIO] Initiating bridge call: Guide (${guideContact}) -> Admin (${adminContact})`);
        
//         // Generate TwiML to Dial the Admin (connect them when Guide answers)
//         const response = new twilio.twiml.VoiceResponse();
//         const dial = response.dial({ callerId: process.env.TWILIO_PHONE_NUMBER });
//         dial.number(adminContact);

//         // Initiate call to Guide FIRST
//         const call = await twilioClient.calls.create({
//             twiml: response.toString(),
//             to: guideContact, // Call the Guide first
//             from: process.env.TWILIO_PHONE_NUMBER 
//         });
        
//         console.log(`[TWILIO] Call SID: ${call.sid}`);
//         res.json({ success: true, callSid: call.sid });
//     } catch (error) {
//         console.error("Twilio Call Error:", error);
//         res.status(500).json({ error: error.message });
//     }
// });

// API: Initiate Bridge Call (Admin First -> Dial Guide)
// API: Initiate Bridge Call (Admin First -> Dial Guide)
app.post('/api/admin/call-guide', async (req, res) => {
    console.log("req.body---------------->>", JSON.stringify(req.body));
    let { adminContact, guideContact } = req.body;
    
    // Validate required fields
    if (!guideContact) return res.status(400).json({ error: "Guide number required" });
    
    // We NEED an Admin Phone Number to enable conversation
    if (!adminContact || adminContact.includes('@') || !adminContact.match(/[\d+]{10,}/)) {
        return res.status(400).json({ 
            error: "Unable to talk: Your Admin Profile has an Email, not a Phone Number. The system needs a number to call YOU first. Please update your profile." 
        });
    }

    try {
        // Ensure contacts are in E.164 format
        if (!guideContact.startsWith('+')) guideContact = '+91' + guideContact.replace(/\D/g, '');
        if (!adminContact.startsWith('+')) adminContact = '+91' + adminContact.replace(/\D/g, '');

        const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
        
        console.log(`[TWILIO] Bridge Call: Admin (${adminContact}) -> [Twilio] -> Guide (${guideContact})`);
        
        // TwiML Strategy:
        // 1. System calls Admin.
        // 2. Admin Answers.
        // 3. System says "Connecting..."
        // 4. System <Dial>s the Guide.
        const response = new twilio.twiml.VoiceResponse();
        response.say({ language: 'en-IN' }, "Connecting you to the Guide.");
        
        const dial = response.dial({ callerId: twilioNumber });
        dial.number(guideContact);
        
        // Initiate the physical call to the ADMIN first
        const call = await twilioClient.calls.create({
            twiml: response.toString(),
            to: adminContact, // Call Your Phone First
            from: twilioNumber
        });
        
        console.log(`[TWILIO] Call Initiated. SID: ${call.sid}`);
        res.json({ success: true, callSid: call.sid });

    } catch (error) {
        console.error("Error initiating Twilio call:", error);
        res.status(500).json({ error: error.message });
    }
});


// POST: Add New Temple
app.post('/api/admin/add-temple', async (req, res) => {
    try {
        const { 
            state, district, name, name_en, name_hi, description, liveVideoId, location, history,
            history_en, history_hi, architecture, architecture_en, architecture_hi,
            significance, significance_en, significance_hi,
            bestTimeToVisit, howToReach, nearbyAttractions, liveChannelUrl, aartiTimings
        } = req.body;
        
        if (!state || !name) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const temple = await Temple.create({ 
            state, district, name, name_en, name_hi, description, liveVideoId, location, history,
            history_en, history_hi, architecture, architecture_en, architecture_hi,
            significance, significance_en, significance_hi,
            bestTimeToVisit, howToReach, nearbyAttractions, liveChannelUrl, aartiTimings
        });

        // Trigger an immediate live check if a channel URL was provided
        if (liveChannelUrl) {
            console.log(`[ADMIN] Triggering immediate live check for new temple: ${name}`);
            checkYouTubeLive(liveChannelUrl, async (videoId) => {
                if (videoId && videoId !== "PRE-RECORDED_VIDEO_ID") {
                    await temple.update({ liveVideoId: videoId });
                    console.log(`[ADMIN] Live ID updated for ${name}: ${videoId}`);
                }
            });
        }

        res.json({ success: true, temple });
    } catch (error) {
        console.error("Add Temple error:", error);
        res.status(500).json({ error: "Failed to add temple: " + error.message });
    }
});

// POST: Update Existing Temple
app.post('/api/admin/update-temple', async (req, res) => {
    try {
        const { id, name } = req.body;
        if (!id && !name) {
            return res.status(400).json({ error: "Temple ID or Name is required to update" });
        }

        const updateData = { ...req.body };
        delete updateData.id;

        // Ensure we don't accidentally wipe fields if the frontend sends partial updates
        // (Sequelize update handles partials automatically if we pass the object, 
        // but here we are spreading the whole body. That is fine as long as frontend sends what it wants to update)

        const [updated] = await Temple.update(updateData, {
             where: id ? { id } : { name }
        });

        if (updated) {
            const updatedTemple = await Temple.findOne({ where: id ? { id } : { name } });
            
            // Trigger an immediate live check if a channel URL exists/updated
            if (updatedTemple.liveChannelUrl) {
                console.log(`[ADMIN] Triggering immediate live check for updated temple: ${updatedTemple.name}`);
                checkYouTubeLive(updatedTemple.liveChannelUrl, async (videoId) => {
                    if (videoId && videoId !== "PRE-RECORDED_VIDEO_ID") {
                        await updatedTemple.update({ liveVideoId: videoId });
                        console.log(`[ADMIN] Live ID updated for ${updatedTemple.name}: ${videoId}`);
                    }
                });
            }

            return res.json({ success: true, temple: updatedTemple });
        }
        res.status(404).json({ error: "Temple not found" });
    } catch (error) {
        console.error("Update Temple error:", error);
        res.status(500).json({ error: "Failed to update temple: " + error.message });
    }
});

// POST: Delete Temple
app.post('/api/admin/delete-temple', async (req, res) => {
    try {
        const { id, name } = req.body;
        if (!id && !name) {
            return res.status(400).json({ error: "Temple ID or Name is required to delete" });
        }

        const deleted = await Temple.destroy({
            where: id ? { id } : { name }
        });

        if (deleted) {
            return res.json({ success: true, message: "Temple deleted successfully" });
        }
        res.status(404).json({ error: "Temple not found" });
    } catch (error) {
        console.error("Delete Temple error:", error);
        res.status(500).json({ error: "Failed to delete temple: " + error.message });
    }
});

app.listen(port, '0.0.0.0', async () => {
    console.log(`\n--- Somnath Aarti Server (PostgreSQL) ---`);
    console.log(`Local: http://localhost:${port}`);
    
    await initDb();
    
    // Initial status check
    setTimeout(updateAllLiveStatuses, 5000);
    // Recurring check every 10 mins
    setInterval(updateAllLiveStatuses, 10 * 60 * 1000);

    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`Network: http://${net.address}:${port}`);
            }
        }
    }
});
