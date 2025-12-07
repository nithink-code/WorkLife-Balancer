const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new mongoose.Schema({
  googleId: { type: String, sparse: true, unique: true},
  displayName: String,
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  createdAt: { type: Date, default: Date.now },
  name:{
      type: String,
    },
    workhours:{
        type: Number,
    },
    maingoal:{
        type: String,
    },
    dailybreaks:{
        type: Number,
    },
    preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: false,
      },
    },
    pomodoroSettings: {
      workDuration: {
        type: Number,
        default: 25, // minutes
      },
      shortBreakDuration: {
        type: Number,
        default: 5,
      },
      longBreakDuration: {
        type: Number,
        default: 15,
      },
    },
  },
});

const userAuth = mongoose.model("userAuth",userSchema);
module.exports = userAuth;