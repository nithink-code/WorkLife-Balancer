require("dotenv").config();
require("./config/passport");

const express = require("express");
const app = express();
const path = require("path");
const _dirname = path.resolve();

// Increase JSON payload limit for PDF attachments
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const authenticateJWT = require("./middleware/authenticateJWT");

// Routes
const authRoutes = require("./routes/auth");
const userPreferences = require("./routes/userPreference");
const tasks = require("./routes/tasks");
const pomodoro = require("./routes/pomodoro");
const moodCheckIn = require("./routes/mood");
const breakActivity = require("./routes/breakActivity");
const dashboard = require("./routes/dashboard");
const userRoutes = require("./routes/user");
const emailRoutes = require("./routes/email");

// Error Handling
const errorHandler = require("./middleware/errorhandler");

// Cron Jobs
const { initWeeklyDataCron } = require("./jobs/weeklyDataCron");

const PORT = process.env.PORT || 8080;
const MONGOURL = process.env.MONGO_URL;

main()
    .then(() => {
        console.log("✅ Connected to MongoDB successfully");
        initWeeklyDataCron();
    })
    .catch((err) => {
        console.error("❌ Error connecting to MongoDB:", err.message);
        process.exit(1);
    });

async function main() {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            await mongoose.connect(MONGOURL, {
                serverSelectionTimeoutMS: 30000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 30000,
                maxPoolSize: 10,
                minPoolSize: 5,
            });
            console.log("✅ Connected to MongoDB successfully on attempt", retries + 1);
            break;
        } catch (err) {
            retries++;
            console.error(`❌ MongoDB connection attempt ${retries} failed:`, err.message);
            if (retries < maxRetries) {
                console.log(`⏳ Retrying in 5 seconds... (${retries}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                throw err;
            }
        }
    }
}

app.use(cookieParser());

const allowedOrigins = [
    process.env.FRONTEND_URL || "https://worklife-balancer-1.onrender.com",
    "https://worklife-balancer-1.onrender.com"
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "mysecret",
        resave: false,
        saveUninitialized: true,
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes Middleware
app.use("/auth", authRoutes);
app.use("/user", userPreferences);
app.use("/tasks", tasks);
app.use("/pomodoro", pomodoro);
app.use("/mood", moodCheckIn);
app.use("/break", breakActivity);
app.use("/api/dashboard", dashboard);  // Changed from /dashboard to /api/dashboard
app.use("/email", emailRoutes);

app.get('/api/verify', authenticateJWT, (req, res) => {
    res.json({ registered: true, user: req.user });
});

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Catch-all route for SPA - must be AFTER API routes
// Use regex instead of '*' for Express 5 compatibility
app.get(/^\/.*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/dist", "index.html"));
});

// Error Middleware - must be LAST
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`📁 Serving frontend from: ${path.join(__dirname, "../frontend/dist")}`);
});