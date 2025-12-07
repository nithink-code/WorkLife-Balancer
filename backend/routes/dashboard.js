const express = require("express");
const router = express.Router();
const authenticateToken = require("../models/Auth");
const task = require("../models/Task");
const moodCheckIn = require("../models/moodCheckin");
const session = require("../models/Session");
const breakActivity = require("../models/breakActivity");
const MoodCheckin = require("../models/moodCheckin");
const User = require("../models/userModel");

// Helper to format day in local timezone
function dayKey(d){
  const dt = new Date(d);
  // Use local date components to avoid timezone shifts
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone
}

router.get('/weekly-data',authenticateToken,async(req,res)=>{
  try{
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(today);
    start.setDate(start.getDate()-6); // last 7 days including today

    const[tasks,breaks,moods] = await Promise.all([
      task.find({
        userId,
        $or: [
          {createdAt: {$gte: start}},
          {startTime: {$gte: start}},
          {endTime: {$gte: start}}
        ]
      }).lean(),
      breakActivity.find({userId,timestamp: {$gte: start}}).lean(),
      MoodCheckin.find({
        userId,
        $or:[
          {timeStamp: {$gte: start}},
          {timestamp: {$gte: start}},
          {createdAt: {$gte: start}},
        ],
      }).lean(),
    ]);
    
    (`📊 [Dashboard] Found ${tasks.length} tasks, ${breaks.length} breaks, ${moods.length} moods for user ${userId}`);

    // Prepare last 7 days labels
    const labels = [];
    const tasksPerDay = [];
    const breaksPerDay = [];
    const moodAvgPerDay = [];
    const moodCounts = [];
    const dateMapping = []; // For debugging

    for(let i=0;i<7;i++){
      const d = new Date(start);
      d.setDate(d.getDate() + i); // Fixed: use d.getDate() instead of start.getDate()
      const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
      const date = d.getDate();
      const month = d.getMonth() + 1;
      // Format: "Mon 12/1" (weekday + month/day) for better clarity
      labels.push(`${weekday} ${month}/${date}`);
      tasksPerDay.push(0);
      breaksPerDay.push(0);
      moodAvgPerDay.push(0);
      moodCounts.push(0);
      dateMapping.push({
        index: i,
        date: d.toLocaleDateString(),
        dayKey: dayKey(d),
        weekday: weekday,
        label: `${weekday} ${month}/${date}`
      });
    }
    
    ('📅 [Dashboard] Processing dates:', {
      today: today.toLocaleDateString(),
      todayKey: dayKey(today),
      start: start.toLocaleDateString(),
      startKey: dayKey(start),
      dateMapping
    });

    const indexForDate = (date) =>{
      if (!date) return -1;
      const key = dayKey(date);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i); // Fixed: use d.getDate() instead of start.getDate()
        if (dayKey(d) === key) return i;
      }
      return -1;
    };

    // Accumulate tasks (only 'work' type tasks count for streaks)
    (`\n🔍 [Dashboard] Processing ${tasks.length} tasks:`);
    tasks.forEach((t, index)=>{
      // Only count 'work' type tasks for daily streaks (not 'break' type)
      if (t.type !== 'work') {
        if (index < 5) (`  Task ${index + 1}: ⏭️ Skipping non-work task: type=${t.type}`);
        return;
      }
      
      // Only count completed tasks
      if (!t.completed) {
        if (index < 5) (`  Task ${index + 1}: ⏭️ Skipping incomplete task`);
        return;
      }
      
      // Use endTime to determine which day the task was completed (when the timer finished)
      // This ensures that completed tasks count for the day they were finished
      const taskDate = t.endTime || t.createdAt || t.startTime;
      const idx = indexForDate(taskDate);
      if(idx >= 0) {
        tasksPerDay[idx]++;
        if (index < 10) {
          (`  Task ${index + 1}: ✅ Mapped to [${idx}] ${labels[idx]} - Completed: ${new Date(taskDate).toLocaleDateString()}, Key: ${dayKey(taskDate)}`);
        }
      } else {
        (`  Task ${index + 1}: ⚠️ NOT mapped (outside window) - Completed: ${new Date(taskDate).toLocaleDateString()}, Key: ${dayKey(taskDate)}`);
      }
    });
    
    ('\n📊 [Dashboard] Tasks per day after accumulation:', tasksPerDay);
    ('📊 [Dashboard] Label mapping:', labels.map((l, i) => `[${i}] ${l}: ${tasksPerDay[i]} tasks`).join(', '));
    
    // Accumulate Breaks - count each break activity
    (`\n🔍 [Dashboard] Processing ${breaks.length} breaks:`);
    breaks.forEach((b, index)=>{
      const breakDate = b.timestamp || b.timeStamp || b.createdAt;
      const idx = indexForDate(breakDate);
      if(idx >= 0) {
        breaksPerDay[idx]++;
        if (index < 10) {
          (`  Break ${index + 1}: ☕ Mapped to [${idx}] ${labels[idx]} - Date: ${new Date(breakDate).toLocaleDateString()}`);
        }
      } else {
        (`  Break ${index + 1}: ⚠️ NOT mapped (outside window) - Date: ${new Date(breakDate).toLocaleDateString()}`);
      }
    });
    
    ('\n📊 [Dashboard] Breaks per day after accumulation:', breaksPerDay);
    ('📊 [Dashboard] Label mapping:', labels.map((l, i) => `[${i}] ${l}: ${breaksPerDay[i]} breaks`).join(', '));

    // Accumulate Moods - count each mood check-in
    (`\n🔍 [Dashboard] Processing ${moods.length} moods:`);
    moods.forEach((m, index)=>{
      const moodDate = m.timeStamp || m.timestamp || m.createdAt;
      const idx = indexForDate(moodDate);
      if(idx >= 0) {
        // Count the mood check-in regardless of mood value
        moodCounts[idx]++;
        // Add to average if mood value exists
        if (typeof m.mood === "number" && !isNaN(m.mood)) {
          moodAvgPerDay[idx] += m.mood;
        }
        if (index < 10) {
          (`  Mood ${index + 1}: 😊 Mapped to [${idx}] ${labels[idx]} - Date: ${new Date(moodDate).toLocaleDateString()}, Mood: ${m.mood}, Count: ${moodCounts[idx]}`);
        }
      } else {
        (`  Mood ${index + 1}: ⚠️ NOT mapped (outside window) - Date: ${new Date(moodDate).toLocaleDateString()}`);
      }
    });
    
    ('\n📊 [Dashboard] Mood counts per day after accumulation:', moodCounts);
    ('📊 [Dashboard] Label mapping:', labels.map((l, i) => `[${i}] ${l}: ${moodCounts[i]} moods (avg: ${moodCounts[i] > 0 ? (moodAvgPerDay[i] / moodCounts[i]).toFixed(2) : 'N/A'})`).join(', '));

    for(let i=0;i<7;i++){
      moodAvgPerDay[i] = moodCounts[i] > 0 ? (moodAvgPerDay[i]/moodCounts[i]).toFixed(2) : null;
    }

    // Get user data for streak tracking
    const user = await User.findById(userId);
    
    // Build a map of dates in the last 7 days that have tasks
    const datesWithTasks = new Set();
    for (let i = 0; i < 7; i++) {
      if (tasksPerDay[i] > 0) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const key = dayKey(d);
        datesWithTasks.add(key);
      }
    }
    
    // Get existing streak history from user (array of dates with tasks)
    const existingHistory = user && user.streakHistory ? [...user.streakHistory] : [];
    
    // Add new dates with tasks to history
    datesWithTasks.forEach(dateKey => {
      if (!existingHistory.includes(dateKey)) {
        existingHistory.push(dateKey);
        (`📅 [Dashboard] Adding date to history: ${dateKey}`);
      }
    });
    
    // Keep only last 365 days in history
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const cleanedHistory = existingHistory
      .filter(date => new Date(date) >= oneYearAgo)
      .sort();
    
    // Build complete set of all dates with tasks
    const allTaskDates = new Set(cleanedHistory);
    
    // Calculate current streak (consecutive days from today backwards)
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    while (currentStreak < 365) {
      const checkKey = dayKey(checkDate);
      if (allTaskDates.has(checkKey)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Calculate longest streak from entire history
    const sortedDates = [...allTaskDates].sort();
    let maxStreak = 0;
    let currentRun = 0;
    let prevDate = null;
    
    sortedDates.forEach(dateStr => {
      if (prevDate) {
        const prev = new Date(prevDate);
        const curr = new Date(dateStr);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentRun++;
        } else {
          maxStreak = Math.max(maxStreak, currentRun);
          currentRun = 1;
        }
      } else {
        currentRun = 1;
      }
      prevDate = dateStr;
    });
    maxStreak = Math.max(maxStreak, currentRun);
    
    // Longest streak should be max of current and historical max
    const savedLongestStreak = user && user.longestStreak ? user.longestStreak : 0;
    const finalLongestStreak = Math.max(savedLongestStreak, maxStreak, currentStreak);
    
    // Get the most recent date with tasks
    const mostRecentTaskDate = cleanedHistory.length > 0 
      ? cleanedHistory[cleanedHistory.length - 1] 
      : user?.lastTaskDate;
    
    // Update user document with latest streak data
    await User.findByIdAndUpdate(userId, {
      streakHistory: cleanedHistory,
      currentStreak,
      longestStreak: finalLongestStreak,
      lastTaskDate: mostRecentTaskDate
    });
    
    (`📊 [Dashboard] Streaks - Current: ${currentStreak}, Longest: ${finalLongestStreak}, History: ${cleanedHistory.length} dates`);
    
    // Build visual data: show green for all days with tasks in last 7 days
    const visualStreakData = labels.map((_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = dayKey(d);
      return allTaskDates.has(key);
    });

    ('📊 [Dashboard] Visual data:', labels.map((label, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return `${label}(${dayKey(d)}):${visualStreakData[i] ? '✅' : '❌'}`;
    }).join(', '));

    const responseData = {
      labels,
      tasksPerDay,
      breaksPerDay,
      moodAvgPerDay,
      moodCountsPerDay: moodCounts, // Send mood counts for weekly summary
      currentStreak,
      longestStreak: finalLongestStreak,
      streakData: visualStreakData,
    };
    
    ('📤 [Dashboard] Sending response with labels:', labels);
    ('📤 [Dashboard] Tasks per day:', tasksPerDay);
    ('📤 [Dashboard] Breaks per day:', breaksPerDay);
    ('📤 [Dashboard] Mood counts per day:', moodCounts);
    
    res.json(responseData);
}catch(err){
  console.error("Error in weekly data",err);
  res.status(500).json({message: "Server Error"});
}
});






// Get weekly dashboard data
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const weekago = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Tasks completed this week
    const taskcompleted = await task.countDocuments({
      userId,
      endTime: { $gte: weekago },
    });

    // Pomodoro sessions this week and average mood/stress
    const sessionWeekly = await session.find({
      userId,
      startTime: { $gte: weekago.getTime() },
    });

    const totalPomodoro = sessionWeekly.length;
    const avgDuration =
      totalPomodoro > 0
        ? Math.round(
            sessionWeekly.reduce((sum, s) => sum + (s.duration || 0), 0) /
              totalPomodoro
          )
        : 0;
    const avgMood =
      totalPomodoro > 0
        ? (
            sessionWeekly.reduce((sum, s) => sum + (s.mood || 0), 0) /
            totalPomodoro
          ).toFixed(2)
        : "N/A";
    const avgStress =
      totalPomodoro > 0
        ? (
            sessionWeekly.reduce((sum, s) => sum + (s.stress || 0), 0) /
            totalPomodoro
          ).toFixed(2)
        : "N/A";

    // Mood check-ins this week
    const moodCheckIns = await moodCheckIn.find({
      userId,
      $or: [
        { timeStamp: { $gte: weekago } },
        { timestamp: { $gte: weekago } },
      ],
    });

    const moodStats =
      moodCheckIns.length > 0
        ? {
            averageMood: (
              moodCheckIns.reduce((sum, m) => sum + m.mood, 0) /
              moodCheckIns.length
            ).toFixed(2),
            averageStress: (
              moodCheckIns.reduce((sum, m) => sum + m.stress, 0) /
              moodCheckIns.length
            ).toFixed(2),
          }
        : { averageMood: "N/A", averageStress: "N/A" };

    // Break activities this week
    const breaksWeekly = await breakActivity.countDocuments({
      userId,
      timestamp: { $gte: weekago },
    });
    res.json({
      taskcompleted,
      totalPomodoro,
      avgDuration,
      avgMood,
      avgStress,
      moodStats,
      breaksWeekly,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user profile stats (for ProfileProgressCard)
router.get("/user-stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6); // Last 7 days

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all tasks for the week including future tasks (ordered by creation date, newest first)
    const tasks = await task.find({
      userId,
      $or: [
        { endTime: { $gte: weekStart } },
        { startTime: { $gte: weekStart } }
      ]
    }).sort({ createdAt: -1 }); // Sort by creation date descending (newest first)

    (`[user-stats] Found ${tasks.length} tasks for user ${userId}`);

    // Calculate total hours worked this week
    let totalHoursWorked = 0;
    let currentTaskInProgress = null;
    const now = new Date();

    // PRIORITY: Check for active or future tasks first (newest created task that is valid)
    for (const t of tasks) {
      const start = new Date(t.startTime);
      const end = new Date(t.endTime);
      
      // Only consider work tasks, not break tasks
      if (t.type === 'work') {
        // Check if task is in progress OR scheduled for future (but not ended)
        if (end > now && !currentTaskInProgress) {
          // This task is either active now or will be active in the future
          const isActive = start <= now; // Currently in progress
          const isFuture = start > now; // Scheduled for future
          
          (`[user-stats] Found ${isActive ? 'ACTIVE' : 'FUTURE'} task: ${t._id}`, {
            start: start.toISOString(),
            end: end.toISOString(),
            now: now.toISOString()
          });
          
          // Calculate timer-specific data
          const totalDuration = end - start; // Total duration in milliseconds
          let elapsed, remaining, timerProgress, hoursCompleted;
          
          if (isActive) {
            // Task is currently in progress
            elapsed = now - start; // Elapsed time in milliseconds
            remaining = end - now; // Remaining time in milliseconds
            timerProgress = Math.min(((elapsed / totalDuration) * 100), 100); // 0-100%
            hoursCompleted = elapsed / (1000 * 60 * 60);
            
            // Add hours worked so far
            totalHoursWorked += hoursCompleted;
          } else {
            // Task is scheduled for future
            elapsed = 0;
            remaining = end - now;
            timerProgress = 0;
            hoursCompleted = 0;
          }
          
          // Store current task info for real-time progress and timer
          currentTaskInProgress = {
            taskId: t._id,
            _id: t._id,
            startTime: t.startTime,
            endTime: t.endTime,
            type: t.type,
            isPomodoroEnabled: t.isPomodoroEnabled,
            progress: isActive ? Math.min(((now - start) / (end - start)) * 100, 100) : 0,
            // Timer-specific fields
            timerProgress: parseFloat(timerProgress.toFixed(2)), // Task completion percentage
            totalDurationMs: totalDuration,
            elapsedMs: elapsed,
            remainingMs: Math.max(0, remaining),
            elapsedHours: parseFloat(hoursCompleted.toFixed(2)),
            totalHours: parseFloat(((end - start) / (1000 * 60 * 60)).toFixed(2)),
            remainingHours: parseFloat(Math.max(0, remaining / (1000 * 60 * 60)).toFixed(2)),
            isActive: isActive,
            isFuture: isFuture
          };
          
          // Found the most recent valid task, break loop
          break;
        }
      }
    }

    // Now calculate total hours worked for completed tasks
    tasks.forEach((t) => {
      const start = new Date(t.startTime);
      const end = new Date(t.endTime);
      
      // Only count work tasks, not break tasks
      if (t.type === 'work') {
        // Skip if this is the current task (already counted above)
        if (currentTaskInProgress && (t._id.toString() === currentTaskInProgress.taskId.toString())) {
          return; // Already counted
        }
        
        // Check if task is in progress (started but not yet finished) - should not happen as we handled above
        if (start <= now && end > now) {
          // Task is currently in progress - calculate hours worked so far
          const hoursCompleted = (now - start) / (1000 * 60 * 60);
          totalHoursWorked += hoursCompleted;
          
          (`[user-stats] Task IN PROGRESS: ${t._id}`, {
            start: start.toISOString(),
            end: end.toISOString(),
            now: now.toISOString(),
            hoursCompleted: hoursCompleted.toFixed(2)
          });
          
          // Calculate timer-specific data for the active task
          const totalDuration = end - start; // Total duration in milliseconds
          const elapsed = now - start; // Elapsed time in milliseconds
          const remaining = end - now; // Remaining time in milliseconds
          const timerProgress = Math.min(((elapsed / totalDuration) * 100), 100); // 0-100%
          
          // Store current task info for real-time progress and timer
          currentTaskInProgress = {
            taskId: t._id,
            startTime: t.startTime,
            endTime: t.endTime,
            type: t.type,
            progress: Math.min(((now - start) / (end - start)) * 100, 100),
            // Timer-specific fields
            timerProgress: parseFloat(timerProgress.toFixed(2)), // Task completion percentage
            totalDurationMs: totalDuration,
            elapsedMs: elapsed,
            remainingMs: Math.max(0, remaining),
            elapsedHours: parseFloat(hoursCompleted.toFixed(2)),
            totalHours: parseFloat(((end - start) / (1000 * 60 * 60)).toFixed(2)),
            remainingHours: parseFloat(Math.max(0, remaining / (1000 * 60 * 60)).toFixed(2)),
          };
        } else if (end <= now && start >= weekStart) {
          // Task is completed and started this week
          const hours = (end - start) / (1000 * 60 * 60);
          totalHoursWorked += hours;
          (`[user-stats] Task COMPLETED: ${t._id}, hours: ${hours.toFixed(2)}`);
        } else if (end <= now && start < weekStart && end >= weekStart) {
          // Task started before this week but ended this week
          const hours = (end - weekStart) / (1000 * 60 * 60);
          totalHoursWorked += Math.max(0, hours);
          (`[user-stats] Task PARTIAL (started before week): ${t._id}, hours: ${hours.toFixed(2)}`);
        }
        // If start > now, task is scheduled for future - don't count yet
        if (start > now) {
          (`[user-stats] Task SCHEDULED (not started): ${t._id}`, {
            start: start.toISOString(),
            end: end.toISOString()
          });
        }
      }
    });

    // Round to 2 decimal places
    totalHoursWorked = parseFloat(totalHoursWorked.toFixed(2));

    // Calculate weekly progress percentage
    const weeklyGoal = user.weeklyGoal || 40; // Default 40 hours per week
    let progress = Math.min(Math.round((totalHoursWorked / weeklyGoal) * 100), 100);

    // If there's a task in progress, calculate its real-time progress
    // and add it to the weekly progress for accurate display
    if (currentTaskInProgress) {
      const taskProgress = currentTaskInProgress.timerProgress;
      (`[user-stats] Task in progress contributes ${taskProgress.toFixed(2)}% completion`);
      
      // For the profile card: if we have an active task, show its progress directly
      // The weekly progress will continue to be calculated based on hours worked
    }

    // Ensure progress is at least 0
    progress = Math.max(0, progress);

    (`[user-stats] Summary:`, {
      totalHoursWorked,
      weeklyGoal,
      progress,
      hasTaskInProgress: !!currentTaskInProgress
    });

    // Update user progress in database if changed significantly
    if (Math.abs((user.progress || 0) - progress) > 0.5) {
      await User.findByIdAndUpdate(userId, { progress });
    }

    // Get mood check-ins for the week
    const moodCheckIns = await MoodCheckin.find({
      userId,
      $or: [
        { timeStamp: { $gte: weekStart } },
        { timestamp: { $gte: weekStart } },
      ],
    });

    const avgMoodScore = moodCheckIns.length > 0
      ? Math.round((moodCheckIns.reduce((sum, m) => sum + (m.mood || 0), 0) / moodCheckIns.length) * 10) // Scale to 100
      : 0;

    // Count completed tasks (only work tasks that have finished)
    const completedTasks = tasks.filter(t => t.type === 'work' && new Date(t.endTime) <= now).length;

    res.json({
      progress,
      moodScore: avgMoodScore,
      longestStreak: user.longestStreak || 0,
      weeklyGoal,
      hoursWorked: totalHoursWorked,
      currentTaskInProgress,
      tasksCompleted: completedTasks,
      totalTasks: tasks.filter(t => t.type === 'work').length,
    });
  } catch (err) {
    console.error("Error in user-stats:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
