import React, { useState } from "react";
import { useWeeklyData } from "../../contexts/WeeklyDataContext";

const DailyStreaks = () => {
  const [open, setOpen] = useState(false);
  
  const {
    labels = [],
    tasksPerDay = [],
    streakData = [],
    currentStreak = 0,
    longestStreak = 0,
  } = useWeeklyData();

  // Use labels from context (last 7 days ending today)
  const dayLabels = labels.length === 7 ? labels : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Use streakData from backend - it already has the correct boolean values
  const daysWithTasks = Array.isArray(streakData) && streakData.length === 7 
    ? streakData 
    : Array(7).fill(false);

  // Find which days are part of the current streak (consecutive from today backwards)
  const getCurrentStreakIndices = () => {
    const indices = [];
    // Count backwards from last day (today)
    for (let i = daysWithTasks.length - 1; i >= 0; i--) {
      if (daysWithTasks[i]) {
        indices.unshift(i);
      } else {
        break; // Stop at first gap
      }
    }
    return indices;
  };
  const currentStreakIndices = getCurrentStreakIndices();
  


  return (
    <div className="daily-streaks-container">
      {/* Header */}
      <div
        className="streaks-header streaks-header-dropdown"
        onClick={() => setOpen((prev) => !prev)}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        <h2 className="streaks-title">Daily Streaks 🔥</h2>
        <span className={`dropdown-arrow${open ? " open" : ""}`} aria-label={open ? "Collapse" : "Expand"}>▼</span>
      </div>
      {/* Details, collapsible */}
      {open && (
        <React.Fragment>
          <p className="streaks-subtitle">Track your daily activity streaks throughout the week!</p>
          <div className="streak-stats-row">
            <div className="streak-stat">
              <div className="streak-label"><span>Current Streak 🔥</span></div>
              <div className="streak-number" style={{ color: currentStreak > 0 ? '#10b981' : '#9ca3af' }}>
                {currentStreak} {currentStreak === 1 ? 'DAY' : 'DAYS'}
              </div>
            </div>
            <div className="streak-stat">
              <div className="streak-label"><span>Longest Streak 🏆</span></div>
              <div className="streak-number" style={{ color: longestStreak > 0 ? '#fbbf24' : '#9ca3af' }}>
                {longestStreak} {longestStreak === 1 ? 'DAY' : 'DAYS'}
              </div>
            </div>
          </div>
          <div className="week-calendar">
            {dayLabels.map((day, idx) => {
              const hasTask = daysWithTasks[idx];
              const isInCurrentStreak = currentStreakIndices.includes(idx);
              
              let dayClass = "calendar-day";
              // Show green for days with tasks
              if (hasTask) dayClass += " active";
              // Highlight if part of current active streak
              if (isInCurrentStreak && currentStreak > 0) dayClass += " current-streak";
              
              return (
                <div key={`${day}-${idx}`} className={dayClass}>
                  <div className="day-name">{day}</div>
                  <div className="day-check">{hasTask ? "✓" : ""}</div>
                </div>
              );
            })}
          </div>
          {/* Streak messages and motivation */}
          {currentStreak === 0 && longestStreak > 0 && (
            <div className="streak-info-message" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444' }}>
              <small style={{ color: '#fca5a5', fontSize: '13px', display: 'block' }}>
                ⚠️ Streak reset! Your record: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}. Complete a task today to build a new streak! 🚀
              </small>
            </div>
          )}

        </React.Fragment>
      )}

    </div>
  );
}
export default DailyStreaks;
