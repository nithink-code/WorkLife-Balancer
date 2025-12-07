const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const User = require("../models/userModel");
const authenticateToken = require("../middleware/authenticateJWT");

("Tasks route file loaded");

// Helper to format day in local timezone (same as dashboard)
function dayKey(d){
  const dt = new Date(d);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Create a new Task
router.post("/", (req, res, next) => {
  ("[TASKS POST] ⭐ POST /tasks hit!");
  ("[TASKS POST] User from token:", req.user?.id);
  ("[TASKS POST] Request body:", req.body);
  next();
}, authenticateToken, async (req, res) => {
  ("[TASKS POST] ✅ After auth middleware, user:", req.user?.id);
  ("POST /tasks route hit, user:", req.user?.id);
  ("Request body:", req.body);
  try {
    const task = new Task({
      userId: req.user.id,
      type: req.body.type,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      isPomodoroEnabled: req.body.isPomodoroEnabled,
    });
    await task.save();
    ("Task saved successfully:", task._id);
    
    // Update user's streak data when a new task is created
    try {
      const user = await User.findById(req.user.id);
      if (user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayKey = dayKey(today);
        
        // Get existing streak history
        let streakHistory = user.streakHistory || [];
        
        // Add today to streak history if not already there
        if (!streakHistory.includes(todayKey)) {
          streakHistory.push(todayKey);
          
          // Keep only last 365 days
          const oneYearAgo = new Date(today);
          oneYearAgo.setDate(oneYearAgo.getDate() - 365);
          streakHistory = streakHistory.filter(date => {
            const d = new Date(date);
            return d >= oneYearAgo;
          }).sort(); // Keep sorted for easier processing
        }
        
        // Calculate current streak: count backwards from today
        let currentStreak = 0;
        let checkDate = new Date(today);
        const historySet = new Set(streakHistory);
        
        for (let i = 0; i < 365; i++) {
          const checkKey = dayKey(checkDate);
          if (historySet.has(checkKey)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1); // Move to previous day
          } else {
            break; // Gap found, stop counting
          }
        }
        
        // Calculate longest streak from entire history
        let longestStreak = 0;
        let tempStreak = 0;
        let prevDate = null;
        
        streakHistory.sort().forEach(dateStr => {
          if (prevDate) {
            const prev = new Date(prevDate);
            const curr = new Date(dateStr);
            const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              tempStreak++;
            } else {
              longestStreak = Math.max(longestStreak, tempStreak);
              tempStreak = 1;
            }
          } else {
            tempStreak = 1;
          }
          prevDate = dateStr;
        });
        longestStreak = Math.max(longestStreak, tempStreak);
        
        // Preserve existing longest if it's higher (this ensures we never lose the record)
        const finalLongestStreak = Math.max(longestStreak, user.longestStreak || 0, currentStreak);
        
        // Update user document
        user.lastTaskDate = todayKey;
        user.currentStreak = currentStreak;
        user.longestStreak = finalLongestStreak;
        user.streakHistory = streakHistory;
        await user.save();
        
        (`🔥 Streak updated on task creation:`);
        (`   Today: ${todayKey}`);
        (`   Current Streak: ${currentStreak} days`);
        (`   Longest Streak: ${finalLongestStreak} days`);
        (`   History Length: ${streakHistory.length} dates`);
        (`   Recent History: ${streakHistory.slice(-7).join(', ')}`);
      }
    } catch (streakErr) {
      // Don't fail task creation if streak update fails
      console.error("Failed to update streak:", streakErr);
    }
    
    // Return the created task so frontend can display it immediately
    res.status(201).json(task);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(400).json({ message: err.message });
  }
});

// Get upcoming tasks (tasks that haven't ended yet, sorted by start time)
router.get("/upcoming", authenticateToken, async (req, res) => {
  ("GET /tasks/upcoming route hit, user:", req.user?.id);
  try {
    const now = new Date();
    
    // Find tasks that haven't ended yet (includes future and currently active)
    const upcomingTasks = await Task.find({ 
      userId: req.user.id,
      endTime: { $gt: now }
    }).sort({ startTime: 1 }); // Sort by start time ascending
    
    (`Found ${upcomingTasks.length} upcoming tasks for user ${req.user.id}`);
    
    // Log task details for debugging
    upcomingTasks.forEach(task => {
      const start = new Date(task.startTime);
      const end = new Date(task.endTime);
      const isActive = now >= start && now < end;
      const isFuture = now < start;
      
      (`Task ${task._id}: ${task.type} - ${isActive ? 'ACTIVE' : isFuture ? 'UPCOMING' : 'PAST'} (${start.toLocaleTimeString()} - ${end.toLocaleTimeString()})`);
    });
    
    res.json(upcomingTasks);
  } catch (err) {
    console.error("Error in GET /tasks/upcoming:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get all tasks of the logged-in user (general endpoint)
router.get("/", authenticateToken, async (req, res) => {
  ("GET /tasks route hit, user:", req.user?.id);
  try {
    // Sort by creation date descending (newest first) to show recently added tasks at the top
    const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
    ("Found tasks:", tasks.length);
    res.json(tasks);
  } catch (err) {
    console.error("Error in GET /tasks:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get all tasks of the logged-in user
router.get("/user/:userId", authenticateToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const tasks = await Task.find({ userId: req.params.userId });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single task by ID (user must own the task)
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a Task by ID (only if owned by user)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedTask) return res.status(404).json({ message: "Task not found" });
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Partially update a Task by ID (PATCH for marking completed)
router.patch("/:id", authenticateToken, async (req, res) => {
  ("PATCH /tasks/:id route hit, user:", req.user?.id, "taskId:", req.params.id);
  ("Request body:", req.body);
  try {
    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updatedTask) {
      ("Task not found for update:", req.params.id);
      return res.status(404).json({ message: "Task not found" });
    }
    ("Task updated successfully:", updatedTask._id, "completed:", updatedTask.completed);
    res.json(updatedTask);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(400).json({ message: err.message });
  }
});

// Delete a Task by ID (only if owned by user)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const deletedTask = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deletedTask) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
