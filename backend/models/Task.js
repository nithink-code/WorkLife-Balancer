const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Tasks = new Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type:{
        type: String,
        enum : ['work','break'], // It can only be work or break[enum]
        required: true,
    },
    startTime:{
        type: Date,
        required: true,
    },
    endTime:{
        type: Date,
        required: true,
    },
    isPomodoroEnabled:{
        type: Boolean,
        default: false,
    },
    completed:{
        type: Boolean,
        default: false,
    },
  },
    {timestamps: true,}
);

const Task = mongoose.model("Task",Tasks);
module.exports = Task;

