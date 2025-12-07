import React from 'react';
import { useTaskTimer } from '../../contexts/TaskTimerContext';

// Circular progress for active task based purely on start/end times.
// Progress persists via TaskTimerContext restoration logic.
export default function ActiveTaskProgress() {
  const {
    activeTask,
    timerProgress,
    isTaskActive,
    elapsedMs,
    remainingMs,
    totalDurationMs,
    formatTime
  } = useTaskTimer();

  if (!activeTask) return null;

  const start = new Date(activeTask.startTime);
  const end = new Date(activeTask.endTime);
  const now = new Date();
  const hasStarted = now >= start;
  const hasEnded = now >= end;

  // SVG circle metrics
  const radius = 54; // visual radius
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(1, Math.max(0, timerProgress / 100));
  const dashOffset = circumference * (1 - progressRatio);

  const remainingLabel = hasEnded
    ? 'Completed'
    : hasStarted
      ? `${formatTime(remainingMs)} left`
      : `Starts in ${formatTime(start.getTime() - now.getTime())}`;

  return (
    <div className="active-task-progress-card">
      <div className="progress-header">
        <h4 className="progress-title">Current Task Progress</h4>
        <span className="task-type-chip">{activeTask.type}</span>
      </div>
      <div className="progress-body">
        <div className="progress-svg-wrapper">
          <svg
            className="progress-ring"
            width="140"
            height="140"
            viewBox="0 0 140 140"
          >
            <circle
              className="progress-ring-bg"
              cx="70"
              cy="70"
              r={radius}
              strokeWidth="10"
              fill="none"
            />
            <circle
              className="progress-ring-fg"
              cx="70"
              cy="70"
              r={radius}
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              className="progress-percent"
            >
              {Math.round(timerProgress)}%
            </text>
          </svg>
        </div>
        <div className="progress-meta">
          <div className="time-row">
            <span className="time-label">Start:</span>
            <span className="time-value">{start.toLocaleTimeString()}</span>
          </div>
          <div className="time-row">
            <span className="time-label">End:</span>
            <span className="time-value">{end.toLocaleTimeString()}</span>
          </div>
          <div className="time-row">
            <span className="time-label">Duration:</span>
            <span className="time-value">{formatTime(totalDurationMs)}</span>
          </div>
          {hasStarted && !hasEnded && (
            <div className="time-row in-progress">
              <span className="time-label">Elapsed:</span>
              <span className="time-value">{formatTime(elapsedMs)}</span>
            </div>
          )}
          <div className="status-row">
            <span className={`status-pill ${hasEnded ? 'completed' : hasStarted ? 'running' : 'scheduled'}`}>
              {hasEnded ? 'Finished' : hasStarted ? 'In Progress' : 'Scheduled'}
            </span>
            <span className="remaining-label">{remainingLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
