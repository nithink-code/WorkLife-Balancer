const cron = require('node-cron');
const User = require('../models/userModel');
const Task = require('../models/Task');
const BreakActivity = require('../models/breakActivity');
const MoodCheckin = require('../models/moodCheckin');

// Helper to format day in local timezone
function dayKey(d) {
  const dt = new Date(d);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Update weekly stats cache for all users
 * Runs every hour to keep data fresh
 */
async function updateWeeklyStatsCache() {
  try {
    ('🔄 [Cron] Starting weekly stats cache update...');
    
    // Check if MongoDB connection is ready
    if (!User.collection.conn.readyState) {
      console.warn('⚠️ [Cron] MongoDB connection not ready, skipping update');
      return;
    }
    
    const users = await User.find({}, '_id').lean().maxTimeMS(8000);
    let updated = 0;
    
    for (const user of users) {
      try {
        const userId = user._id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(today);
        start.setDate(start.getDate() - 6); // last 7 days including today

        // Fetch data for the last 7 days with timeout
        const [tasks, breaks, moods] = await Promise.all([
          Task.find({ userId, endTime: { $gte: start } }).lean().maxTimeMS(8000),
          BreakActivity.find({ userId, timestamp: { $gte: start } }).lean().maxTimeMS(8000),
          MoodCheckin.find({
            userId,
            $or: [
              { timeStamp: { $gte: start } },
              { timestamp: { $gte: start } },
              { createdAt: { $gte: start } },
            ],
          }).lean().maxTimeMS(8000),
        ]);

        // Calculate daily counts
        const tasksPerDay = Array(7).fill(0);
        const breaksPerDay = Array(7).fill(0);
        const moodCountsPerDay = Array(7).fill(0);

        const indexForDate = (date) => {
          if (!date) return -1;
          const key = dayKey(date);
          for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            if (dayKey(d) === key) return i;
          }
          return -1;
        };

        // Count tasks (only 'work' type)
        tasks.forEach((t) => {
          if (t.type !== 'work') return;
          const taskDate = t.createdAt || t.startTime || t.endTime;
          const idx = indexForDate(taskDate);
          if (idx >= 0) tasksPerDay[idx]++;
        });

        // Count breaks
        breaks.forEach((b) => {
          const idx = indexForDate(b.timestamp || b.timeStamp || b.createdAt);
          if (idx >= 0) breaksPerDay[idx]++;
        });

        // Count mood check-ins - count all moods regardless of value
        moods.forEach((m) => {
          const idx = indexForDate(m.timeStamp || m.timestamp || m.createdAt);
          if (idx >= 0) {
            moodCountsPerDay[idx]++;
          }
        });

        // Calculate totals
        const totalTasks = tasksPerDay.reduce((sum, count) => sum + count, 0);
        const totalBreaks = breaksPerDay.reduce((sum, count) => sum + count, 0);
        const totalMoodCheckins = moodCountsPerDay.reduce((sum, count) => sum + count, 0);

        // Update user's cache (you can add this to User model if needed)
        await User.findByIdAndUpdate(userId, {
          weeklyStatsCache: {
            totalTasks,
            totalBreaks,
            totalMoodCheckins,
            tasksPerDay,
            breaksPerDay,
            moodCountsPerDay,
            lastUpdated: new Date(),
          }
        });

        updated++;
      } catch (userErr) {
        console.error(`❌ [Cron] Error updating user ${user._id}:`, userErr.message);
      }
    }
    
    (`✅ [Cron] Weekly stats cache updated for ${updated}/${users.length} users`);
  } catch (err) {
    console.error('❌ [Cron] Error in weekly stats cache update:', err);
  }
}

/**
 * Clean up old streak history data
 * Runs daily at 2 AM to keep only last 365 days
 */
async function cleanupOldStreakData() {
  try {
    ('🧹 [Cron] Starting streak history cleanup...');
    
    // Check if MongoDB connection is ready
    if (!User.collection.conn.readyState) {
      console.warn('⚠️ [Cron] MongoDB connection not ready, skipping cleanup');
      return;
    }
    
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    oneYearAgo.setHours(0, 0, 0, 0);
    
    const users = await User.find({ streakHistory: { $exists: true, $ne: [] } }).maxTimeMS(8000);
    let cleaned = 0;
    
    for (const user of users) {
      const cleanedHistory = user.streakHistory
        .filter(date => new Date(date) >= oneYearAgo)
        .sort();
      
      if (cleanedHistory.length !== user.streakHistory.length) {
        user.streakHistory = cleanedHistory;
        await user.save();
        cleaned++;
      }
    }
    
    (`✅ [Cron] Cleaned streak history for ${cleaned} users`);
  } catch (err) {
    console.error('❌ [Cron] Error in streak cleanup:', err.message);
  }
}

/**
 * Initialize cron jobs
 */
function initWeeklyDataCron() {
  ('⚙️ [Cron] Initializing weekly data cron jobs...');
  
  // Update weekly stats cache every hour
  cron.schedule('0 * * * *', async () => {
    ('⏰ [Cron] Running hourly weekly stats update...');
    try {
      await updateWeeklyStatsCache();
    } catch (error) {
      console.error('❌ [Cron] Error in hourly stats update:', error.message);
    }
  });
  
  // Clean up old data daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    ('⏰ [Cron] Running daily cleanup at 2 AM...');
    try {
      await cleanupOldStreakData();
    } catch (error) {
      console.error('❌ [Cron] Error in daily cleanup:', error.message);
    }
  });
  
  // Run initial update on startup (after 10 seconds to give DB time to settle)
  setTimeout(async () => {
    ('🚀 [Cron] Running initial weekly stats update...');
    try {
      await updateWeeklyStatsCache();
    } catch (error) {
      console.error('❌ [Cron] Error in initial stats update:', error.message);
    }
  }, 10000); // Wait 10 seconds after MongoDB connects
  
  ('✅ [Cron] Weekly data cron jobs initialized');
}

module.exports = { initWeeklyDataCron, updateWeeklyStatsCache };
