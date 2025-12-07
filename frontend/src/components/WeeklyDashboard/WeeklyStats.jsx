import React, { useState, useEffect } from "react";
import { useWeeklyData } from "../../contexts/WeeklyDataContext";

const WeeklyStats = () => {
  const [open, setOpen] = useState(true);
  
  const {
    tasksPerDay = [],
    breaksPerDay = [],
    moodCountsPerDay = [],
  } = useWeeklyData();

  // Calculate weekly totals
  const calculateTotal = (arr) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((sum, val) => {
      const num = Number(val);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  };

  const totalTasks = calculateTotal(tasksPerDay);
  const totalBreaks = calculateTotal(breaksPerDay);
  const totalMoodCheckins = calculateTotal(moodCountsPerDay);

  // Log updates for debugging
  useEffect(() => {
    ('[WeeklyStats] Data updated:', {
      tasksPerDay,
      breaksPerDay,
      moodCountsPerDay,
      totalTasks,
      totalBreaks,
      totalMoodCheckins
    });
  }, [tasksPerDay, breaksPerDay, moodCountsPerDay, totalTasks, totalBreaks, totalMoodCheckins]);

  return (
    <div className="weekly-stats-container">
      {/* Header */}
      <div
        className="stats-header stats-header-dropdown"
        onClick={() => setOpen((prev) => !prev)}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        <h2 className="stats-title">Weekly Activity Summary 📊</h2>
        <span className={`dropdown-arrow${open ? " open" : ""}`} aria-label={open ? "Collapse" : "Expand"}>▼</span>
      </div>
      
      {/* Details, collapsible */}
      {open && (
        <React.Fragment>
          <p className="stats-subtitle">Your total activities completed this week</p>
          
          {/* Stats Cards Row */}
          <div className="weekly-stats-row">
            <div className="stat-card tasks-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <div className="stat-label">Tasks Completed</div>
                <div className="stat-value" style={{ color: '#10b981' }}>
                  {totalTasks}
                </div>
              </div>
            </div>
            
            <div className="stat-card breaks-card">
              <div className="stat-icon">☕</div>
              <div className="stat-info">
                <div className="stat-label">Breaks Taken</div>
                <div className="stat-value" style={{ color: '#3b82f6' }}>
                  {totalBreaks}
                </div>
              </div>
            </div>
            
            <div className="stat-card mood-card">
              <div className="stat-icon">😊</div>
              <div className="stat-info">
                <div className="stat-label">Mood Check-ins</div>
                <div className="stat-value" style={{ color: '#ec4899' }}>
                  {totalMoodCheckins}
                </div>
              </div>
            </div>
          </div>
          
          {/* Visual Progress Bars */}
          <div className="stats-progress-section">
            <div className="progress-item">
              <div className="progress-header">
                <span className="progress-label">Tasks</span>
                <span className="progress-count">{totalTasks}</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar tasks-progress" 
                  style={{ 
                    width: `${Math.min((totalTasks / 20) * 100, 100)}%`,
                    backgroundColor: '#10b981'
                  }}
                />
              </div>
            </div>
            
            <div className="progress-item">
              <div className="progress-header">
                <span className="progress-label">Breaks</span>
                <span className="progress-count">{totalBreaks}</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar breaks-progress" 
                  style={{ 
                    width: `${Math.min((totalBreaks / 10) * 100, 100)}%`,
                    backgroundColor: '#3b82f6'
                  }}
                />
              </div>
            </div>
            
            <div className="progress-item">
              <div className="progress-header">
                <span className="progress-label">Mood Check-ins</span>
                <span className="progress-count">{totalMoodCheckins}</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar mood-progress" 
                  style={{ 
                    width: `${Math.min((totalMoodCheckins / 15) * 100, 100)}%`,
                    backgroundColor: '#ec4899'
                  }}
                />
              </div>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

export default WeeklyStats;
