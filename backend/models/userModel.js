const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name:{type: String},
    email:{type: String, required: true, unique: true},
    password:{type: String,required: true},
    longestStreak: {type: Number, default: 0}, // Track user's all-time longest streak
    currentStreak: {type: Number, default: 0}, // Track current active streak
    lastTaskDate: {type: String, default: null}, // Last date when task was added (YYYY-MM-DD format)
    streakHistory: {type: [String], default: []}, // Array of dates with tasks (YYYY-MM-DD format)
    progress: {type: Number, default: 0}, // Overall user progress percentage (0-100)
    weeklyGoal: {type: Number, default: 40}, // Weekly hours goal (default 40 hours)
    weeklyStatsCache: {
        type: {
            totalTasks: {type: Number, default: 0},
            totalBreaks: {type: Number, default: 0},
            totalMoodCheckins: {type: Number, default: 0},
            tasksPerDay: {type: [Number], default: []},
            breaksPerDay: {type: [Number], default: []},
            moodCountsPerDay: {type: [Number], default: []},
            lastUpdated: {type: Date, default: null}
        },
        default: null
    }
},{timestamps: true});

const userModel = mongoose.model("userModel",userSchema);
module.exports = userModel;