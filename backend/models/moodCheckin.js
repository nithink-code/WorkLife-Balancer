const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const moodCheckinSchema = new Schema({
    userId : {type: mongoose.Schema.Types.ObjectId,ref: 'User',required:true},
    timeStamp : {type:Date ,default:Date.now},
    mood: {type:Number,required: true}, // Range 1-5
    stress: {type:Number,required:true}, // Range 1-5
},{timestamps:true});

const MoodCheckin = mongoose.model("MoodCheckin",moodCheckinSchema);
module.exports = MoodCheckin;