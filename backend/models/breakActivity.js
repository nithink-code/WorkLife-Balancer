const mongoose = require("mongoose");
const schema = mongoose.Schema;

const breakActivitySchema = new schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type:{
        type: String,
        enum: ['stretch', 'walk', 'snack', 'meditation', 'social', 'other'],
        required: true,
    },
    feedback:{
        type: String,
    },
    timestamp:{
        type: Date,
        default: Date.now,
    },
    duration:{
        type: Number, // duration in minutes
    }
}, { timestamps: true });

module.exports = mongoose.model("BreakActivity", breakActivitySchema);