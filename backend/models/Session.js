const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Sessions = new Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    taskId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
    },
    workType:{
       type: String,
       required: true,
    },
    startTime:{
       type: Number,
       required: true,
    },
    endTime:{
        type: Number,
    },
    duration:{
        type: Number,
    },
    moodRating:{
        type: Number,
    },
    stressLevel:{
       type: Number,
    },
    pauseResumeLog:[
    {
        pauseTime: {type: Number},
        resumeTime: {type: Number}
    }
]
},
{timestamps:true}
);

const Session = mongoose.model("Session",Sessions);
module.exports = Session;