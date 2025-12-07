import React, { useEffect, useState } from "react";
import { useWeeklyData } from "../../contexts/WeeklyDataContext";
import { useTaskTimer } from "../../contexts/TaskTimerContext";

const ProfileProgressCard = () => {
  const { userStats, currentStreak, longestStreak } = useWeeklyData();
  const { activeTask, timerProgress, isTaskActive, elapsedMs, remainingMs, totalDurationMs, formatTime } = useTaskTimer();

  // Display mode: if activeTask exists use timerProgress else weekly progress percentage (fallback)
  const [displayProgress, setDisplayProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock update for live progress calculation
  useEffect(() => {
    let intervalId;
    if (activeTask) {
      // Update current time every second for real-time progress
      intervalId = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeTask]);

  useEffect(() => {
    if (activeTask) {
      // For active tasks, always use the real-time timer progress
      const now = currentTime;
      const startTime = new Date(activeTask.startTime);
      const endTime = new Date(activeTask.endTime);
      
      let realTimeProgress = 0;
      
      if (now >= endTime) {
        // Task has ended
        realTimeProgress = 100;
      } else if (now >= startTime) {
        // Task is in progress - calculate real-time progress
        const totalDuration = endTime - startTime;
        const elapsed = now - startTime;
        realTimeProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      } else {
        // Task hasn't started yet - show 0%
        realTimeProgress = 0;
      }
      
      setDisplayProgress(Math.round(realTimeProgress * 10) / 10);
    } else {
      const weekly = typeof userStats.progress === 'number' ? userStats.progress : 0;
      setDisplayProgress(Math.min(100, Math.max(0, weekly)));
    }
  }, [activeTask, currentTime, userStats.progress]);

  // Derived times using current time state for consistency
  const startTime = activeTask ? new Date(activeTask.startTime) : null;
  const endTime = activeTask ? new Date(activeTask.endTime) : null;
  const now = currentTime;
  const hasStarted = activeTask ? now >= startTime : false;
  const hasEnded = activeTask ? now >= endTime : false;

  const progressBadgeValue = (() => {
    if (!activeTask) return `${Math.round(displayProgress)}%`;
    
    // For active tasks, use the calculated displayProgress
    return `${Math.round(displayProgress)}%`;
  })();

  const statusText = (() => {
    if (!activeTask) return 'No Active Task';
    if (hasEnded) return 'Task Completed';
    if (!hasStarted) return 'Scheduled';
    return 'In Progress';
  })();

  const remainingLabel = (() => {
    if (!activeTask) return '';
    if (hasEnded) return 'Finished';
    if (!hasStarted) return `Starts in ${formatTime(startTime - now)}`;
    return `${formatTime(remainingMs)} left`;
  })();

  return (
    <div className="profile-progress-card">
      {/* Circular Progress with Avatar */}
      <div className="circular-progress-wrapper">
        <div className="custom-circular-progress">
          <svg 
            width="180" 
            height="180" 
            viewBox="0 0 180 180" 
            className="progress-svg"
          >
            {/* Background circle */}
            <circle
              cx="90"
              cy="90"
              r="83"
              fill="none"
              stroke="#ceccccff"
              strokeWidth="11"
              strokeLinecap="round"
            />
            {/* Progress circle */}
            <circle
              cx="90"
              cy="90"
              r="83"
              fill="none"
              stroke={activeTask ? (hasEnded ? '#2ecc71' : '#10b981') : '#4063d3'}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 83}`}
              strokeDashoffset={`${2 * Math.PI * 83 * (1 - displayProgress / 100)}`}
              transform="rotate(-90 90 90)"
              style={{
                transition: 'stroke-dashoffset 0.5s ease-in-out',
              }}
            />
          </svg>
          <div className="avatar-container">
            <img src="/avatar.png" alt="User Avatar" className="avatar-image" />
            <div className="progress-badge" title={statusText}>
              {progressBadgeValue}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Boxes */}
      <div className="sidebar-stats">
        <div className="sidebar-stat-box">
          <div className="sidebar-stat-label">Current Streak 🔥</div>
          <div className="sidebar-stat-value">{currentStreak} Days</div>
        </div>
        <div className="sidebar-stat-box">
          <div className="sidebar-stat-label">Longest Streak 🏆</div>
          <div className="sidebar-stat-value">{longestStreak} Days</div>
        </div>
        {userStats.hoursWorked > 0 && (
          <div className="sidebar-stat-box">
            <div className="sidebar-stat-label">Hours This Week</div>
            <div className="sidebar-stat-value">{userStats.hoursWorked}h</div>
          </div>
        )}
      </div>



      {/* Detailed Task Timer Information */}
      {activeTask && (
        <div className="active-task-details">
          <div className="task-info-header">
            <h4 className="task-title">Current Task</h4>
            <span className="task-type-chip">{activeTask.type}</span>
          </div>
          
          <div className="task-timing-grid">
            <div className="timing-row">
              <span className="timing-label">Start:</span>
              <span className="timing-value">{new Date(activeTask.startTime).toLocaleTimeString()}</span>
            </div>
            <div className="timing-row">
              <span className="timing-label">End:</span>
              <span className="timing-value">{new Date(activeTask.endTime).toLocaleTimeString()}</span>
            </div>
            <div className="timing-row">
              <span className="timing-label">Duration:</span>
              <span className="timing-value">{formatTime(totalDurationMs)}</span>
            </div>
            {hasStarted && !hasEnded && (
              <div className="timing-row active">
                <span className="timing-label">Elapsed:</span>
                <span className="timing-value">{formatTime(elapsedMs)}</span>
              </div>
            )}
          </div>
          
          <div className="task-status-row">
            <span className={`status-badge ${hasEnded ? 'completed' : hasStarted ? 'running' : 'scheduled'}`}>
              {hasEnded ? 'Finished' : hasStarted ? 'In Progress' : 'Scheduled'}
            </span>
            <span className="remaining-time">{remainingLabel}</span>
          </div>
        </div>
      )}

      {/* Status / Remaining Time for non-active tasks */}
      {!activeTask && (
        <div className="task-progress-info" style={{ textAlign: 'center' }}>
          {userStats.hoursWorked > 0 && (
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>
              Weekly Progress: {userStats.hoursWorked}h / {userStats.weeklyGoal || 40}h
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileProgressCard;