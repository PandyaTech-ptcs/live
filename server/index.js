const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes, Op } = require('sequelize');
const https = require('https');
require('dotenv').config();
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const app = express();
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = new socketIo.Server(server, { cors: { origin: "*" } });
global.io = io; // Make accessible to routes

io.on('connection', (socket) => {
    socket.on('join', (userId) => {
        socket.join(userId);
       // console.log(`User ${userId} joined socket room`);
    });
});
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Configure AWS S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'divya-darshan-temples';

// Configure multer for memory storage (for S3 upload)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// --- PostgreSQL Database Connection ---
// --- PostgreSQL Database Connection ---
console.log("--- DB CONNECTION DEBUG ---");
if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL detected: " + process.env.DATABASE_URL.substring(0, 15) + "******");
} else {
    console.error("CRITICAL: DATABASE_URL is NOT found in environment variables!");
}

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    })
    : new Sequelize(
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
    aartiTimings: { type: DataTypes.JSONB }, // Dynamic timings
    imageUrl: DataTypes.STRING // Optional temple image
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
    guideUpiId: { type: DataTypes.STRING }, // Store at time of booking
    date: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'pending' }, // pending, accepted, rejected
    amount: { type: DataTypes.INTEGER, defaultValue: 0 },
    paymentStatus: { type: DataTypes.STRING, defaultValue: 'pending' }, // pending, completed
    isPaidToAdmin: { type: DataTypes.BOOLEAN, defaultValue: false }, // User paid admin?
    commissionAmount: { type: DataTypes.INTEGER, defaultValue: 0 },
    adminCommissionStatus: { type: DataTypes.STRING, defaultValue: 'pending' }, 
    cancellationReason: { type: DataTypes.STRING }, // Reason for cancellation 
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
    upiId: { type: DataTypes.STRING }, // For direct payments
    commissionBalance: { type: DataTypes.INTEGER, defaultValue: 0 }, // Amount owed (for cash bookings)
    withdrawableBalance: { type: DataTypes.INTEGER, defaultValue: 0 }, // Money held by admin for guide
    debtLimit: { type: DataTypes.INTEGER, defaultValue: 500 },
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

// --- Chat Message Model ---
const Message = sequelize.define('Message', {
    senderContact: { type: DataTypes.STRING, allowNull: false },
    receiverContact: { type: DataTypes.STRING, allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// --- Guide Story Model ---
const GuideStory = sequelize.define('GuideStory', {
    guideContact: { type: DataTypes.STRING, allowNull: false },
    guideName: { type: DataTypes.STRING },
    mediaUrl: { type: DataTypes.STRING, allowNull: false }, // Image or video URL
    mediaType: { type: DataTypes.STRING, defaultValue: 'image' }, // 'image' or 'video'
    caption: { type: DataTypes.TEXT }, // Optional caption
    location: { type: DataTypes.STRING }, // Optional location tag
    viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    expiresAt: { type: DataTypes.DATE, allowNull: false }, // 24 hours from creation
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// --- Story View Model (Track who viewed which story) ---
const StoryView = sequelize.define('StoryView', {
    storyId: { type: DataTypes.INTEGER, allowNull: false },
    viewerContact: { type: DataTypes.STRING, allowNull: false },
    viewerName: { type: DataTypes.STRING },
    viewedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
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
                        
                        // Strict check: Must have LIVE badge and NOT have UPCOMING/Scheduled
                        const hasLiveBadge = block.includes('style="LIVE"') || block.includes('"label":"LIVE"') || block.includes('"text":"LIVE"') || block.includes('Watching');
                        const isUpcoming = block.includes('style="UPCOMING"') || block.includes('"text":"Upcoming"') || block.includes('Scheduled') || block.includes('Premiere');
                        
                        if (hasLiveBadge && !isUpcoming) {
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
                    const hasLiveBadge = data.includes('style="LIVE"') || data.includes('"label":"LIVE"') || data.includes('"text":"LIVE"') || data.includes('Watching');
                    const isUpcoming = data.includes('style="UPCOMING"') || data.includes('"text":"Upcoming"') || data.includes('Scheduled') || data.includes('Premiere');
                    const isLive = (data.includes('isLive":true') || data.includes('"status":"LIVE"')) && !isUpcoming && hasLiveBadge;
                    
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
        } else if (type === 'forgot') {
            const user = await User.findOne({ where: { contact } });
            if (!user) return res.status(404).json({ error: "User not found" });
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

        // Hash password using bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await User.create({ 
            name, 
            contact, 
            password: hashedPassword, 
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

        // Check password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
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
        const { contact, newPassword, otp } = req.body;
        if (!contact || !newPassword || !otp) {
            return res.status(400).json({ error: "Missing contact, OTP or new password" });
        }

        // Verify OTP
        const otpRecord = await Otp.findOne({ 
            where: { 
                contact, 
                code: otp,
                expiresAt: { [Op.gt]: new Date() }
            } 
        });

        if (!otpRecord) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        console.log(`[RESET] Attempt for contact: "${contact}"`);
        const user = await User.findOne({ where: { contact } });
        if (!user) {
            console.log(`[RESET] User not found for contact: "${contact}"`);
            return res.status(404).json({ error: "User not found with this contact" });
        }

        // Hash new password using bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        await user.update({ password: hashedPassword });
        
        // Delete used OTP
        await otpRecord.destroy();

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

        // Hash password using bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user with explicit role
        const user = await User.create({ name, contact, password: hashedPassword, role, phoneNumber });
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
            // Hash password using bcrypt
            const saltRounds = 10;
            updates.password = await bcrypt.hash(password, saltRounds);
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
                status: 'active',
                commissionBalance: { [Op.lt]: Sequelize.col('debtLimit') } // Rapido Style: Only show guides within limit
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
        const { userName, userContact, guideContact, guideName, guideUpiId, date, amount } = req.body;
        if (!userName || !userContact || !guideContact || !date) {
            return res.status(400).json({ error: "Missing required booking details" });
        }

        const amountVal = amount || 0;
        const commissionVal = Math.floor(amountVal * 0.10); // 10% Commission for Admin

        const appointment = await Appointment.create({
            userName, userContact, guideContact, guideName, guideUpiId, date, 
            amount: amountVal,
            commissionAmount: commissionVal
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
        const { id, status, reason } = req.body;
        if (!id || !status) {
            return res.status(400).json({ error: "Booking ID and status required" });
        }

        const appointment = await Appointment.findByPk(id);
        if (!appointment) {
            return res.status(404).json({ error: "Appointment not found" });
        }

        await appointment.update({ 
            status,
            cancellationReason: reason 
        });

        // --- Notification Logic ---
        if(global.io) {
            if(status === 'rejected') {
                // Guide rejected -> Notify User
                global.io.to(appointment.userContact).emit('notification', {
                    title: "Booking Update ⚠️",
                    body: `Guide ${appointment.guideName || 'User'} is not available. Please try another guide.`,
                    type: 'rejected'
                });
            } else if(status === 'cancelled') {
                // User cancelled -> Notify Guide
                global.io.to(appointment.guideContact).emit('notification', {
                    title: "Booking Cancelled ❌",
                    body: `Appointment with ${appointment.userName} on ${appointment.date} has been CANCELLED.\nReason: ${reason || 'N/A'}.`,
                    type: 'cancelled'
                });
            } else if(status === 'accepted') {
                // Guide accepted -> Notify User
                global.io.to(appointment.userContact).emit('notification', {
                    title: "Booking Accepted! ✅",
                    body: `Guide ${appointment.guideName} has accepted your request! Please proceed to payment.`,
                    type: 'accepted'
                });
            }
        }
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

// API: Admin Confirms User's Online Payment
app.post('/api/admin/confirm-user-payment', async (req, res) => {
    try {
        const { id } = req.body;
        const appointment = await Appointment.findByPk(id);
        if (!appointment || appointment.paymentStatus === 'completed') {
            return res.status(404).json({ error: "Invalid appointment" });
        }

        // 1. Mark appointment as paid
        await appointment.update({ 
            paymentStatus: 'completed',
            isPaidToAdmin: true,
            adminCommissionStatus: 'received'
        });

        // 2. Split: Add the remaining 90% to Guide's withdrawable balance
        const guide = await Guide.findOne({ where: { contact: appointment.guideContact } });
        if (guide) {
            const guideShare = appointment.amount - appointment.commissionAmount;
            const newWithdrawable = (guide.withdrawableBalance || 0) + guideShare;
            await guide.update({ withdrawableBalance: newWithdrawable });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to confirm payment" });
    }
});

// API: Guide Requests Payout (Settlement from Admin to Guide)
app.post('/api/guide/request-payout', async (req, res) => {
    try {
        const { contact } = req.body;
        const guide = await Guide.findOne({ where: { contact } });
        if (!guide || guide.withdrawableBalance <= 0) {
            return res.status(400).json({ error: "No balance to withdraw" });
        }

        // Mark balance as 0 (in a real app, this would queue a transfer)
        const payoutAmount = guide.withdrawableBalance;
        await guide.update({ withdrawableBalance: 0 });

        console.log(`[PAYOUT] Guide ${guide.name} requested ₹${payoutAmount}. Transfer to: ${guide.upiId}`);
        res.json({ success: true, amount: payoutAmount });
    } catch (error) {
        res.status(500).json({ error: "Payout request failed" });
    }
});

// API: Get Guide Wallet Info
app.get('/api/guide/wallet/:contact', async (req, res) => {
    try {
        const { contact } = req.params;
        const guide = await Guide.findOne({ where: { contact } });
        if (!guide) return res.status(404).json({ error: "Guide not found" });

        res.json({
            success: true,
            commissionBalance: guide.commissionBalance, // For cash
            withdrawableBalance: guide.withdrawableBalance, // From online
            limit: guide.debtLimit,
            isBlocked: guide.commissionBalance >= guide.debtLimit
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch wallet info" });
    }
});

// API: Settle Dues (Guide Pays Admin)
app.post('/api/guide/settle-dues', async (req, res) => {
    try {
        const { contact, amount } = req.body;
        const guide = await Guide.findOne({ where: { contact } });
        if (!guide) return res.status(404).json({ error: "Guide not found" });

        const newBalance = Math.max(0, guide.commissionBalance - amount);
        await guide.update({ commissionBalance: newBalance });
        
        res.json({ success: true, newBalance });
    } catch (error) {
        res.status(500).json({ error: "Failed to settle dues" });
    }
});

// API: Admin Earnings Dashboard
app.get('/api/admin/earnings', async (req, res) => {
    try {
        const appointments = await Appointment.findAll({
            where: { paymentStatus: 'completed' },
            order: [['bookedAt', 'DESC']]
        });

        const totalEarnings = appointments.reduce((sum, app) => sum + (app.amount || 0), 0);
        const totalCommission = appointments.reduce((sum, app) => sum + (app.commissionAmount || 0), 0);
        const pendingCommission = appointments
            .filter(app => app.adminCommissionStatus === 'pending')
            .reduce((sum, app) => sum + (app.commissionAmount || 0), 0);

        res.json({
            success: true,
            stats: {
                totalBookings: appointments.length,
                totalEarnings,
                totalCommission,
                pendingCommission
            },
            history: appointments
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch earnings" });
    }
});

// API: Mark Commission as Received (Admin)
app.post('/api/admin/mark-commission-received', async (req, res) => {
    try {
        const { id } = req.body;
        const appointment = await Appointment.findByPk(id);
        if (!appointment) return res.status(404).json({ error: "Appointment not found" });

        await appointment.update({ adminCommissionStatus: 'received' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to update commission status" });
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
        console.error("Can Review Error:", error);
        res.status(500).json({ error: "Check failed" });
    }
});

/* --- SECURE COMMUNICATION APIS --- */
app.post('/api/chat/send', async (req, res) => {
    try {
        const { senderContact, receiverContact, text } = req.body;
        const msg = await Message.create({ senderContact, receiverContact, text });
        
        // Emit via Socket
        if (global.io) {
            global.io.to(receiverContact).emit('receive_message', msg);
            global.io.to(senderContact).emit('receive_message', msg); // Optional: Confirm to sender
        }
        
        res.json({ success: true, message: msg });
    } catch (e) {
        console.error("Chat Send Error:", e);
        res.status(500).json({ error: "Failed to send message" });
    }
});

app.get('/api/chat/history', async (req, res) => {
    try {
        const { user1, user2 } = req.query;
        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { senderContact: user1, receiverContact: user2 },
                    { senderContact: user2, receiverContact: user1 }
                ]
            },
            order: [['createdAt', 'ASC']]
        });
        res.json(messages);
    } catch (e) {
        console.error("Chat History Error:", e);
        res.status(500).json({ error: "Failed to fetch chat history" });
    }
});

app.post('/api/call/secure-bridge', async (req, res) => {
    try {
        let { userContact, guideContact } = req.body;
        if (!userContact || !guideContact) return res.status(400).json({ error: "Contacts required" });

        // Normalize
        if (!userContact.startsWith('+')) userContact = '+91' + userContact.replace(/\D/g, '');
        if (!guideContact.startsWith('+')) guideContact = '+91' + guideContact.replace(/\D/g, '');

        const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
        // Re-init client to be safe inside handler
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        const response = new twilio.twiml.VoiceResponse();
        response.say({ language: 'en-IN' }, "Connecting you to your Guide securely.");
        const dial = response.dial({ callerId: twilioNumber });
        dial.number(guideContact);

        await client.calls.create({
            twiml: response.toString(),
            to: userContact,
            from: twilioNumber
        });

        res.json({ success: true });
    } catch (e) {
        console.error("Secure Call Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- GUIDE STORY APIs ---

// API: Create a Story (Guide uploads image/video)
app.post('/api/stories/create', upload.single('media'), async (req, res) => {
    try {
        const { guideContact, guideName, caption, location, mediaType } = req.body;
        
        if (!guideContact || !req.file) {
            return res.status(400).json({ error: "Guide contact and media file are required" });
        }

        // Upload to S3
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `stories/${guideContact}_${Date.now()}${fileExtension}`;
        
        const uploadParams = {
            Bucket: S3_BUCKET,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: 'public-read'
        };

        await s3Client.send(new PutObjectCommand(uploadParams));
        const mediaUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${fileName}`;

        // Create story with 24-hour expiration
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        const story = await GuideStory.create({
            guideContact,
            guideName,
            mediaUrl,
            mediaType: mediaType || 'image',
            caption,
            location,
            expiresAt
        });

        console.log(`[STORY] New story created by ${guideName}: ${story.id}`);
        res.json({ success: true, story });
    } catch (error) {
        console.error("Create story error:", error);
        res.status(500).json({ error: "Failed to create story: " + error.message });
    }
});

// API: Get All Active Stories (Not Expired)
app.get('/api/stories/active', async (req, res) => {
    try {
        const stories = await GuideStory.findAll({
            where: {
                expiresAt: { [Op.gt]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });

        // Group stories by guide
        const groupedStories = stories.reduce((acc, story) => {
            const contact = story.guideContact;
            if (!acc[contact]) {
                acc[contact] = {
                    guideContact: contact,
                    guideName: story.guideName,
                    stories: []
                };
            }
            acc[contact].stories.push(story);
            return acc;
        }, {});

        res.json(Object.values(groupedStories));
    } catch (error) {
        console.error("Fetch active stories error:", error);
        res.status(500).json({ error: "Failed to fetch stories" });
    }
});

// API: Get Stories for a Specific Guide
app.get('/api/stories/guide/:contact', async (req, res) => {
    try {
        const { contact } = req.params;
        const stories = await GuideStory.findAll({
            where: {
                guideContact: contact,
                expiresAt: { [Op.gt]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });
        res.json(stories);
    } catch (error) {
        console.error("Fetch guide stories error:", error);
        res.status(500).json({ error: "Failed to fetch guide stories" });
    }
});

// API: Record Story View
app.post('/api/stories/view', async (req, res) => {
    try {
        const { storyId, viewerContact, viewerName } = req.body;
        
        if (!storyId || !viewerContact) {
            return res.status(400).json({ error: "Story ID and viewer contact are required" });
        }

        // Check if already viewed by this user
        const existingView = await StoryView.findOne({
            where: { storyId, viewerContact }
        });

        if (!existingView) {
            await StoryView.create({ storyId, viewerContact, viewerName });
            
            // Increment view count
            const story = await GuideStory.findByPk(storyId);
            if (story) {
                await story.update({ viewCount: story.viewCount + 1 });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Record story view error:", error);
        res.status(500).json({ error: "Failed to record view" });
    }
});

// API: Get Story Views (for guide to see who viewed)
app.get('/api/stories/:storyId/views', async (req, res) => {
    try {
        const { storyId } = req.params;
        const views = await StoryView.findAll({
            where: { storyId },
            order: [['viewedAt', 'DESC']]
        });
        res.json(views);
    } catch (error) {
        console.error("Fetch story views error:", error);
        res.status(500).json({ error: "Failed to fetch views" });
    }
});

// API: Delete Story (Guide can delete their own story)
app.delete('/api/stories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { guideContact } = req.body;
        
        const story = await GuideStory.findByPk(id);
        if (!story) {
            return res.status(404).json({ error: "Story not found" });
        }

        if (story.guideContact !== guideContact) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await story.destroy();
        console.log(`[STORY] Deleted story ${id} by ${guideContact}`);
        res.json({ success: true });
    } catch (error) {
        console.error("Delete story error:", error);
        res.status(500).json({ error: "Failed to delete story" });
    }
});

// Cleanup expired stories (run periodically)
async function cleanupExpiredStories() {
    try {
        const deleted = await GuideStory.destroy({
            where: {
                expiresAt: { [Op.lt]: new Date() }
            }
        });
        if (deleted > 0) {
            console.log(`[CLEANUP] Deleted ${deleted} expired stories`);
        }
    } catch (error) {
        console.error("Cleanup stories error:", error);
    }
}

// Run cleanup every hour
setInterval(cleanupExpiredStories, 60 * 60 * 1000);

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
        2. localStories (સ્થાનિક કથાઓ અને માન્યતાઓ): (NEW) Include unheard stories, miracles reported by locals, and folklore that isn't in official history books. Write in deep Gujarati.
        3. hiddenGems (છુપાયેલા રહસ્યો અને વિશેષતાઓ): (NEW) Mention secret spots in or around the temple, specific carvings to look for, or nearby hidden spiritual places that general tourists miss. Write in deep Gujarati.
        4. significance (મહત્વ અને રહસ્યો): Reveal hidden secrets that only local guides know. Explain rituals, mysteries, and spiritual benefits.
        5. architecture (સ્થાપત્ય દર્શન): Don't just list styles. Walk the user through the temple. "As you enter the main gate...", "Observe the carving on the dome...". Write in Gujarati.

        Provide the response in a JSON format with exactly these fields:
        {
          "name_gu": "Temple name in Gujarati",
          "name_hi": "Temple name in Hindi",
          "name_en": "Temple name in English",
          "history": "Comprehensive Guide Script in Gujarati",
          "localStories": "Unheard local stories and folklore about the temple in Gujarati",
          "hiddenGems": "Hidden spots and special observations in and around the temple in Gujarati",
          "architecture": "Virtual Architectural Tour (સ્થાપત્ય દર્શન) in Gujarati",
          "significance": "Hidden Secrets, Rituals & Spiritual Significance (રહસ્યો અને મહત્વ) in Gujarati",
          "district": "Exact District Name in English",
          "bestTimeToVisit": "Best time to visit in Gujarati",
          "howToReach": "Detailed Travel Guide in Gujarati",
          "nearbyAttractions": "List of nearby attractions in Gujarati",
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

        // Normalize fields that might be returned as arrays by AI
        if (Array.isArray(generatedData.nearbyAttractions)) {
            generatedData.nearbyAttractions = generatedData.nearbyAttractions.join('\n');
        }

        res.json({ success: true, data: generatedData });
    } catch (error) {
        console.error("Gemini Gen Error:", error);
        res.status(500).json({ error: "Gemini Generation failed: " + error.message });
    }
});

// POST: Analyze Image (Landmark Recognition)
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No image provided" });

        const { language = 'gu' } = req.body; // Get language from request body, default to Gujarati
        
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;

        // Determine language name for prompt
        const languageMap = {
            'gu': 'Gujarati (ગુજરાતી)',
            'hi': 'Hindi (हिंदी)',
            'en': 'English'
        };
        const targetLanguage = languageMap[language] || languageMap['gu'];

        const prompt = `Identify this temple, religious landmark, or historical place. 
        Provide a detailed response ONLY in ${targetLanguage}. 
        Include:
        1. 🛕 Name of the place
        2. 📍 Location
        3. 📜 Historical Significance
        4. 🏛️ Architectural Style
        5. 🌸 Best time to visit
        6. ✨ Special features or interesting facts
        
        Use emojis and make it look premium and engaging. 
        If the image is not a landmark, politely inform the user in ${targetLanguage}.`;

        const result = await model.generateContent([
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            },
            prompt
        ]);

        const responseText = result.response.text();
        console.log(`[AI SCAN] Image analyzed in ${language}`);
        res.json({ success: true, analysis: responseText });
    } catch (error) {
        console.error("Image Analysis Error:", error);
        const errorMessages = {
            'gu': 'નિદાન નિષ્ફળ ગયું: ',
            'hi': 'विश्लेषण विफल रहा: ',
            'en': 'Analysis failed: '
        };
        const errorMsg = errorMessages[req.body.language || 'gu'] || errorMessages['gu'];
        res.status(500).json({ error: errorMsg + error.message });
    }
});

// POST: Get Detailed Information about Scanned Landmark
app.post('/api/analyze-image/detailed', async (req, res) => {
    try {
        const { placeName, language = 'gu' } = req.body;
        
        if (!placeName) {
            return res.status(400).json({ error: "Place name is required" });
        }

        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // Determine language name for prompt
        const languageMap = {
            'gu': 'Gujarati (ગુજરાતી)',
            'hi': 'Hindi (हिंदी)',
            'en': 'English'
        };
        const targetLanguage = languageMap[language] || languageMap['gu'];

        const prompt = `Act as an Expert Tourist Guide. Provide COMPREHENSIVE and DETAILED information about "${placeName}" ONLY in ${targetLanguage}.

        Structure your response with these sections (use emojis):

        🛕 **સ્થળનું નામ / Name**
        Full name of the place

        📍 **સ્થાન / Location**
        Exact location, district, state, and how to reach

        📜 **ઈતિહાસ અને કથા / History & Story**
        - Complete historical background
        - Legends and mythological stories
        - When was it built and by whom
        - Historical significance
        - Famous events associated with it
        (Write at least 200 words)

        🏛️ **સ્થાપત્ય કલા / Architecture**
        - Architectural style and features
        - Special carvings or designs
        - Materials used
        - Unique structural elements
        - What to observe while visiting
        (Write at least 150 words)

        ✨ **મહત્વ અને રહસ્યો / Significance & Secrets**
        - Religious/spiritual significance
        - Hidden secrets or lesser-known facts
        - Miracles or divine experiences reported
        - Special rituals or traditions
        - Why this place is important

        🌸 **મુલાકાત લેવાનો શ્રેષ્ઠ સમય / Best Time to Visit**
        - Best months/seasons
        - Special festivals or events
        - Timing (opening/closing hours)
        - Crowd information

        🚗 **કેવી રીતે પહોંચવું / How to Reach**
        - By road (nearest highways, bus routes)
        - By train (nearest railway station)
        - By air (nearest airport)
        - Local transportation options

        🏨 **રહેવાની વ્યવસ્થા / Accommodation**
        - Nearby hotels and lodges
        - Dharamshalas or guest houses
        - Approximate price ranges

        🍽️ **ખાસ ખોરાક / Special Food**
        - Famous local dishes to try
        - Recommended restaurants or food stalls
        - Prasad or temple food (if applicable)

        📸 **ફોટોગ્રાફી ટિપ્સ / Photography Tips**
        - Best spots for photos
        - Best time of day for photography
        - Any restrictions

        ⚠️ **મહત્વપૂર્ણ સૂચનાઓ / Important Guidelines**
        - Dress code (if any)
        - Things to carry
        - What to avoid
        - Safety tips
        - Entry fees (if any)

        🗺️ **નજીકના આકર્ષણો / Nearby Attractions**
        - Other temples or tourist spots nearby
        - Distance from this place
        - Combined tour suggestions

        Make it extremely detailed and informative - like a professional tourist guide would explain. Use rich language and engaging storytelling in ${targetLanguage}.`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const responseText = result.response.text();
        console.log(`[AI DETAILED INFO] Generated for "${placeName}" in ${language}`);
        res.json({ success: true, detailedInfo: responseText });
    } catch (error) {
        console.error("Detailed Info Error:", error);
        const errorMessages = {
            'gu': 'વિગતવાર માહિતી મેળવવામાં નિષ્ફળ: ',
            'hi': 'विस्तृत जानकारी प्राप्त करने में विफल: ',
            'en': 'Failed to get detailed information: '
        };
        const errorMsg = errorMessages[req.body.language || 'gu'] || errorMessages['gu'];
        res.status(500).json({ error: errorMsg + error.message });
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
        const axios = require('axios'); // Import axios
        
        // 1. Fetch Actual Route from Google Maps (if API Key exists)
        let googleRouteContext = "";
        let estimatedDistance = "";
        let estimatedTime = "";
        const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

        if (GOOGLE_API_KEY && GOOGLE_API_KEY !== 'your_google_maps_api_key_here' && travelMode === 'road') {
            try {
                console.log(`[JOURNEY] Fetching Google Maps route: ${origin} -> ${destination}`);
                const mapsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${GOOGLE_API_KEY}`;
                
                const mapsResponse = await axios.get(mapsUrl);
                const route = mapsResponse.data.routes[0];
                
                if (route && route.legs && route.legs[0]) {
                    const leg = route.legs[0];
                    estimatedDistance = leg.distance.text;
                    estimatedTime = leg.duration.text;
                    
                    // Extract major steps/cities
                    // We can take end_address of major steps to identify cities
                    const steps = leg.steps;
                    const routePath = steps.map(s => s.html_instructions.replace(/<[^>]*>/g, '')).join(' -> ');
                    
                    googleRouteContext = `
                    ACTUAL GOOGLE MAPS ROUTE DATA:
                    - Total Distance: ${estimatedDistance}
                    - Total Time: ${estimatedTime}
                    - Route Steps: ${routePath}
                    
                    CRITICAL: You MUST follow THIS specific route path. Do NOT invent a different route.
                    Map the "Stops" to locations mentioned in the Route Steps above.
                    `;
                    console.log("[JOURNEY] Google Maps route fetched successfully");
                }
            } catch (mapError) {
                console.error("[JOURNEY] Google Maps API Error (falling back to AI):", mapError.message);
            }
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using 'gemini-flash-latest' as confirmed by test script
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `Act as a comprehensive travel and spiritual tour guide for Indian routes. 
        Analyze the road route from "${origin}" to "${destination}".
        
        ${googleRouteContext}
        
        ${modeInstructions}
        
        CRITICAL INSTRUCTIONS FOR ROAD TRAVEL:
        
        1. ROUTE SELECTION:
           ${googleRouteContext ? "- USE THE GOOGLE MAPS ROUTE PROVIDED ABOVE." : "- Identify the NEAREST/SHORTEST road route (by distance or time)"}
           - Use major highways (NH/SH) that connect these cities
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
           ${estimatedDistance ? `- Total Distance is approx ${estimatedDistance}` : "- Provide accurate distances"}
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
        
        CRITICAL: Provide ALL text content strictly in ${langName} language.
        
        For each stop, provide:
        1. Name: The name of the location
        2. Category: One of the categories above (emoji + name in ${langName})
        3. Highway: Which highway/road this place is on (e.g., "NH-27", "SH-31")
        4. DistanceFromOrigin: Cumulative distance from starting point (e.g., "45 કિમી")
        5. Story: A detailed narrative about this place - its history, significance, or what makes it special in ${langName}.
        6. FamousFor: (NEW) Specifically list famous FOOD items, HANDICRAFTS, or SPECIALTIES of this village/town (e.g., "Bhavnagar Ganthiya", "Sihor Penda"). If not applicable, mention main attraction.
        7. DivineSecret/SpecialTip: For temples: mystical facts. For others: insider tips, best items, timings in ${langName}.
        8. PracticalInfo: Distance from previous stop, opening hours, contact if applicable in ${langName}.
        9. TravelersTip: Practical advice for travelers in ${langName}.
        10. StopSequence: Numbered order from start to end.
        
        Format the response as a JSON object:
        {
          "routePath": "The nearest route path with highway in ${langName} (e.g., રાજકોટ → બબરા → સિહોર → ભાવનગર via NH-27)",
          "routeTitle": "A comprehensive title for this journey in ${langName}",
          "highwayName": "Main highway name (e.g., NH-27, SH-31)",
          "estimatedDistance": "Approximate road distance in km",
          "estimatedTime": "Approximate travel time",
          "travelOptions": [
            {
              "mode": "Mode name (Train/Flight/Road) in ${langName}",
              "duration": "Duration in ${langName}",
              "approxCost": "Approximate cost range for a family in ${langName}",
              "prosCons": "Pros and cons in ${langName}"
            }
          ],
          "destinationPlan": {
            "topHotels": "Top 3-5 recommended hotels at the destination with approx price category in ${langName}",
            "localTourPlan": "A 1-2 day suggested local sightseeing plan at the destination in ${langName}",
            "localTravelRent": "Typical prices for Auto, Taxi, and Rent-a-car/bike at the destination in ${langName}"
          },
          "stops": [
            {
              "name": "Stop Name",
              "category": "Category with emoji",
              "highway": "Highway/Road name",
              "distanceFromOrigin": "Distance from start in ${langName}",
              "story": "Detailed narrative in ${langName}",
              "famousFor": "Famous food/item/specialty in ${langName}",
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
            estimatedTime: responseData.estimatedTime || 'Calculating...',
            travelOptions: responseData.travelOptions || [],
            destinationPlan: responseData.destinationPlan || null
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


// POST: Upload Temple Image to AWS S3
app.post('/api/admin/upload-temple-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }
        
        // Generate unique filename
        const fileExtension = path.extname(req.file.originalname);
        const uniqueFilename = `temples/temple-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
        
        // Upload to S3
        const uploadParams = {
            Bucket: S3_BUCKET,
            Key: uniqueFilename,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            // ACL line removed - Bucket Usage Policy handles public access
        };
        
        console.log(`[ADMIN] Uploading image to S3: ${uniqueFilename}`);
        
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        
        // Construct S3 URL
        const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${uniqueFilename}`;
        
        console.log(`[ADMIN] Image uploaded successfully: ${imageUrl}`);
        
        res.json({ 
            success: true, 
            imageUrl: imageUrl,
            filename: uniqueFilename
        });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload image to S3: ' + error.message });
    }
});

// POST: Add New Temple
app.post('/api/admin/add-temple', async (req, res) => {
    try {
        const { 
            state, district, name, name_en, name_hi, description, liveVideoId, location, history,
            history_en, history_hi, architecture, architecture_en, architecture_hi,
            significance, significance_en, significance_hi,
            bestTimeToVisit, howToReach, nearbyAttractions, liveChannelUrl, aartiTimings, imageUrl
        } = req.body;
        
        if (!state || !name) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Normalize nearbyAttractions if it's an array
        let finalNearbyAttractions = nearbyAttractions;
        if (Array.isArray(nearbyAttractions)) {
            finalNearbyAttractions = nearbyAttractions.join('\n');
        } else if (typeof nearbyAttractions === 'object' && nearbyAttractions !== null) {
            finalNearbyAttractions = JSON.stringify(nearbyAttractions);
        }

        const temple = await Temple.create({ 
            state, district, name, name_en, name_hi, description, liveVideoId, location, history,
            history_en, history_hi, architecture, architecture_en, architecture_hi,
            significance, significance_en, significance_hi,
            bestTimeToVisit, howToReach, nearbyAttractions: finalNearbyAttractions, liveChannelUrl, aartiTimings, imageUrl
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

        // Normalize nearbyAttractions if it's an array/object
        if (Array.isArray(updateData.nearbyAttractions)) {
            updateData.nearbyAttractions = updateData.nearbyAttractions.join('\n');
        } else if (typeof updateData.nearbyAttractions === 'object' && updateData.nearbyAttractions !== null) {
            updateData.nearbyAttractions = JSON.stringify(updateData.nearbyAttractions);
        }

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

server.listen(port, '0.0.0.0', async () => {
    console.log(`\n--- Somnath Aarti Server (PostgreSQL) ---`);
    console.log(`Local: http://localhost:${port}`);
    
    await initDb();
    
    // Initial status check
    setTimeout(updateAllLiveStatuses, 5000);
    // Recurring check every 10 mins
    setInterval(updateAllLiveStatuses, 2 * 60 * 1000);

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
